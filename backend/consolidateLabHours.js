const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const Subject = require('./models/Subject');
const Section = require('./models/Section');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB');
    console.log('\n🔧 OPTIMIZING LAB HOURS - CONSOLIDATING DUPLICATE LABS...\n');
    
    try {
      const faculties = await User.find({ role: 'Faculty' });
      let consolidatedCount = 0;
      let deletedCount = 0;
      const details = [];

      for (const faculty of faculties) {
        // Get all labs taught by this faculty
        const allLabsAsTeacher = await Timetable.find({
          lab_faculty_id: faculty._id,
          is_lab_class: true
        }).populate('subject_id').populate('section_id');

        if (allLabsAsTeacher.length <= 1) continue; // No consolidation needed

        // Group labs by subject
        const labsBySubject = {};
        
        for (const lab of allLabsAsTeacher) {
          const subjectId = lab.subject_id._id.toString();
          if (!labsBySubject[subjectId]) {
            labsBySubject[subjectId] = [];
          }
          labsBySubject[subjectId].push(lab);
        }

        // For each subject with multiple labs, keep only the first (consolidate others)
        for (const subjectId in labsBySubject) {
          const labs = labsBySubject[subjectId];
          
          if (labs.length > 1) {
            const keepLab = labs[0]; // Keep first lab
            const removeLabs = labs.slice(1); // Remove others

            console.log(`\n${faculty.name} - ${labs[0].subject_id.name}:`);
            console.log(`  Consolidating ${labs.length} labs into 1`);
            console.log(`  Keeping: ${keepLab.section_id.name} on ${keepLab.lab_day_of_week}`);

            // Delete extra labs
            for (const removeLab of removeLabs) {
              await Timetable.findByIdAndDelete(removeLab._id);
              deletedCount++;
              console.log(`  ✓ Removed: ${removeLab.section_id.name}`);
            }

            consolidatedCount++;
            details.push({
              faculty: faculty.name,
              subject: labs[0].subject_id.name,
              sections: labs.map(l => l.section_id.name).join(', '),
              consolidatedTo: keepLab.section_id.name,
              time: `${keepLab.lab_day_of_week} ${keepLab.lab_start_time}-${keepLab.lab_end_time}`
            });
          }
        }
      }

      console.log('\n\nCONSOLIDATION SUMMARY:');
      console.log('─'.repeat(100));
      console.log(`Lab sessions consolidated: ${consolidatedCount}`);
      console.log(`Lab sessions deleted: ${deletedCount}\n`);

      if (details.length > 0) {
        console.log('CONSOLIDATION DETAILS (first 20):');
        console.log('─'.repeat(100));
        for (const detail of details.slice(0, 20)) {
          console.log(`✓ ${detail.faculty} - ${detail.subject}`);
          console.log(`  Sections: ${detail.sections}`);
          console.log(`  Consolidated to: ${detail.consolidatedTo}`);
          console.log(`  Time: ${detail.time}`);
          console.log('');
        }
      }

      // Final verification
      console.log('\nFINAL LAB HOURS VERIFICATION:');
      console.log('─'.repeat(100));

      const allFaculties = await User.find({ role: 'Faculty' });
      let compliantCount = 0;
      let violations = [];

      for (const fac of allFaculties) {
        const labCount = await Timetable.countDocuments({
          lab_faculty_id: fac._id,
          is_lab_class: true
        });

        const weeklyHours = labCount * 2;
        
        if (weeklyHours === 0) {
          // No labs - OK
          compliantCount++;
        } else if (weeklyHours <= 2) {
          // Compliant
          compliantCount++;
        } else {
          violations.push({
            name: fac.name,
            hours: weeklyHours,
            excess: weeklyHours - 2
          });
        }
      }

      console.log(`✅ Faculty with compliant lab hours (≤ 2/week): ${compliantCount}`);
      console.log(`⚠️  Faculty with violations: ${violations.length}\n`);

      if (violations.length > 0) {
        console.log('Remaining violations:');
        for (const v of violations) {
          console.log(`  ${v.name}: ${v.hours} hours/week (${v.excess} over limit)`);
        }
      }

      console.log('\n✅ Lab hour optimization completed successfully');
      
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
