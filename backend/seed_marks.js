const mongoose = require('mongoose');
const ExamMark = require('./models/ExamMark');
const User = require('./models/User');
const Subject = require('./models/Subject');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/scaams';

async function seedMarks() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const students = await User.find({ role: 'Student' });
        const subjects = await Subject.find();
        const faculty = await User.findOne({ role: 'Faculty' });
        
        if (students.length === 0 || subjects.length === 0 || !faculty) {
            console.log('Missing data to seed marks.');
            process.exit();
        }

        console.log(`Seeding marks for ${students.length} students...`);

        for (const student of students) {
            await ExamMark.deleteMany({ student_id: student._id });

            const numSubjects = 4;
            const randomSubjects = subjects.sort(() => 0.5 - Math.random()).slice(0, numSubjects);

            for (const subject of randomSubjects) {
                const max = 100;
                const obtained = Math.floor(Math.random() * 50) + 45; // 45-95

                await ExamMark.create({
                    section_id: student.section_id,
                    subject_id: subject._id,
                    faculty_id: faculty._id,
                    student_id: student._id,
                    exam_type: 'T3', // Use valid enum value
                    marks_obtained: obtained,
                    total_marks: max,
                    breakdown_marks: {
                        "Part A": Math.floor(obtained * 0.4),
                        "Part B": Math.floor(obtained * 0.6)
                    },
                    recorded_at: new Date()
                });
            }
        }

        console.log('Marks seeding COMPLETE.');
        process.exit();
    } catch (error) {
        console.error('Error seeding marks:', error);
        process.exit(1);
    }
}

seedMarks();
