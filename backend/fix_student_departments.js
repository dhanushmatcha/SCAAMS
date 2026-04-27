const mongoose = require('mongoose');
const User = require('./models/User');
const Section = require('./models/Section');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/scaams';

async function fixStudentDepartments() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('Fetching all sections...');
        const sections = await Section.find();
        
        let totalFixed = 0;

        for (const section of sections) {
            if (!section.department_id) continue;

            // Method 1: Update students listed in the section's students array
            if (section.students && section.students.length > 0) {
                const result = await User.updateMany(
                    { _id: { $in: section.students } },
                    { $set: { department: section.department_id, section_id: section._id } }
                );
                totalFixed += result.modifiedCount;
            }

            // Method 2: Update students who have this section_id set but are missing department
            const result2 = await User.updateMany(
                { section_id: section._id, department: { $exists: false } },
                { $set: { department: section.department_id } }
            );
            const result3 = await User.updateMany(
                { section_id: section._id, department: null },
                { $set: { department: section.department_id } }
            );
            
            totalFixed += result2.modifiedCount + result3.modifiedCount;
        }

        console.log(`Sync complete. Total students updated/verified: ${totalFixed}`);

        // Double check for any remaining students without department
        const remaining = await User.countDocuments({ role: 'Student', department: null });
        if (remaining > 0) {
            console.log(`Warning: ${remaining} students still have no department assigned.`);
        } else {
            console.log('All students now have a department assigned.');
        }

        process.exit();
    } catch (error) {
        console.error('Error fixing student departments:', error);
        process.exit(1);
    }
}

fixStudentDepartments();
