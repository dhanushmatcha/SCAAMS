const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const Section = require('./models/Section');
const Classroom = require('./models/Classroom');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    console.log('🔧 ADVANCED CONFLICT RESOLUTION\n');
    
    try {
      const classrooms = await Classroom.find().select('_id');
      const timeSlots = [
        '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'
      ];
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

      let resolvedCount = 0;

      // Find all remaining conflicts
      const faculties = await User.find({ role: 'Faculty' });

      for (const faculty of faculties) {
        const entries = await Timetable.find({ faculty_id: faculty._id })
          .populate('section_id', 'name')
          .sort({ day_of_week: 1, start_time: 1 });

        // Find conflicts
        const conflicts = [];
        for (let i = 0; i < entries.length; i++) {
          for (let j = i + 1; j < entries.length; j++) {
            if (entries[i].day_of_week === entries[j].day_of_week &&
                entries[i].start_time === entries[j].start_time) {
              conflicts.push({ idx1: i, idx2: j });
            }
          }
        }

        // Resolve conflicts
        for (const conflict of conflicts) {
          const entry = entries[conflict.idx2];
          let resolved = false;

          // Try to find empty slot for this entry
          for (const day of days) {
            for (const time of timeSlots) {
              const existing = await Timetable.findOne({
                faculty_id: faculty._id,
                day_of_week: day,
                start_time: time + ':00',
                _id: { $ne: entry._id }
              });

              if (!existing) {
                // Assign to this slot
                entry.day_of_week = day;
                entry.start_time = time + ':00';
                entry.end_time = (parseInt(time) + 1).toString().padStart(2, '0') + ':00';
                entry.classroom_id = classrooms[Math.floor(Math.random() * classrooms.length)]._id;
                await entry.save();
                resolvedCount++;
                resolved = true;
                break;
              }
            }
            if (resolved) break;
          }

          if (!resolved) {
            console.log(`⚠️  Could not resolve conflict for ${faculty.name} - ${entry.section_id?.name}`);
          }
        }
      }

      console.log(`✅ Resolved ${resolvedCount} conflicts\n`);

      // Final verification
      console.log('🔍 FINAL VERIFICATION\n');
      let remainingConflicts = 0;
      const conflictDetails = [];

      for (const faculty of faculties) {
        const entries = await Timetable.find({ faculty_id: faculty._id })
          .populate('section_id', 'name');

        for (let i = 0; i < entries.length; i++) {
          for (let j = i + 1; j < entries.length; j++) {
            if (entries[i].day_of_week === entries[j].day_of_week &&
                entries[i].start_time === entries[j].start_time) {
              remainingConflicts++;
              conflictDetails.push({
                faculty: faculty.name,
                day: entries[i].day_of_week,
                time: entries[i].start_time,
                sec1: entries[i].section_id?.name,
                sec2: entries[j].section_id?.name
              });
            }
          }
        }
      }

      if (remainingConflicts === 0) {
        console.log('✅ ALL CONFLICTS RESOLVED SUCCESSFULLY!\n');
      } else {
        console.log(`⚠️  ${remainingConflicts} conflicts remain:\n`);
        for (const detail of conflictDetails.slice(0, 5)) {
          console.log(`  ${detail.faculty}: ${detail.day} ${detail.time} → ${detail.sec1} & ${detail.sec2}`);
        }
        if (conflictDetails.length > 5) {
          console.log(`  ... and ${conflictDetails.length - 5} more\n`);
        }
      }

      // Summary
      let totalClasses = 0;
      let totalWithClasses = 0;

      for (const faculty of faculties) {
        const count = await Timetable.countDocuments({ faculty_id: faculty._id });
        if (count > 0) {
          totalClasses += count;
          totalWithClasses++;
        }
      }

      console.log('📊 FINAL SUMMARY\n');
      console.log(`Faculty with Classes: ${totalWithClasses}/107`);
      console.log(`Total Timetable Entries: ${totalClasses}`);
      console.log(`Average Classes/Faculty: ${(totalClasses / totalWithClasses).toFixed(2)}`);
      console.log(`Time Slot Conflicts: ${remainingConflicts}/607 (${((remainingConflicts/totalClasses)*100).toFixed(1)}%)\n`);

      console.log('✅ TIMETABLE OPTIMIZATION COMPLETE!');

    } catch (error) {
      console.error('❌ Error:', error.message);
    }

    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
