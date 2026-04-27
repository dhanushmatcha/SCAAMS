const mongoose = require('mongoose');
const Timetable = require('./models/Timetable');
const Section = require('./models/Section');
const Subject = require('./models/Subject');
const User = require('./models/User');
const Classroom = require('./models/Classroom');
const Department = require('./models/Department');

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

        console.log('Clearing existing timetable...');
        await Timetable.deleteMany({});

        const sections = await Section.find().populate('department_id');
        const subjects = await Subject.find();
        const faculty = await User.find({ role: 'Faculty' });
        const classrooms = await Classroom.find();

        // 1. Group subjects by year (semester) and department
        const subjectGroups = {
            1: {}, 3: {}, 5: {}, 7: {}
        };

        subjects.forEach(sub => {
            let sem = 1;
            if (sub.code.includes('3')) sem = 3;
            else if (sub.code.includes('5')) sem = 5;
            else if (sub.code.includes('7')) sem = 7;
            else if (sub.code.includes('1')) sem = 1;
            
            const deptId = sub.department_id.toString();
            if (!subjectGroups[sem][deptId]) subjectGroups[sem][deptId] = [];
            subjectGroups[sem][deptId].push(sub);
        });

        // 2. Faculty Load Tracking
        // facultyLoads[facultyId] = { subjectIds: Set, sectionCount: 0 }
        const facultyLoads = {};
        faculty.forEach(f => {
            facultyLoads[f._id.toString()] = { subjectIds: new Set(), sectionCount: 0 };
        });

        let entryCount = 0;
        let classroomIndex = 0;

        // 3. Reconstruct
        const semesters = [1, 3, 5, 7];
        const departments = await Department.find();

        for (const dept of departments) {
            const deptId = dept._id.toString();
            const deptFaculty = faculty.filter(f => f.department && f.department.toString() === deptId);
            
            if (deptFaculty.length === 0) {
                console.warn(`No faculty found for department ${dept.code}. Using fallback.`);
            }

            for (const sem of semesters) {
                const semSections = sections.filter(s => s.department_id._id.toString() === deptId && s.semester === sem);
                const semSubjects = subjectGroups[sem][deptId] || [];

                if (semSections.length === 0 || semSubjects.length === 0) continue;

                // Assign a faculty to each subject for these sections
                const assignmentMap = {}; // subjectId -> facultyId

                semSubjects.forEach(sub => {
                    // Find a faculty who hasn't exceeded 3 sections and ideally teaches only this subject
                    let chosenFaculty = null;
                    
                    // Priority 1: Faculty already teaching this subject and under 3 sections
                    chosenFaculty = deptFaculty.find(f => {
                        const load = facultyLoads[f._id.toString()];
                        return load.subjectIds.has(sub._id.toString()) && load.sectionCount + semSections.length <= 3;
                    });

                    // Priority 2: Faculty teaching 0 subjects and has capacity
                    if (!chosenFaculty) {
                        chosenFaculty = deptFaculty.find(f => {
                            const load = facultyLoads[f._id.toString()];
                            return load.subjectIds.size === 0 && load.sectionCount + semSections.length <= 3;
                        });
                    }

                    // Priority 3: Least loaded faculty (count-wise) regardless of subject count (up to 2 subjects)
                    if (!chosenFaculty) {
                        const sortedByLoad = [...deptFaculty].sort((a, b) => 
                            facultyLoads[a._id.toString()].sectionCount - facultyLoads[b._id.toString()].sectionCount
                        );
                        chosenFaculty = sortedByLoad.find(f => {
                            const load = facultyLoads[f._id.toString()];
                            return load.subjectIds.size < 2 && load.sectionCount + semSections.length <= 6; // Relaxed a bit for fallback
                        });
                    }

                    // Fallback to any faculty if still null
                    if (!chosenFaculty) chosenFaculty = deptFaculty[0] || faculty[0];

                    assignmentMap[sub._id.toString()] = chosenFaculty._id;
                    
                    // Update global load
                    const load = facultyLoads[chosenFaculty._id.toString()];
                    load.subjectIds.add(sub._id.toString());
                    load.sectionCount += semSections.length;
                });

                // Generate entries for these sections
                for (const sec of semSections) {
                    for (const day of days) {
                        for (let i = 0; i < timeSlots.length; i++) {
                            const slot = timeSlots[i];
                            const subject = semSubjects[ (day.length + i) % semSubjects.length ];
                            const facId = assignmentMap[subject._id.toString()];
                            const room = classrooms[ classroomIndex % classrooms.length ];

                            await Timetable.create({
                                section_id: sec._id,
                                subject_id: subject._id,
                                faculty_id: facId,
                                classroom_id: room._id,
                                day_of_week: day,
                                start_time: slot.start,
                                end_time: slot.end,
                                semester: sec.semester,
                                academic_year: "2023-2024",
                                status: 'Scheduled'
                            });

                            classroomIndex++;
                            entryCount++;
                        }
                    }
                }
            }
        }

        console.log(`Successfully reconstructed timetable with ${entryCount} entries.`);
        process.exit();
    } catch (error) {
        console.error('Error reconstructing:', error);
        process.exit(1);
    }
}

reconstruct();
