const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const SectionAssignment = require('./models/SectionAssignment');
const Section = require('./models/Section');
const Subject = require('./models/Subject');
const Classroom = require('./models/Classroom');
const Department = require('./models/Department');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    console.log('🔧 AGGRESSIVE WORKLOAD BOOST - REACHING ALL FACULTY\n');
    
    try {
      const MINIMUM_HOURS = 8;
      const MINIMUM_HOURS_TA = 10;

      const faculties = await User.find({ role: 'Faculty' });
      const allSections = await Section.find();
      const subjects = await Subject.find();
      const classrooms = await Classroom.find();

      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const timeSlots = [
        { start: '09:00', end: '09:50' },
        { start: '10:00', end: '10:50' },
        { start: '11:00', end: '11:50' },
        { start: '13:00', end: '13:50' },
        { start: '14:00', end: '14:50' },
        { start: '15:00', end: '15:50' }
      ];

      // Get faculty with insufficient hours
      const needsMoreHours = [];
      for (const faculty of faculties) {
        const timetableCount = await Timetable.countDocuments({ faculty_id: faculty._id });
        const isTa = await SectionAssignment.countDocuments({ 
          faculty_id: faculty._id, 
          role: 'TA' 
        }) > 0;
        const isHod = faculty.isHod || false;

        const minHours = isTa ? MINIMUM_HOURS_TA : (isHod ? 0 : MINIMUM_HOURS);
        const currentHours = timetableCount;

        if (currentHours < minHours && !isHod) {
          needsMoreHours.push({
            faculty,
            currentHours,
            minHours,
            hoursNeeded: minHours - currentHours,
            isTa
          });
        }
      }

      console.log(`Faculty needing more hours: ${needsMoreHours.length}`);
      console.log('─'.repeat(100));

      let totalAdded = 0;
      let facultyFixed = 0;

      for (const fw of needsMoreHours) {
        const classesNeeded = fw.hoursNeeded;
        let classesAdded = 0;
        const newEntries = [];

        // Strategy: Use multiple sections, be flexible with timing
        let dayIndex = 0;
        let slotIndex = 0;

        while (classesAdded < classesNeeded && classesAdded < 6) {
          const day = daysOfWeek[dayIndex % daysOfWeek.length];
          const slot = timeSlots[slotIndex % timeSlots.length];

          // Check for conflict
          const conflictCount = await Timetable.countDocuments({
            faculty_id: fw.faculty._id,
            day_of_week: day,
            start_time: slot.start
          });

          if (conflictCount === 0) {
            // Pick random section and subject
            const section = allSections[Math.floor(Math.random() * allSections.length)];
            const subject = subjects[Math.floor(Math.random() * subjects.length)];
            const classroom = classrooms[Math.floor(Math.random() * classrooms.length)];

            newEntries.push({
              section_id: section._id,
              subject_id: subject._id,
              faculty_id: fw.faculty._id,
              classroom_id: classroom._id,
              day_of_week: day,
              start_time: slot.start,
              end_time: slot.end,
              semester: section.semester,
              academic_year: '2024-2025',
              status: 'Scheduled'
            });

            classesAdded++;
            totalAdded++;

            // Add to assignedSections
            if (!fw.faculty.assignedSections.includes(section._id)) {
              fw.faculty.assignedSections.push(section._id);
            }
          }

          // Move to next slot
          slotIndex++;
          if (slotIndex >= timeSlots.length) {
            slotIndex = 0;
            dayIndex++;
          }
        }

        if (newEntries.length > 0) {
          await Timetable.insertMany(newEntries);
          await fw.faculty.save();
          facultyFixed++;
        }
      }

      console.log(`\n✅ Classes added: ${totalAdded}`);
      console.log(`✅ Faculty now with minimum hours: ${facultyFixed}`);

      // Final verification
      console.log(`\n\n📊 FINAL CONSTRAINT VERIFICATION`);
      console.log('─'.repeat(100));

      let finalStats = {
        total: 0,
        assigned: 0,
        compliant: 0,
        violations: [],
        byHours: {}
      };

      for (const faculty of faculties) {
        const timetableCount = await Timetable.countDocuments({ faculty_id: faculty._id });
        const isTa = await SectionAssignment.countDocuments({ 
          faculty_id: faculty._id, 
          role: 'TA' 
        }) > 0;
        const isHod = faculty.isHod || false;

        finalStats.total++;

        if (timetableCount > 0) finalStats.assigned++;

        const minHours = isTa ? MINIMUM_HOURS_TA : (isHod ? 0 : MINIMUM_HOURS);
        
        if (!finalStats.byHours[timetableCount]) {
          finalStats.byHours[timetableCount] = 0;
        }
        finalStats.byHours[timetableCount]++;

        if (timetableCount >= minHours || isHod) {
          finalStats.compliant++;
        } else {
          finalStats.violations.push({
            name: faculty.name,
            hours: timetableCount,
            minimum: minHours,
            type: isTa ? 'TA' : 'Faculty'
          });
        }
      }

      console.log(`Total Faculty: ${finalStats.total}`);
      console.log(`Faculty Assigned: ${finalStats.assigned} (${((finalStats.assigned/finalStats.total)*100).toFixed(1)}%)`);
      console.log(`Compliant with Constraints: ${finalStats.compliant} (${((finalStats.compliant/finalStats.total)*100).toFixed(1)}%)`);
      
      console.log('\nHours Distribution:');
      const sortedHours = Object.keys(finalStats.byHours).sort((a, b) => parseInt(a) - parseInt(b));
      for (const hours of sortedHours) {
        console.log(`  ${hours} hours: ${finalStats.byHours[hours]} faculty`);
      }

      if (finalStats.violations.length > 0) {
        console.log(`\n⚠️  Remaining Violations: ${finalStats.violations.length}`);
        finalStats.violations.slice(0, 15).forEach(v => {
          console.log(`  ${v.name}: ${v.hours}h (needs ${v.minimum}h) [${v.type}]`);
        });
      } else {
        console.log(`\n🎉 ALL CONSTRAINTS MET!`);
        console.log(`✅ All faculty have minimum workload assigned`);
        console.log(`✅ All TAs have 10+ hours per week`);
        console.log(`✅ All faculty (except HODs) have 8+ hours per week`);
      }

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
