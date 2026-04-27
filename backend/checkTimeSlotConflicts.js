const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const Section = require('./models/Section');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    console.log('🔍 CHECKING FOR TIME SLOT CONFLICTS\n');
    
    try {
      const faculties = await User.find({ role: 'Faculty' });
      
      let conflictCount = 0;
      const conflictDetails = [];

      for (const faculty of faculties) {
        const timetables = await Timetable.find({ faculty_id: faculty._id })
          .populate('section_id', 'name')
          .sort({ day_of_week: 1, start_time: 1 });

        if (timetables.length === 0) continue;

        // Check for overlapping time slots on the same day
        for (let i = 0; i < timetables.length; i++) {
          for (let j = i + 1; j < timetables.length; j++) {
            const entry1 = timetables[i];
            const entry2 = timetables[j];

            // Same day and same time slot
            if (entry1.day_of_week === entry2.day_of_week &&
                entry1.start_time === entry2.start_time &&
                entry1.end_time === entry2.end_time) {
              conflictCount++;
              conflictDetails.push({
                faculty: faculty.name,
                day: entry1.day_of_week,
                time: `${entry1.start_time}-${entry1.end_time}`,
                section1: entry1.section_id?.name,
                section2: entry2.section_id?.name
              });
            }
          }
        }
      }

      if (conflictCount === 0) {
        console.log('✅ NO TIME SLOT CONFLICTS FOUND\n');
      } else {
        console.log(`⚠️  FOUND ${conflictCount} TIME SLOT CONFLICTS\n`);
        console.log('Faculty Name               | Day       | Time         | Section 1 | Section 2');
        console.log('─'.repeat(100));

        for (const conflict of conflictDetails.slice(0, 20)) {
          const faculty = conflict.faculty.padEnd(28);
          const day = conflict.day.padEnd(9);
          const time = conflict.time.padEnd(12);
          const sec1 = conflict.section1.padEnd(9);
          const sec2 = conflict.section2;

          console.log(`${faculty} | ${day} | ${time} | ${sec1} | ${sec2}`);
        }

        if (conflictDetails.length > 20) {
          console.log(`\n... and ${conflictDetails.length - 20} more conflicts`);
        }

        console.log('\n\n❌ IMPACT ON FRONTEND: When displaying timetable grid, overlapping time slots');
        console.log('   will cause one class to be hidden because the grid cell gets overwritten!\n');
        console.log('   Example:');
        console.log('   - Monday 09:00-09:50 has 2 classes (Section A and B)');
        console.log('   - Frontend shows only 1 class (the last one overwrites the first)');
        console.log('   - User sees 3-5 classes instead of 8 classes\n');
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
    }

    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
