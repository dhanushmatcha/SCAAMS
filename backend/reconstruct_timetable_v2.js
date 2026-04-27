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

async function reconstruct() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('Clearing existing timetable and assignments...');
        await Timetable.deleteMany({});
        await SectionAssignment.deleteMany({});

        const sections = await Section.find();
        const subjects = await Subject.find();
        const faculty = await User.find({ role: 'Faculty' });
        const classrooms = await Classroom.find();
        const departments = await Department.find();

        // 1. Map subjects to semesters/departments
        const subjectPool = {}; // deptId -> { sem -> [subjects] }
        subjects.forEach(sub => {
            const deptId = sub.department_id.toString();
            let sem = 1;
            if (sub.code.includes('3')) sem = 3;
            else if (sub.code.includes('5')) sem = 5;
            else if (sub.code.includes('7')) sem = 7;
            
            if (!subjectPool[deptId]) subjectPool[deptId] = { 1: [], 3: [], 5: [], 7: [] };
            subjectPool[deptId][sem].push(sub);
        });

        // 2. Process each department
        let totalEntries = 0;
        let classroomIndex = 0;

        for (const dept of departments) {
            const deptId = dept._id.toString();
            const deptFaculty = faculty.filter(f => f.department && f.department.toString() === deptId);
            const deptSections = sections.filter(s => s.department_id.toString() === deptId);

            if (deptFaculty.length === 0 || deptSections.length === 0) continue;

            console.log(`Processing ${dept.code}: ${deptSections.length} sections, ${deptFaculty.length} faculty.`);

            // Assignment State: Map (Section, Subject) -> Faculty
            const assignments = []; // Array of { sectionId, subjectId, facultyId }
            
            // Faculty Tracking: facultyId -> { currentSectionCount: Number }
            const facultyStats = {};
            deptFaculty.forEach(f => facultyStats[f._id.toString()] = { sectionCount: 0 });

            // Strategy: For each semester group, assign subjects to faculty
            const sems = [1, 3, 5, 7];
            for (const sem of sems) {
                const semSections = deptSections.filter(s => s.semester === sem);
                const semSubjects = (subjectPool[deptId] && subjectPool[deptId][sem]) ? subjectPool[deptId][sem] : [];

                if (semSections.length === 0 || semSubjects.length === 0) continue;

                // For each subject in this semester
                semSubjects.forEach((sub, subIdx) => {
                    // Assign this subject to a faculty for a group of sections (max 3)
                    let sectionsHandled = 0;
                    
                    // We need a faculty for this subject
                    // Round-robin through faculty
                    while (sectionsHandled < semSections.length) {
                        const fac = deptFaculty[ (subIdx + Math.floor(sectionsHandled/3)) % deptFaculty.length ];
                        const targetSections = semSections.slice(sectionsHandled, sectionsHandled + 3);
                        
                        targetSections.forEach(sec => {
                            assignments.push({
                                sectionId: sec._id,
                                subjectId: sub._id,
                                facultyId: fac._id
                            });
                        });
                        
                        sectionsHandled += 3;
                    }
                });
            }

            // 3. Create SectionAssignment records (needed for Marks tab)
            for (const asgn of assignments) {
                await SectionAssignment.create({
                    section_id: asgn.sectionId,
                    subject_id: asgn.subjectId,
                    faculty_id: asgn.facultyId,
                    role: 'Teacher',
                    academic_year: '2023-2024'
                });
            }

            // 4. Populate Timetable for these sections
            for (const sec of deptSections) {
                const secAssignments = assignments.filter(a => a.sectionId.toString() === sec._id.toString());
                if (secAssignments.length === 0) continue;

                for (const day of days) {
                    for (let i = 0; i < timeSlots.length; i++) {
                        const slot = timeSlots[i];
                        // Pick a subject from the assignments for this section
                        const asgn = secAssignments[ (days.indexOf(day) + i) % secAssignments.length ];
                        const room = classrooms[ classroomIndex % classrooms.length ];

                        await Timetable.create({
                            section_id: sec._id,
                            subject_id: asgn.subjectId,
                            faculty_id: asgn.facultyId,
                            classroom_id: room._id,
                            day_of_week: day,
                            start_time: slot.start,
                            end_time: slot.end,
                            semester: sec.semester,
                            academic_year: "2023-2024",
                            status: 'Scheduled'
                        });

                        classroomIndex++;
                        totalEntries++;
                    }
                }
            }
        }

        // 5. Final sync of assignedSections for all faculty
        const allFaculty = await User.find({ role: 'Faculty' });
        for (const f of allFaculty) {
            const facultyAsgns = await SectionAssignment.find({ faculty_id: f._id });
            f.assignedSections = [...new Set(facultyAsgns.map(a => a.section_id))];
            await f.save();
        }

        console.log(`Reconstruction complete. Total entries: ${totalEntries}`);
        process.exit();
    } catch (error) {
        console.error('Error during reconstruction:', error);
        process.exit(1);
    }
}

reconstruct();
