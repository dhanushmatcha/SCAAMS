const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const Section = require('./models/Section');
const Subject = require('./models/Subject');
const Classroom = require('./models/Classroom');
const Department = require('./models/Department');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    console.log('🔧 FIXING TIME SLOT CONFLICTS\n');
    
    try {
      // Available time slots
      const timeSlots = [
        '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'
      ];
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const classrooms = await Classroom.find().select('_id');

      let fixedCount = 0;
      let conflictCount = 0;
      const conflicts = [];

      // Get all faculties
      const faculties = await User.find({ role: 'Faculty' });

      for (const faculty of faculties) {
        const timetables = await Timetable.find({ faculty_id: faculty._id })
          .populate('section_id', 'name')
          .sort({ day_of_week: 1, start_time: 1 });

        if (timetables.length === 0) continue;

        // Find conflicts for this faculty
        for (let i = 0; i < timetables.length; i++) {
          for (let j = i + 1; j < timetables.length; j++) {
            const entry1 = timetables[i];
            const entry2 = timetables[j];

            // Same day and time = conflict
            if (entry1.day_of_week === entry2.day_of_week &&
                entry1.start_time === entry2.start_time) {
              conflictCount++;
              conflicts.push({
                faculty: faculty._id,
                facultyName: faculty.name,
                entry1Id: entry1._id,
                entry2Id: entry2._id,
                entry1Day: entry1.day_of_week,
                entry1Time: entry1.start_time,
                entry1Section: entry1.section_id?.name,
                entry2Section: entry2.section_id?.name
              });
            }
          }
        }
      }

      console.log(`Found ${conflictCount} conflicts\n`);

      // Fix conflicts by moving second entry to different day/time
      for (const conflict of conflicts) {
        const entry2 = await Timetable.findById(conflict.entry2Id);
        if (!entry2) continue;

        // Find an available day/time for this class
        let found = false;
        for (const day of days) {
          for (const time of timeSlots) {
            // Check if this faculty already has class at this time
            const existing = await Timetable.findOne({
              faculty_id: conflict.faculty,
              day_of_week: day,
              start_time: time,
              _id: { $ne: entry2._id }
            });

            if (!existing) {
              // Found available slot
              const endTime = (parseInt(time) + 1).toString().padStart(2, '0') + ':00';
              
              // Update the entry
              entry2.day_of_week = day;
              entry2.start_time = time + ':00';
              entry2.end_time = endTime;
              entry2.classroom_id = classrooms[Math.floor(Math.random() * classrooms.length)]._id;
              
              await entry2.save();
              fixedCount++;
              found = true;
              break;
            }
          }
          if (found) break;
        }

        if (!found) {
          console.log(`⚠️  Could not find slot for ${conflict.facultyName} - ${conflict.entry2Section}`);
        }
      }

      console.log(`✅ Fixed ${fixedCount} conflicts\n`);

      // Verify fixes
      console.log('🔍 VERIFYING FIXES\n');
      let remainingConflicts = 0;
      
      for (const faculty of faculties) {
        const timetables = await Timetable.find({ faculty_id: faculty._id });
        
        for (let i = 0; i < timetables.length; i++) {
          for (let j = i + 1; j < timetables.length; j++) {
            const e1 = timetables[i];
            const e2 = timetables[j];
            
            if (e1.day_of_week === e2.day_of_week && 
                e1.start_time === e2.start_time) {
              remainingConflicts++;
            }
          }
        }
      }

      if (remainingConflicts === 0) {
        console.log('✅ ALL CONFLICTS RESOLVED!\n');
      } else {
        console.log(`⚠️  ${remainingConflicts} conflicts remain\n`);
      }

      // Summary stats
      let totalClasses = 0;
      let totalFaculty = 0;

      for (const faculty of faculties) {
        const count = await Timetable.countDocuments({ faculty_id: faculty._id });
        if (count > 0) {
          totalClasses += count;
          totalFaculty++;
        }
      }

      console.log('📊 SUMMARY\n');
      console.log(`Total Faculty with Classes: ${totalFaculty}`);
      console.log(`Total Timetable Entries: ${totalClasses}`);
      console.log(`Average Classes per Faculty: ${(totalClasses / totalFaculty).toFixed(2)}\n`);

      console.log('✅ TIMETABLE CONFLICT RESOLUTION COMPLETE!');

    } catch (error) {
      console.error('❌ Error:', error.message);
      console.error(error);
    }

    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
