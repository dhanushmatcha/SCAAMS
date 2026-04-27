const mongoose = require('mongoose');
const Section = require('./models/Section');
const User = require('./models/User');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/scaams';

async function fixData() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Fix Students count showing 0
        // Ensure every student has a section and every section has its students array filled
        const allStudents = await User.find({ role: 'Student' });
        const allSections = await Section.find();

        console.log(`Fixing student-section relationships for ${allStudents.length} students...`);

        // Clear section students first
        for (const sec of allSections) {
            sec.students = [];
        }

        for (const student of allStudents) {
            if (student.section_id) {
                const section = allSections.find(s => s._id.toString() === student.section_id.toString());
                if (section) {
                    section.students.push(student._id);
                }
            } else {
                // If student has no section, assign to a random section of their department
                const deptSections = allSections.filter(s => s.department_id?.toString() === student.department?.toString());
                if (deptSections.length > 0) {
                    const target = deptSections[Math.floor(Math.random() * deptSections.length)];
                    student.section_id = target._id;
                    target.students.push(student._id);
                    await student.save();
                }
            }
        }

        for (const sec of allSections) {
            await sec.save();
        }

        // 2. Fix Faculty "My Assigned Sections"
        // Ensure every faculty has their assignedSections array updated based on the Timetable
        const allFaculty = await User.find({ role: 'Faculty' });
        const Timetable = require('./models/Timetable');

        for (const faculty of allFaculty) {
            const facultyTimetable = await Timetable.find({ faculty_id: faculty._id });
            const sectionIds = [...new Set(facultyTimetable.map(t => t.section_id.toString()))];
            
            faculty.assignedSections = sectionIds;
            await faculty.save();
            console.log(`Updated faculty ${faculty.name} with ${sectionIds.length} sections.`);
        }

        console.log('Data synchronization complete.');
        process.exit();
    } catch (error) {
        console.error('Error fixing data:', error);
        process.exit(1);
    }
}

fixData();
