const mongoose = require('mongoose');
const Section = require('./models/Section');
const User = require('./models/User');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/scaams';

async function populateEmptySections() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const sections = await Section.find();
        const allStudents = await User.find({ role: 'Student' });

        console.log(`Total Sections: ${sections.length}`);
        console.log(`Total Students: ${allStudents.length}`);

        // 1. Identify empty sections
        const emptySections = sections.filter(s => s.students.length === 0);
        console.log(`Empty Sections: ${emptySections.length}`);

        if (emptySections.length === 0) {
            console.log('No empty sections found.');
            process.exit();
        }

        // 2. Identify students with no section
        // Note: Some students might be in the User.section_id but not in Section.students list
        // Let's first clear all students from all sections and redistribute to ensure balance
        console.log('Redistributing students to all sections for balance...');
        
        for (const sec of sections) {
            sec.students = [];
            await sec.save();
        }

        // Group students by department and semester
        // We'll assume a student's year/semester based on their ID or just distribute evenly
        const studentsByDept = {};
        allStudents.forEach(s => {
            const deptId = s.department?.toString() || 'unknown';
            if (!studentsByDept[deptId]) studentsByDept[deptId] = [];
            studentsByDept[deptId].push(s);
        });

        for (const deptId in studentsByDept) {
            if (deptId === 'unknown') continue;
            
            const deptStudents = studentsByDept[deptId];
            const deptSections = sections.filter(sec => sec.department_id.toString() === deptId);
            
            if (deptSections.length === 0) continue;

            // Distribute students of this department across its sections
            deptStudents.forEach((student, index) => {
                const targetSection = deptSections[index % deptSections.length];
                targetSection.students.push(student._id);
                
                // Also update the User record for bidirectional consistency
                student.section_id = targetSection._id;
            });
        }

        // Save all updated sections
        for (const sec of sections) {
            await sec.save();
        }

        // Save all updated students
        for (const stud of allStudents) {
            await stud.save();
        }

        console.log('Redistribution complete. All sections should now have students.');
        process.exit();
    } catch (error) {
        console.error('Error populating sections:', error);
        process.exit(1);
    }
}

populateEmptySections();
