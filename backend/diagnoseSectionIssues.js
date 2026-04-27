const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const Section = require('./models/Section');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    console.log('🔎 DIAGNOSING SECTIONS VS CLASSES DISCREPANCY\n');
    
    try {
      const faculties = await User.find({ role: 'Faculty' });
      
      let issues = [];

      for (const faculty of faculties) {
        const assignedSectionIds = faculty.assignedSections || [];
        const timetables = await Timetable.find({ faculty_id: faculty._id });
        
        // Get unique sections from timetable
        const timetableSectionIds = new Set(
          timetables.map(t => t.section_id?.toString()).filter(Boolean)
        );

        // Check for mismatches
        const assignedCount = assignedSectionIds.length;
        const timetableCount = timetableSectionIds.size;
        const totalClasses = timetables.length;

        // Check for duplicates in assignedSections
        const uniqueAssigned = new Set(assignedSectionIds.map(s => s?.toString()).filter(Boolean));
        const hasDuplicates = assignedCount !== uniqueAssigned.size;

        // Check for invalid IDs
        const invalidIds = assignedSectionIds.filter(s => !s || s.toString() === 'null' || s === null).length;

        // Find sections in assignedSections but not in timetable
        const orphanSections = [];
        for (const sectionId of assignedSectionIds) {
          if (sectionId && !timetableSectionIds.has(sectionId.toString())) {
            orphanSections.push(sectionId.toString());
          }
        }

        if (hasDuplicates || invalidIds > 0 || orphanSections.length > 0 || (assignedCount >= 7 && totalClasses < 8)) {
          issues.push({
            name: faculty.name,
            assignedCount,
            uniqueAssigned: uniqueAssigned.size,
            hasDuplicates,
            invalidIds,
            orphanSections: orphanSections.length,
            totalClasses,
            timetableSections: timetableCount,
            status: `${assignedCount} sections → ${totalClasses} classes`
          });
        }
      }

      if (issues.length === 0) {
        console.log('✅ NO ISSUES FOUND - All sections have corresponding timetable entries\n');
      } else {
        console.log(`⚠️  ISSUES FOUND: ${issues.length} faculty\n`);
        console.log('─'.repeat(140));
        console.log('Faculty Name                     | Assigned | Unique | Dups | Invalid | Orphans | Classes | Status');
        console.log('─'.repeat(140));

        for (const issue of issues) {
          const name = issue.name.padEnd(32);
          const assigned = String(issue.assignedCount).padEnd(8);
          const unique = String(issue.uniqueAssigned).padEnd(6);
          const dups = issue.hasDuplicates ? 'YES' : 'NO ';
          const invalid = String(issue.invalidIds).padEnd(7);
          const orphans = String(issue.orphanSections).padEnd(7);
          const classes = String(issue.totalClasses).padEnd(7);

          console.log(`${name} | ${assigned} | ${unique} | ${dups} | ${invalid} | ${orphans} | ${classes} | ${issue.status}`);
        }
      }

      // Sample check
      console.log('\n\n📋 SAMPLE DETAILED CHECK (First 3 issues)\n');
      console.log('─'.repeat(140));

      for (const issue of issues.slice(0, 3)) {
        const faculty = faculties.find(f => f.name === issue.name);
        if (!faculty) continue;

        console.log(`\n${issue.name}:`);
        console.log(`  Assigned Sections: ${faculty.assignedSections?.map(s => s?.toString()).join(', ') || 'None'}`);
        
        const timetables = await Timetable.find({ faculty_id: faculty._id })
          .populate('section_id', 'name')
          .select('day_of_week start_time section_id');

        console.log(`  Timetable Entries (${timetables.length}):`);
        for (const tt of timetables) {
          console.log(`    • ${tt.day_of_week} ${tt.start_time} → Section: ${tt.section_id?.name || 'Unknown'}`);
        }
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
