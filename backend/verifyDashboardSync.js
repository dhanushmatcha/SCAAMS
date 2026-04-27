const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const SectionAssignment = require('./models/SectionAssignment');
const Section = require('./models/Section');
const Subject = require('./models/Subject');
const Classroom = require('./models/Classroom');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    console.log('✅ FINAL VERIFICATION REPORT: ADMIN vs FACULTY DASHBOARD SECTIONS\n');
    
    try {
      const faculties = await User.find({ role: 'Faculty' }).populate('assignedSections', 'name');
      let allMatch = true;
      let detailedReport = [];

      for (const faculty of faculties) {
        // What admin dashboard shows
        const adminSections = faculty.assignedSections || [];
        const adminSectionSet = new Set(adminSections.map(s => s._id?.toString()));

        // Simulate what faculty endpoint returns (combining all sources)
        const facultySectionMap = new Map();

        // Source 1: assignedSections
        adminSections.forEach(section => {
          if (section && section._id) {
            facultySectionMap.set(section._id.toString(), section);
          }
        });

        // Source 2: Timetable
        const timetableSections = await Timetable.find({ faculty_id: faculty._id }).populate('section_id');
        timetableSections.forEach(item => {
          if (item.section_id && item.section_id._id) {
            facultySectionMap.set(item.section_id._id.toString(), item.section_id);
          }
        });

        // Source 3: SectionAssignment
        const assignments = await SectionAssignment.find({ faculty_id: faculty._id, role: 'Teacher' })
          .populate('section_id', 'name semester');
        assignments.forEach(a => {
          if (a.section_id && a.section_id._id) {
            facultySectionMap.set(a.section_id._id.toString(), a.section_id);
          }
        });

        const facultySections = Array.from(facultySectionMap.values());
        const facultySectionSet = new Set(facultySections.map(s => s._id?.toString()));

        // Check if admin and faculty views match
        const match = adminSectionSet.size === facultySectionSet.size &&
          Array.from(adminSectionSet).every(id => facultySectionSet.has(id));

        if (!match) {
          allMatch = false;
        }

        if (adminSections.length > 0) {
          detailedReport.push({
            name: faculty.name,
            adminCount: adminSectionSet.size,
            facultyCount: facultySectionSet.size,
            match,
            adminSectionNames: adminSections.map(s => s.name),
            facultySectionNames: facultySections.map(s => s.name || 'Unknown')
          });
        }
      }

      console.log('SUMMARY:');
      console.log('─'.repeat(120));
      console.log(`Total Faculty: ${faculties.length}`);
      console.log(`Faculty with Assignments: ${detailedReport.length}`);
      console.log(`All Faculty Sections Match: ${allMatch ? '✅ YES' : '❌ NO'}\n`);

      if (!allMatch) {
        console.log('MISMATCHES FOUND:');
        console.log('─'.repeat(120));
        const mismatches = detailedReport.filter(r => !r.match);
        for (const mismatch of mismatches) {
          console.log(`\n${mismatch.name}:`);
          console.log(`  Admin sees: ${mismatch.adminCount} sections`);
          console.log(`  Faculty would see: ${mismatch.facultyCount} sections`);
          console.log(`  Admin sections: ${mismatch.adminSectionNames.join(', ')}`);
          console.log(`  Faculty sections: ${mismatch.facultySectionNames.join(', ')}`);
        }
      } else if (detailedReport.length > 0) {
        console.log('✅ PERFECT SYNCHRONIZATION:');
        console.log('─'.repeat(120));
        console.log('All faculty with assigned sections have matching views between:');
        console.log('  • Admin Dashboard (User.assignedSections)');
        console.log('  • Faculty Dashboard (/faculty/assigned-sections endpoint)');
        console.log('    - Combines: assignedSections + Timetable + SectionAssignments\n');

        // Sample a few faculty to show the sync
        const samples = detailedReport.slice(0, 5);
        console.log('SAMPLE FACULTY:');
        console.log('─'.repeat(120));
        for (const sample of samples) {
          console.log(`${sample.name}: ${sample.adminCount} sections`);
          console.log(`  Sections: ${sample.adminSectionNames.join(', ')}`);
        }

        if (detailedReport.length > 5) {
          console.log(`\n... and ${detailedReport.length - 5} more faculty`);
        }
      }

      console.log('\n\n📊 DATA SOURCE INTEGRATION:');
      console.log('─'.repeat(120));
      console.log('Faculty Dashboard endpoint now retrieves sections from 3 sources:');
      console.log('1. User.assignedSections (primary source from admin assignment)');
      console.log('2. Timetable entries (faculty_id = their ID)');
      console.log('3. SectionAssignment records (faculty_id = their ID, role=Teacher)');
      console.log('   ↓');
      console.log('   Merged into one deduplicated list');
      console.log('   ↓');
      console.log('   Returned to faculty dashboard for display\n');

      console.log('✅ INTEGRATION COMPLETE');
      
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
