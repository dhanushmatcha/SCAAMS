const mongoose = require('mongoose');
const Fee = require('./models/Fee');
const User = require('./models/User');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/scaams';

async function seedFees() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const students = await User.find({ role: 'Student' });
        
        if (students.length === 0) {
            console.log('No students found to seed fees.');
            process.exit();
        }

        console.log(`Seeding fees for ${students.length} students...`);

        for (const student of students) {
            // Delete existing fees for this student to avoid duplicates
            await Fee.deleteMany({ student_id: student._id });

            const total = 75000;
            const paid = Math.random() > 0.5 ? 75000 : (Math.random() > 0.5 ? 45000 : 0);
            
            const history = [];
            if (paid > 0) {
                history.push({
                    amount: paid,
                    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    method: 'Online',
                    transaction_id: 'TXN' + Math.random().toString(36).substring(7).toUpperCase(),
                    remarks: 'Semester Tuition Fee'
                });
            }

            await Fee.create({
                student_id: student._id,
                academic_year: '2024-2025',
                semester: student.section_id?.semester || 1,
                total_amount: total,
                paid_amount: paid,
                due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                status: paid >= total ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending'),
                payment_history: history
            });
        }

        console.log('Fee seeding COMPLETE.');
        process.exit();
    } catch (error) {
        console.error('Error seeding fees:', error);
        process.exit(1);
    }
}

seedFees();
