const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const SectionAssignment = require('./models/SectionAssignment');
const Section = require('./models/Section');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB');
    console.log('\n📊 DETAILED MISMATCH REPORT...\n');
    
    try {
      const faculties = await User.find({ role: 'Faculty' }).populate('assignedSections', 'name');
      const mismatches = [];
      const summary = {
        total: faculties.length,
        matched: 0,
        assignedButNoTimetable: 0,
        timetableButNotAssigned: 0
      };

      for (const faculty of faculties) {
        const assignedIds = new Set(
          faculty.assignedSections?.map(s => s._id?.toString() || s.toString()) || []
        );

        const timetableEntries = await Timetable.find({ faculty_id: faculty._id }).distinct('section_id');
        const timetableIds = new Set(timetableEntries.map(s => s.toString()));

        if (assignedIds.size !== timetableIds.size) {
          const assigned = Array.from(assignedIds);
          const timetable = Array.from(timetableIds);
          
          // Find sections in assigned but not in timetable
          const orphaned = assigned.filter(id => !timetableIds.has(id));
          
          // Find sections in timetable but not in assigned
          const missing = timetable.filter(id => !assignedIds.has(id));

          mismatches.push({
            name: faculty.name,
            email: faculty.email,
            assignedCount: assigned.length,
            timetableCount: timetable.length,
            orphanedSections: orphaned.length > 0 ? '⚠️ Yes' : 'No',
            missingSections: missing.length > 0 ? '⚠️ Yes' : 'No'
          });

          if (orphaned.length > 0 && missing.length === 0) {
            summary.assignedButNoTimetable++;
          } else if (missing.length > 0 && orphaned.length === 0) {
            summary.timetableButNotAssigned++;
          }
        } else if (assignedIds.size > 0 && timetableIds.size > 0) {
          summary.matched++;
        }
      }

      console.log('SUMMARY:');
      console.log('─'.repeat(100));
      console.log(`Total Faculty: ${summary.total}`);
      console.log(`✅ Matched (assigned = timetable): ${summary.matched}`);
      console.log(`⚠️  Assigned sections but NO timetable: ${summary.assignedButNoTimetable}`);
      console.log(`⚠️  Timetable exists but NOT assigned: ${summary.timetableButNotAssigned}`);
      console.log(`Total Mismatches: ${mismatches.length}\n`);

      if (mismatches.length > 0) {
        console.log('MISMATCH DETAILS (first 20):');
        console.log('─'.repeat(100));
        console.log(
          'Faculty Name                    | Email                              | Assigned | Timetable | Orphaned | Missing'
        );
        console.log('─'.repeat(100));
        
        for (const m of mismatches.slice(0, 20)) {
          const name = m.name.padEnd(30);
          const email = m.email.padEnd(34);
          const assigned = String(m.assignedCount).padEnd(8);
          const timetable = String(m.timetableCount).padEnd(9);
          const orphaned = m.orphanedSections.padEnd(8);
          const missing = m.missingSections.padEnd(7);
          
          console.log(`${name} | ${email} | ${assigned} | ${timetable} | ${orphaned} | ${missing}`);
        }
      }

      console.log('\n\n📋 RECOMMENDATION:');
      console.log('─'.repeat(100));
      if (summary.assignedButNoTimetable > 0) {
        console.log(`🔧 ${summary.assignedButNoTimetable} faculty have assigned sections but no timetable.`);
        console.log('   ACTION: Run /api/admin/generate-timetable to create timetables for these faculty.');
      }
      if (summary.timetableButNotAssigned > 0) {
        console.log(`🔧 ${summary.timetableButNotAssigned} faculty have timetable entries but are not in assignedSections.`);
        console.log('   ACTION: Run POST /api/admin/sync-assigned-sections to synchronize.');
      }

      console.log('\n✅ Report completed');
      
    } catch (error) {
      console.error('❌ Error:', error);
    }

    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
