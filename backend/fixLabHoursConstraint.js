const mongoose = require('mongoose');
require('dotenv').config();

const Subject = require('./models/Subject');
const Section = require('./models/Section');
const User = require('./models/User');
const Timetable = require('./models/Timetable');
const SectionAssignment = require('./models/SectionAssignment');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB');
    console.log('\n🔧 FIXING LAB HOURS CONSTRAINT VIOLATIONS...\n');
    
    try {
      const faculties = await User.find({ role: 'Faculty' });
      let fixedCount = 0;
      let reassignedCount = 0;
      const fixes = [];

      // Find all faculty with constraint violations
      const violations = [];

      for (const fac of faculties) {
        const labClasses = await Timetable.find({
          $or: [
            { lab_faculty_id: fac._id, is_lab_class: true },
            { lab_ta_ids: fac._id, is_lab_class: true }
          ]
        }).populate('subject_id').populate('section_id');

        const weeklyHours = labClasses.length * 2;
        if (weeklyHours > 2) {
          violations.push({
            faculty: fac,
            labClasses: labClasses,
            weeklyHours: weeklyHours,
            excess: weeklyHours - 2
          });
        }
      }

      console.log(`Found ${violations.length} faculty with constraint violations\n`);

      // Fix violations by reassigning excess lab hours to TAs
      for (const violation of violations) {
        const faculty = violation.faculty;
        const excess = violation.excess / 2; // Number of excess labs (each is 2 hours)

        console.log(`\nProcessing ${faculty.name} (${violation.weeklyHours} hours, exceeds by ${violation.excess})`);
        
        // Get the lab classes assigned to this faculty as lab_faculty_id
        const facultyLabClasses = await Timetable.find({
          lab_faculty_id: faculty._id,
          is_lab_class: true
        }).populate('section_id').populate('subject_id');

        // Try to reassign some labs to TAs
        let reassigned = 0;
        for (let i = 0; i < Math.min(excess, facultyLabClasses.length); i++) {
          const labClass = facultyLabClasses[i];
          
          // Find a TA or another faculty with availability
          const taAssignments = await SectionAssignment.find({
            section_id: labClass.section_id._id,
            role: 'TA'
          }).populate('faculty_id');

          if (taAssignments.length > 0) {
            const ta = taAssignments[0].faculty_id;
            
            // Check if this TA can take the lab (max 2 hours)
            const taLabCount = await Timetable.countDocuments({
              $or: [
                { lab_faculty_id: ta._id, is_lab_class: true },
                { lab_ta_ids: ta._id, is_lab_class: true }
              ]
            });

            if (taLabCount === 0) { // TA has no labs yet
              // Transfer the lab to this TA
              labClass.lab_faculty_id = ta._id;
              labClass.lab_ta_ids = [faculty._id]; // Original faculty becomes TA
              await labClass.save();

              reassigned++;
              reassignedCount++;

              fixes.push({
                section: labClass.section_id.name,
                subject: labClass.subject_id.name,
                from: faculty.name,
                to: ta.name,
                time: `${labClass.lab_day_of_week} ${labClass.lab_start_time}`
              });

              console.log(`  ✓ Reassigned ${labClass.subject_id.name} to ${ta.name}`);
            }
          }
        }

        if (reassigned > 0) {
          fixedCount++;
        }
      }

      console.log('\n\nREASSIGNMENT DETAILS (first 15):');
      console.log('─'.repeat(100));
      for (const fix of fixes.slice(0, 15)) {
        console.log(`${fix.section} | ${fix.subject}`);
        console.log(`  From: ${fix.from} → To: ${fix.to}`);
        console.log(`  Time: ${fix.time}`);
        console.log('');
      }

      // Final verification
      console.log('\nFINAL VERIFICATION:');
      console.log('─'.repeat(100));

      let remainingViolations = 0;
      let constraintMet = 0;

      for (const fac of faculties) {
        const labClasses = await Timetable.find({
          $or: [
            { lab_faculty_id: fac._id, is_lab_class: true },
            { lab_ta_ids: fac._id, is_lab_class: true }
          ]
        });

        const weeklyHours = labClasses.length * 2;
        if (weeklyHours > 2) {
          remainingViolations++;
          console.log(`⚠️  ${fac.name}: ${weeklyHours} hours/week`);
        } else if (weeklyHours > 0) {
          constraintMet++;
        }
      }

      console.log(`\n✅ Constraint satisfied for: ${constraintMet} faculty`);
      console.log(`⚠️  Remaining violations: ${remainingViolations}\n`);

      console.log('📊 SUMMARY:');
      console.log('─'.repeat(100));
      console.log(`Violations Fixed: ${fixedCount}`);
      console.log(`Labs Reassigned: ${reassignedCount}`);
      console.log(`Total Fixes Applied: ${fixes.length}`);

      console.log('\n✅ Constraint fixing completed');
      
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
