const mongoose = require('mongoose');
const Timetable = require('./models/Timetable');
const Section = require('./models/Section');
const Subject = require('./models/Subject');
const User = require('./models/User');
const Classroom = require('./models/Classroom');
const Department = require('./models/Department');
const SectionAssignment = require('./models/SectionAssignment');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/scaams';

const timeSlots = [
    { start: "09:00", end: "09:50" },
    { start: "10:00", end: "10:50" },
    { start: "11:10", end: "12:00" },
    { start: "12:10", end: "13:00" },
    { start: "14:00", end: "14:50" },
    { start: "15:00", end: "15:50" }
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

async function balancedReconstruct() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('Wiping all academic data for balanced sync...');
        await Timetable.deleteMany({});
        await SectionAssignment.deleteMany({});

        const sections = await Section.find();
        const subjects = await Subject.find();
        const faculty = await User.find({ role: 'Faculty' });
        const classrooms = await Classroom.find();
        const departments = await Department.find();

        const subjectPool = {}; 
        subjects.forEach(sub => {
            const deptId = sub.department_id.toString();
            const match = sub.code.match(/\d/);
            const sem = match ? parseInt(match[0]) : 1;
            if (!subjectPool[deptId]) subjectPool[deptId] = {};
            if (!subjectPool[deptId][sem]) subjectPool[deptId][sem] = [];
            subjectPool[deptId][sem].push(sub);
        });

        const facultyStats = {}; 
        faculty.forEach(f => facultyStats[f._id.toString()] = { sectionCount: 0 });

        let classroomIndex = 0;

        // 1. PHASE 1: Assign Primary Teachers
        console.log('Phase 1: Assigning Primary Teachers...');
        for (const dept of departments) {
            const deptId = dept._id.toString();
            const deptFaculty = faculty.filter(f => f.department && f.department.toString() === deptId);
            const deptSections = sections.filter(s => s.department_id.toString() === deptId);
            if (deptFaculty.length === 0 || deptSections.length === 0) continue;

            let facultyRRIndex = 0;
            for (const sec of deptSections) {
                const sem = sec.semester;
                const semSubjects = (subjectPool[deptId] && subjectPool[deptId][sem]) ? subjectPool[deptId][sem] : [];
                const secAssignments = [];

                for (const sub of semSubjects) {
                    let chosenFac = null;
                    let attempts = 0;
                    while (attempts < deptFaculty.length) {
                        const fac = deptFaculty[facultyRRIndex];
                        if (facultyStats[fac._id.toString()].sectionCount < 2) {
                            chosenFac = fac;
                            facultyRRIndex = (facultyRRIndex + 1) % deptFaculty.length;
                            break;
                        }
                        facultyRRIndex = (facultyRRIndex + 1) % deptFaculty.length;
                        attempts++;
                    }
                    if (!chosenFac) chosenFac = deptFaculty.sort((a,b) => facultyStats[a._id.toString()].sectionCount - facultyStats[b._id.toString()].sectionCount)[0];

                    await SectionAssignment.create({
                        section_id: sec._id,
                        subject_id: sub._id,
                        faculty_id: chosenFac._id,
                        role: 'Teacher',
                        academic_year: '2024-2025'
                    });
                    secAssignments.push({ subject_id: sub._id, faculty_id: chosenFac._id });
                    facultyStats[chosenFac._id.toString()].sectionCount++;
                }

                // Create Timetable ONLY if we have subjects
                if (secAssignments.length > 0) {
                    for (const day of days) {
                        for (let i = 0; i < timeSlots.length; i++) {
                            const slot = timeSlots[i];
                            const asgn = secAssignments[ (days.indexOf(day) + i) % secAssignments.length ];
                            const room = classrooms[ classroomIndex % classrooms.length ];
                            await Timetable.create({
                                section_id: sec._id,
                                subject_id: asgn.subject_id,
                                faculty_id: asgn.faculty_id,
                                classroom_id: room._id,
                                day_of_week: day,
                                start_time: slot.start,
                                end_time: slot.end,
                                semester: sec.semester,
                                academic_year: "2024-2025",
                                status: 'Scheduled'
                            });
                            classroomIndex++;
                        }
                    }
                } else {
                    console.log(`Skipping timetable for ${sec.name} - No subjects available for Sem ${sem}`);
                }
            }
        }

        // 2. PHASE 2: Equalize Workload
        console.log('Phase 2: Equalizing workloads (Target: Exactly 2 sections per faculty)...');
        for (const dept of departments) {
            const deptId = dept._id.toString();
            const deptFaculty = faculty.filter(f => f.department && f.department.toString() === deptId);
            const deptSections = sections.filter(s => s.department_id.toString() === deptId);
            if (deptSections.length === 0) continue;

            const underLoaded = deptFaculty.filter(f => facultyStats[f._id.toString()].sectionCount < 2);
            
            for (const fac of underLoaded) {
                while (facultyStats[fac._id.toString()].sectionCount < 2) {
                    const existingAsgns = await SectionAssignment.find({ faculty_id: fac._id });
                    const existingSecIds = existingAsgns.map(a => a.section_id.toString());
                    const availableSection = deptSections.find(s => !existingSecIds.includes(s._id.toString()));
                    
                    if (availableSection) {
                        const primaryAsgn = await SectionAssignment.findOne({ section_id: availableSection._id, role: 'Teacher' });
                        if (primaryAsgn) {
                            await SectionAssignment.create({
                                section_id: availableSection._id,
                                subject_id: primaryAsgn.subject_id,
                                faculty_id: fac._id,
                                role: 'Assistant Teacher',
                                academic_year: '2024-2025'
                            });
                            facultyStats[fac._id.toString()].sectionCount++;
                            console.log(`Equalizer: Assigned ${fac.name} as Assistant for ${availableSection.name}`);
                        } else {
                            break; 
                        }
                    } else {
                        break; 
                    }
                }
            }
        }

        // 3. Final sync
        console.log('Final Sync: Updating User assignedSections metadata...');
        const allFaculty = await User.find({ role: 'Faculty' });
        for (const f of allFaculty) {
            const myAsgns = await SectionAssignment.find({ faculty_id: f._id });
            f.assignedSections = [...new Set(myAsgns.map(a => a.section_id.toString()))];
            await f.save();
        }

        console.log('Balanced Reconstruction COMPLETE.');
        process.exit();
    } catch (error) {
        console.error('FATAL RECONSTRUCTION ERROR:', error);
        process.exit(1);
    }
}

balancedReconstruct();
