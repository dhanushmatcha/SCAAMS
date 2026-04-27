const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const Section = require('./models/Section');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB');
    console.log('\n🧹 CLEANING UP ORPHANED ASSIGNED SECTIONS...\n');
    
    try {
      const faculties = await User.find({ role: 'Faculty' }).populate('assignedSections', 'name');
      let cleanedCount = 0;
      const cleanedFaculties = [];

      for (const faculty of faculties) {
        const assignedIds = new Set(
          faculty.assignedSections?.map(s => s._id?.toString() || s.toString()) || []
        );

        if (assignedIds.size === 0) {
          continue; // Skip faculty with no assigned sections
        }

        // Get actual timetable sections
        const timetableEntries = await Timetable.find({ faculty_id: faculty._id }).distinct('section_id');
        const timetableIds = new Set(timetableEntries.map(s => s.toString()));

        // If faculty has assigned sections but no timetable, clear assigned sections
        if (timetableIds.size === 0) {
          await User.findByIdAndUpdate(
            faculty._id,
            { assignedSections: [] },
            { new: true }
          );

          cleanedFaculties.push({
            name: faculty.name,
            email: faculty.email,
            removedCount: assignedIds.size
          });

          cleanedCount++;
        }
      }

      console.log(`✅ CLEANED: ${cleanedCount} faculty members\n`);
      
      if (cleanedFaculties.length > 0) {
        console.log('CLEANED DETAILS (first 30):');
        console.log('─'.repeat(100));
        for (const fac of cleanedFaculties.slice(0, 30)) {
          console.log(`✓ ${fac.name} (${fac.email}) - Removed ${fac.removedCount} orphaned sections`);
        }
      }

      // Final verification
      console.log('\n\n🔍 FINAL VERIFICATION...\n');

      const allFaculties = await User.find({ role: 'Faculty' }).populate('assignedSections', 'name');
      let matchedCount = 0;
      let mismatchCount = 0;

      for (const faculty of allFaculties) {
        const assignedIds = new Set(
          faculty.assignedSections?.map(s => s._id?.toString() || s.toString()) || []
        );

        const timetableIds = new Set(
          (await Timetable.find({ faculty_id: faculty._id }).distinct('section_id')).map(s => s.toString())
        );

        if (assignedIds.size === timetableIds.size) {
          matchedCount++;
        } else {
          mismatchCount++;
        }
      }

      console.log('FINAL STATISTICS:');
      console.log('─'.repeat(100));
      console.log(`Total Faculty: ${allFaculties.length}`);
      console.log(`✅ Matched: ${matchedCount}`);
      console.log(`⚠️  Mismatched: ${mismatchCount}`);

      if (mismatchCount === 0) {
        console.log('\n🎉 ALL FACULTY ASSIGNMENTS ARE NOW SYNCHRONIZED!');
      }

      console.log('\n✅ Cleanup completed successfully');
      
    } catch (error) {
      console.error('❌ Error:', error);
    }

    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
