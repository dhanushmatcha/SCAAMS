const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const Subject = require('./models/Subject');
const Section = require('./models/Section');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB');
    console.log('\n🔧 FINAL LAB HOURS OPTIMIZATION - MAX 2 HOURS PER FACULTY...\n');
    
    try {
      const faculties = await User.find({ role: 'Faculty' });
      let deletedCount = 0;
      const deletedLabs = [];

      for (const faculty of faculties) {
        // Get all labs taught by this faculty as lab_faculty_id
        const allLabs = await Timetable.find({
          lab_faculty_id: faculty._id,
          is_lab_class: true
        }).populate('subject_id').populate('section_id').sort({ createdAt: 1 });

        // Keep only the first lab (2 hours max per week)
        if (allLabs.length > 1) {
          console.log(`\n${faculty.name}: Has ${allLabs.length} lab entries`);
          console.log(`  Keeping: ${allLabs[0].subject_id.name} in ${allLabs[0].section_id.name}`);

          // Delete all but the first
          for (let i = 1; i < allLabs.length; i++) {
            const lab = allLabs[i];
            await Timetable.findByIdAndDelete(lab._id);
            deletedCount++;
            console.log(`  ✓ Deleted: ${lab.subject_id.name} in ${lab.section_id.name}`);

            deletedLabs.push({
              faculty: faculty.name,
              subject: lab.subject_id.name,
              section: lab.section_id.name
            });
          }
        }
      }

      console.log('\n\nDELETION SUMMARY:');
      console.log('─'.repeat(100));
      console.log(`Labs deleted: ${deletedCount}\n`);

      if (deletedLabs.length > 0) {
        console.log('DELETED LABS (first 15):');
        console.log('─'.repeat(100));
        for (const lab of deletedLabs.slice(0, 15)) {
          console.log(`${lab.faculty} | ${lab.subject} | ${lab.section}`);
        }
      }

      // Final verification
      console.log('\n\nFINAL VERIFICATION:');
      console.log('─'.repeat(100));

      const allFaculties = await User.find({ role: 'Faculty' });
      let compliantCount = 0;
      let compliantWithLabs = 0;
      let violations = [];

      for (const fac of allFaculties) {
        const labCount = await Timetable.countDocuments({
          lab_faculty_id: fac._id,
          is_lab_class: true
        });

        const weeklyHours = labCount * 2;
        
        if (weeklyHours <= 2) {
          compliantCount++;
          if (weeklyHours > 0) {
            compliantWithLabs++;
          }
        } else {
          violations.push({
            name: fac.name,
            hours: weeklyHours,
            count: labCount
          });
        }
      }

      console.log(`✅ Faculty with 0 lab hours: ${allFaculties.length - compliantWithLabs}`);
      console.log(`✅ Faculty with 1-2 lab hours: ${compliantWithLabs}`);
      console.log(`✅ Total compliant (≤ 2/week): ${compliantCount}/${allFaculties.length}`);
      console.log(`⚠️  Violations: ${violations.length}\n`);

      if (violations.length > 0) {
        console.log('Remaining violations:');
        for (const v of violations) {
          console.log(`  ${v.name}: ${v.hours} hours/week (${v.count} lab sessions)`);
        }
      } else {
        console.log('🎉 ALL FACULTY COMPLIANT WITH LAB HOURS CONSTRAINT!');
      }

      // Get lab statistics
      const labEntries = await Timetable.find({ is_lab_class: true });
      console.log('\n\n📊 LAB HOURS STATISTICS:');
      console.log('─'.repeat(100));
      console.log(`Total lab hours assigned: ${labEntries.length}`);
      console.log(`Total lab hours (hours): ${labEntries.length * 2}`);
      console.log(`Faculty with lab assignments: ${compliantWithLabs}`);
      console.log(`Average labs per faculty: ${(compliantWithLabs > 0 ? labEntries.length / compliantWithLabs : 0).toFixed(2)}`);

      console.log('\n✅ Lab hours optimization completed successfully');
      
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
