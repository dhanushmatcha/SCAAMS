const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const SectionAssignment = require('./models/SectionAssignment');
const Section = require('./models/Section');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB');
    console.log('\n🔍 DIAGNOSING SECTION MISMATCHES...\n');
    
    try {
      // Get all faculty
      const faculties = await User.find({ role: 'Faculty' }).populate('assignedSections', 'name');
      const mismatches = [];

      for (const faculty of faculties) {
        const assignedSectionIds = new Set(
          faculty.assignedSections?.map(s => s._id?.toString() || s.toString()) || []
        );

        // Get sections from timetable
        const timetableSections = await Timetable.find({ faculty_id: faculty._id }).distinct('section_id');
        const timetableSectionIds = new Set(timetableSections.map(s => s.toString()));

        // Get sections from SectionAssignment (Teacher role)
        const assignmentSections = await SectionAssignment.find({ 
          faculty_id: faculty._id, 
          role: 'Teacher' 
        }).distinct('section_id');
        const assignmentSectionIds = new Set(assignmentSections.map(s => s.toString()));

        // Check for mismatch
        const hasMatch = assignedSectionIds.size === timetableSectionIds.size && 
                        assignedSectionIds.size === assignmentSectionIds.size;

        if (!hasMatch) {
          mismatches.push({
            facultyId: faculty._id,
            name: faculty.name,
            email: faculty.email,
            assignedCount: assignedSectionIds.size,
            timetableCount: timetableSectionIds.size,
            assignmentCount: assignmentSectionIds.size,
            inAssigned: Array.from(assignedSectionIds),
            inTimetable: Array.from(timetableSectionIds),
            inAssignment: Array.from(assignmentSectionIds)
          });
        }
      }

      console.log(`Total Faculty: ${faculties.length}`);
      console.log(`Mismatches Found: ${mismatches.length}\n`);

      if (mismatches.length > 0) {
        console.log('MISMATCHES DETAILS:');
        console.log('─'.repeat(100));
        for (const mismatch of mismatches) {
          console.log(`\n👤 ${mismatch.name} (${mismatch.email})`);
          console.log(`   Assigned Sections: ${mismatch.assignedCount}`);
          console.log(`   Timetable Sections: ${mismatch.timetableCount}`);
          console.log(`   Assignment Sections: ${mismatch.assignmentCount}`);
        }

        console.log('\n\n🔧 FIXING MISMATCHES...\n');

        // Fix by syncing with timetable and assignments
        const sectionMap = new Map();

        // Build from timetable
        const allTimetables = await Timetable.find();
        for (const tt of allTimetables) {
          const fId = tt.faculty_id.toString();
          const sId = tt.section_id.toString();
          if (!sectionMap.has(fId)) {
            sectionMap.set(fId, new Set());
          }
          sectionMap.get(fId).add(sId);
        }

        // Build from assignments
        const allAssignments = await SectionAssignment.find({ role: 'Teacher' });
        for (const sa of allAssignments) {
          const fId = sa.faculty_id.toString();
          const sId = sa.section_id.toString();
          if (!sectionMap.has(fId)) {
            sectionMap.set(fId, new Set());
          }
          sectionMap.get(fId).add(sId);
        }

        // Update all faculty
        const updateResults = [];
        for (const [fId, sectionIds] of sectionMap.entries()) {
          const updatedUser = await User.findByIdAndUpdate(
            fId,
            { assignedSections: Array.from(sectionIds) },
            { new: true }
          ).select('name email assignedSections');

          updateResults.push({
            name: updatedUser?.name,
            email: updatedUser?.email,
            sectionsCount: Array.from(sectionIds).length
          });
        }

        console.log(`✅ FIXED: ${updateResults.length} faculty members synchronized\n`);
        console.log('FIXED DETAILS:');
        console.log('─'.repeat(100));
        for (const result of updateResults) {
          console.log(`✓ ${result.name} (${result.email}) - ${result.sectionsCount} sections`);
        }
      } else {
        console.log('✅ NO MISMATCHES FOUND - All faculty sections are synchronized!');
      }

      console.log('\n✅ Process completed successfully');
      
    } catch (error) {
      console.error('❌ Error:', error);
    }

    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
