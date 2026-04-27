const mongoose = require('mongoose');
const Subject = require('./models/Subject');
const User = require('./models/User');
const Classroom = require('./models/Classroom');
const Department = require('./models/Department');
const Section = require('./models/Section');
const Timetable = require('./models/Timetable');

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

async function fillTimetable() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Update Semesters to Odd (1, 3, 5, 7)
        console.log('Updating sections to Odd semesters (1, 3, 5, 7)...');
        await Section.updateMany({ semester: 2 }, { $set: { semester: 3 } });
        await Section.updateMany({ semester: 3 }, { $set: { semester: 5 } });
        await Section.updateMany({ semester: 4 }, { $set: { semester: 7 } });
        // After those updates, if they were already 3, they might be 5 now. 
        // Let's do it more precisely based on names if possible, but the above is a quick fix.
        // Re-run carefully to ensure we have a spread.
        const allSections = await Section.find();
        for (const sec of allSections) {
            if (sec.name.startsWith('1')) sec.semester = 1;
            if (sec.name.startsWith('2')) sec.semester = 3;
            if (sec.name.startsWith('3')) sec.semester = 5;
            if (sec.name.startsWith('4')) sec.semester = 7;
            await sec.save();
        }

        const sections = await Section.find().populate('department_id');
        const subjects = await Subject.find();
        const faculty = await User.find({ role: 'Faculty' });
        const classrooms = await Classroom.find();

        if (sections.length === 0 || subjects.length === 0 || faculty.length === 0 || classrooms.length === 0) {
            console.error('Missing core data (sections, subjects, faculty, or classrooms)');
            process.exit(1);
        }

        console.log(`Processing ${sections.length} sections...`);

        // Clear existing timetable to avoid duplicates if preferred, or just add
        // console.log('Clearing existing timetable...');
        // await Timetable.deleteMany({});

        let entryCount = 0;
        let facultyIndex = 0;
        let classroomIndex = 0;

        for (const sec of sections) {
            const deptId = sec.department_id._id;
            const deptSubjects = subjects.filter(s => s.department_id.toString() === deptId.toString());
            const deptFaculty = faculty.filter(f => f.department && f.department.toString() === deptId.toString());
            
            const activeFaculty = deptFaculty.length > 0 ? deptFaculty : faculty; // Fallback to any faculty

            if (deptSubjects.length < 5) {
                console.warn(`Section ${sec.name} has only ${deptSubjects.length} subjects in its department. Using all available.`);
            }

            const subjectsToUse = deptSubjects.length > 0 ? deptSubjects : subjects.slice(0, 5);

            for (const day of days) {
                for (let i = 0; i < timeSlots.length; i++) {
                    const slot = timeSlots[i];
                    const subject = subjectsToUse[ (day.length + i) % subjectsToUse.length ];
                    const fac = activeFaculty[ facultyIndex % activeFaculty.length ];
                    const room = classrooms[ classroomIndex % classrooms.length ];

                    await Timetable.create({
                        section_id: sec._id,
                        subject_id: subject._id,
                        faculty_id: fac._id,
                        classroom_id: room._id,
                        day_of_week: day,
                        start_time: slot.start,
                        end_time: slot.end,
                        semester: sec.semester,
                        academic_year: "2023-2024",
                        status: 'Scheduled'
                    });

                    facultyIndex++;
                    classroomIndex++;
                    entryCount++;
                }
            }
            console.log(`Filled timetable for ${sec.name}`);
        }

        console.log(`Successfully created ${entryCount} timetable entries.`);
        process.exit();
    } catch (error) {
        console.error('Error filling timetable:', error);
        process.exit(1);
    }
}

fillTimetable();
