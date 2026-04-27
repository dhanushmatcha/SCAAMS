const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const Section = require('./models/Section');
const Subject = require('./models/Subject');
const Classroom = require('./models/Classroom');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    console.log('🔍 DIAGNOSING SECTION VS TIMETABLE MISMATCH\n');
    
    try {
      const faculties = await User.find({ role: 'Faculty' }).populate('assignedSections', 'name');
      
      let mismatches = [];

      for (const faculty of faculties) {
        const assignedSectionCount = faculty.assignedSections?.length || 0;
        const timetableCount = await Timetable.countDocuments({ faculty_id: faculty._id });

        if (assignedSectionCount > timetableCount) {
          mismatches.push({
            name: faculty.name,
            assignedSections: assignedSectionCount,
            timetableClasses: timetableCount,
            difference: assignedSectionCount - timetableCount,
            sections: faculty.assignedSections?.map(s => s.name) || []
          });
        }
      }

      console.log(`Faculty with Section-Timetable Mismatch: ${mismatches.length}\n`);
      console.log('─'.repeat(120));
      console.log('Faculty Name                     | Assigned Sections | Timetable Classes | Gap | Sections');
      console.log('─'.repeat(120));

      for (const mismatch of mismatches.sort((a, b) => b.difference - a.difference)) {
        const name = mismatch.name.padEnd(32);
        const assigned = String(mismatch.assignedSections).padEnd(17);
        const timetable = String(mismatch.timetableClasses).padEnd(18);
        const gap = String(mismatch.difference).padEnd(4);
        const sections = mismatch.sections.join(', ').substring(0, 50);

        console.log(`${name} | ${assigned} | ${timetable} | ${gap} | ${sections}`);
      }

      if (mismatches.length > 0) {
        console.log('\n\n⚠️  ROOT CAUSE ANALYSIS');
        console.log('─'.repeat(120));
        console.log('Possible causes:');
        console.log('1. assignedSections updated but timetable entries not created');
        console.log('2. Faculty assigned to sections but no schedule was generated');
        console.log('3. Timetable entries were deleted or not properly linked\n');

        // Check first mismatch in detail
        const first = mismatches[0];
        console.log(`DETAILED ANALYSIS: ${first.name}`);
        console.log('─'.repeat(120));
        
        const timetables = await Timetable.find({ faculty_id: (await User.findOne({ name: first.name }))._id })
          .populate('section_id', 'name')
          .populate('subject_id', 'name');

        console.log(`Timetable entries found: ${timetables.length}`);
        for (const tt of timetables) {
          console.log(`  • ${tt.day_of_week} ${tt.start_time}-${tt.end_time}: ${tt.section_id?.name} - ${tt.subject_id?.name}`);
        }
      } else {
        console.log('✅ NO MISMATCHES FOUND - All sections have corresponding timetable entries');
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
