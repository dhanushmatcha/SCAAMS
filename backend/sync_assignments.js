const mongoose = require('mongoose');
const Section = require('./models/Section');
const Subject = require('./models/Subject');
const User = require('./models/User');
const SectionAssignment = require('./models/SectionAssignment');
const Timetable = require('./models/Timetable');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/scaams';

async function syncAssignments() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // We'll sync assignments based on the Timetable
        // For every (section, subject, faculty) in Timetable, ensure a SectionAssignment exists
        const timetableEntries = await Timetable.find();
        console.log(`Analyzing ${timetableEntries.length} timetable entries...`);

        let newAssignments = 0;
        const seen = new Set();

        for (const entry of timetableEntries) {
            const key = `${entry.section_id}-${entry.subject_id}-${entry.faculty_id}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const existing = await SectionAssignment.findOne({
                section_id: entry.section_id,
                subject_id: entry.subject_id,
                faculty_id: entry.faculty_id
            });

            if (!existing) {
                await SectionAssignment.create({
                    section_id: entry.section_id,
                    subject_id: entry.subject_id,
                    faculty_id: entry.faculty_id,
                    role: 'Teacher',
                    academic_year: '2023-2024'
                });
                newAssignments++;
            }
        }

        console.log(`Created ${newAssignments} new section assignments based on timetable.`);
        process.exit();
    } catch (error) {
        console.error('Error syncing assignments:', error);
        process.exit(1);
    }
}

syncAssignments();
