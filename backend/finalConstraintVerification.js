const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const SectionAssignment = require('./models/SectionAssignment');
const Section = require('./models/Section');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('\n\n');
    console.log('═'.repeat(120));
    console.log('█'.repeat(120));
    console.log('█' + ' '.repeat(118) + '█');
    console.log('█' + '  FINAL WORKLOAD & CONSTRAINT VERIFICATION REPORT'.padEnd(119) + '█');
    console.log('█' + ' '.repeat(118) + '█');
    console.log('█'.repeat(120));
    console.log('═'.repeat(120));
    console.log('\n');
    
    try {
      const faculties = await User.find({ role: 'Faculty' });
      
      // Constraint 1: All faculty should have assignments
      console.log('📋 CONSTRAINT 1: ALL FACULTY MUST HAVE ASSIGNED SECTIONS');
      console.log('─'.repeat(120));
      
      let fullyAssigned = 0;
      let partiallyAssigned = 0;
      const unassignedFaculty = [];

      for (const faculty of faculties) {
        const timetableCount = await Timetable.countDocuments({ faculty_id: faculty._id });
        const assignedSections = faculty.assignedSections?.length || 0;

        if (timetableCount > 0 && assignedSections > 0) {
          fullyAssigned++;
        } else if (timetableCount > 0 || assignedSections > 0) {
          partiallyAssigned++;
        } else {
          unassignedFaculty.push(faculty.name);
        }
      }

      console.log(`✅ Fully Assigned (both timetable & sections): ${fullyAssigned}/107`);
      console.log(`⚠️  Partially Assigned: ${partiallyAssigned}`);
      console.log(`❌ Unassigned: ${unassignedFaculty.length}`);

      if (unassignedFaculty.length > 0) {
        console.log(`   Unassigned Faculty: ${unassignedFaculty.join(', ')}`);
      } else {
        console.log(`   ✅ All faculty have assignments!`);
      }

      // Constraint 2: Minimum workload - 8 hours/week for faculty, 10 for TAs
      console.log('\n\n📋 CONSTRAINT 2: MINIMUM WORKLOAD');
      console.log('─'.repeat(120));
      console.log('Expected: 8 hours/week for Faculty, 10 hours/week for TAs, No minimum for HODs');
      console.log();

      let facultyCompliant = 0;
      let taCompliant = 0;
      let hodExempt = 0;
      const violations = [];

      for (const faculty of faculties) {
        const timetableCount = await Timetable.countDocuments({ faculty_id: faculty._id });
        const isTa = await SectionAssignment.countDocuments({ faculty_id: faculty._id, role: 'TA' }) > 0;
        const isHod = faculty.isHod || false;

        if (isHod) {
          hodExempt++;
        } else if (isTa) {
          if (timetableCount >= 10) {
            taCompliant++;
          } else {
            violations.push({ name: faculty.name, hours: timetableCount, required: 10, type: 'TA' });
          }
        } else {
          if (timetableCount >= 8) {
            facultyCompliant++;
          } else {
            violations.push({ name: faculty.name, hours: timetableCount, required: 8, type: 'Faculty' });
          }
        }
      }

      const nonHodCount = faculties.filter(f => !f.isHod).length;
      console.log(`✅ Faculty (≥8h/week): ${facultyCompliant}/${nonHodCount - 0}`);
      console.log(`✅ TAs (≥10h/week): ${taCompliant}`);
      console.log(`✅ HODs (exempt): ${hodExempt}`);

      if (violations.length === 0) {
        console.log(`\n✅ ALL WORKLOAD CONSTRAINTS SATISFIED!`);
      } else {
        console.log(`\n⚠️  Violations (${violations.length}):`);
        violations.forEach(v => {
          console.log(`   ${v.name}: ${v.hours}h (needs ${v.required}h) [${v.type}]`);
        });
      }

      // Workload distribution summary
      console.log('\n\n📊 WORKLOAD DISTRIBUTION');
      console.log('─'.repeat(120));

      const distribution = {};
      for (const faculty of faculties) {
        const timetableCount = await Timetable.countDocuments({ faculty_id: faculty._id });
        if (!distribution[timetableCount]) {
          distribution[timetableCount] = [];
        }
        distribution[timetableCount].push(faculty.name);
      }

      const sortedHours = Object.keys(distribution)
        .map(h => parseInt(h))
        .sort((a, b) => a - b);

      for (const hours of sortedHours) {
        const count = distribution[hours].length;
        const percentage = ((count / faculties.length) * 100).toFixed(1);
        const status = hours >= 8 ? '✅' : '⚠️';
        console.log(`${status} ${hours} hours/week: ${count} faculty (${percentage}%)`);
      }

      // Constraint 3: Sections coverage
      console.log('\n\n📋 CONSTRAINT 3: SECTION COVERAGE');
      console.log('─'.repeat(120));

      const allSections = await Section.find();
      let sectionsWithFaculty = 0;

      for (const section of allSections) {
        const facultyCount = await Timetable.countDocuments({ section_id: section._id });
        if (facultyCount > 0) {
          sectionsWithFaculty++;
        }
      }

      console.log(`✅ Sections with Faculty Assigned: ${sectionsWithFaculty}/${allSections.length}`);
      console.log(`   Coverage: ${((sectionsWithFaculty / allSections.length) * 100).toFixed(1)}%`);

      // Summary
      console.log('\n\n' + '═'.repeat(120));
      console.log('📊 OVERALL SYSTEM STATUS');
      console.log('═'.repeat(120));

      const allConstraintsMet = unassignedFaculty.length === 0 && violations.length === 0 && 
                                sectionsWithFaculty === allSections.length;

      console.log(`\nConstraint 1 - Faculty Assignment: ${unassignedFaculty.length === 0 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Constraint 2 - Minimum Workload: ${violations.length === 0 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Constraint 3 - Section Coverage: ${sectionsWithFaculty === allSections.length ? '✅ PASS' : '❌ FAIL'}`);

      if (allConstraintsMet) {
        console.log('\n' + '═'.repeat(120));
        console.log('🎉🎉🎉 ALL CONSTRAINTS MET - SYSTEM READY FOR OPERATION 🎉🎉🎉');
        console.log('═'.repeat(120));
      } else {
        console.log('\n⚠️  Some constraints not met. Review above.');
      }

      console.log('\n');

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
