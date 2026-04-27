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
    console.log('🔄 COMPREHENSIVE FACULTY SECTIONS SYNCHRONIZATION\n');
    
    try {
      const faculties = await User.find({ role: 'Faculty' });
      const syncResults = [];

      let updateCount = 0;

      for (const faculty of faculties) {
        const sectionMap = new Map();

        // Source 1: Current assignedSections
        if (faculty.assignedSections && faculty.assignedSections.length > 0) {
          for (const sectionId of faculty.assignedSections) {
            sectionMap.set(sectionId.toString(), true);
          }
        }

        // Source 2: Timetable sections
        const timetableSections = await Timetable.find({ faculty_id: faculty._id }).distinct('section_id');
        for (const sectionId of timetableSections) {
          sectionMap.set(sectionId.toString(), true);
        }

        // Source 3: SectionAssignment sections (Teacher role)
        const assignmentSections = await SectionAssignment.find({ 
          faculty_id: faculty._id, 
          role: 'Teacher' 
        }).distinct('section_id');
        for (const sectionId of assignmentSections) {
          sectionMap.set(sectionId.toString(), true);
        }

        const mergedSectionIds = Array.from(sectionMap.keys());
        const previousCount = faculty.assignedSections?.length || 0;

        // Update if changed
        if (previousCount !== mergedSectionIds.length) {
          await User.findByIdAndUpdate(
            faculty._id,
            { assignedSections: mergedSectionIds },
            { new: true }
          );

          updateCount++;
          syncResults.push({
            name: faculty.name,
            previousCount,
            newCount: mergedSectionIds.length,
            updated: true
          });
        } else {
          syncResults.push({
            name: faculty.name,
            previousCount,
            newCount: mergedSectionIds.length,
            updated: false
          });
        }
      }

      console.log('SYNCHRONIZATION RESULTS:');
      console.log('─'.repeat(100));
      console.log(`Total Faculty: ${faculties.length}`);
      console.log(`Faculty Updated: ${updateCount}`);
      console.log(`Faculty Unchanged: ${faculties.length - updateCount}\n`);

      if (updateCount > 0) {
        console.log('UPDATED FACULTY:');
        console.log('─'.repeat(100));
        for (const result of syncResults.filter(r => r.updated)) {
          console.log(`${result.name}: ${result.previousCount} → ${result.newCount} sections`);
        }
      }

      console.log('\n✅ Synchronization completed successfully!');
      console.log('All faculty sections are now synchronized across all sources.');
      
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
