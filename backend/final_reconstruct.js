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

async function finalReconstruct() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('Wiping all academic data for fresh sync...');
        await Timetable.deleteMany({});
        await SectionAssignment.deleteMany({});

        const sections = await Section.find();
        const subjects = await Subject.find();
        const faculty = await User.find({ role: 'Faculty' });
        const classrooms = await Classroom.find();
        const departments = await Department.find();

        // 1. Group subjects by department and SEMESTER strictly
        const subjectPool = {}; // deptId -> { sem -> [subjects] }
        subjects.forEach(sub => {
            const deptId = sub.department_id.toString();
            
            // Extract semester from code (e.g., CSE705 -> 7, CSE501 -> 5)
            // We look for the first digit after the alpha prefix
            const match = sub.code.match(/\d/);
            const sem = match ? parseInt(match[0]) : 1;
            
            if (!subjectPool[deptId]) subjectPool[deptId] = {};
            if (!subjectPool[deptId][sem]) subjectPool[deptId][sem] = [];
            subjectPool[deptId][sem].push(sub);
        });

        console.log('Subject Pool categorized by strict semester digits.');

        let totalEntries = 0;
        let classroomIndex = 0;

        for (const dept of departments) {
            const deptId = dept._id.toString();
            const deptFaculty = faculty.filter(f => f.department && f.department.toString() === deptId);
            const deptSections = sections.filter(s => s.department_id.toString() === deptId);

            if (deptFaculty.length === 0 || deptSections.length === 0) continue;

            const facultyStats = {}; 
            deptFaculty.forEach(f => facultyStats[f._id.toString()] = { sectionCount: 0 });

            let facultyRoundRobinIndex = 0;

            for (const sec of deptSections) {
                const sem = sec.semester;
                const semSubjects = (subjectPool[deptId] && subjectPool[deptId][sem]) ? subjectPool[deptId][sem] : [];

                if (semSubjects.length === 0) {
                    console.log(`Warning: No subjects found for ${dept.code} Sem ${sem}. Check subject codes.`);
                    continue;
                }

                const secAssignments = [];

                for (const sub of semSubjects) {
                    // Find available faculty for this department
                    // Must not exceed 2 sections total
                    let chosenFac = null;
                    let attempts = 0;
                    
                    while (attempts < deptFaculty.length) {
                        const fac = deptFaculty[facultyRoundRobinIndex];
                        if (facultyStats[fac._id.toString()].sectionCount < 2) {
                            chosenFac = fac;
                            facultyRoundRobinIndex = (facultyRoundRobinIndex + 1) % deptFaculty.length;
                            break;
                        }
                        facultyRoundRobinIndex = (facultyRoundRobinIndex + 1) % deptFaculty.length;
                        attempts++;
                    }

                    // Fallback to least loaded if all at limit
                    if (!chosenFac) {
                        chosenFac = deptFaculty.sort((a,b) => facultyStats[a._id.toString()].sectionCount - facultyStats[b._id.toString()].sectionCount)[0];
                    }

                    const assignment = await SectionAssignment.create({
                        section_id: sec._id,
                        subject_id: sub._id,
                        faculty_id: chosenFac._id,
                        role: 'Teacher',
                        academic_year: '2024-2025'
                    });

                    secAssignments.push({
                        subject_id: sub._id,
                        faculty_id: chosenFac._id
                    });

                    facultyStats[chosenFac._id.toString()].sectionCount++;
                }

                // Create Timetable from THESE assignments only
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
                        totalEntries++;
                    }
                }
            }
        }

        // Final sync of faculty assignedSections array for UI consistency
        console.log('Syncing faculty assignedSections lists...');
        const allFaculty = await User.find({ role: 'Faculty' });
        for (const f of allFaculty) {
            const myAsgns = await SectionAssignment.find({ faculty_id: f._id });
            f.assignedSections = [...new Set(myAsgns.map(a => a.section_id.toString()))];
            await f.save();
        }

        console.log(`Final Reconstruction Complete. Total timetable slots: ${totalEntries}`);
        process.exit();
    } catch (error) {
        console.error('CRITICAL ERROR:', error);
        process.exit(1);
    }
}

finalReconstruct();
