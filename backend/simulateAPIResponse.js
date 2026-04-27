const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const Section = require('./models/Section');
const Subject = require('./models/Subject');
const Classroom = require('./models/Classroom');
const Department = require('./models/Department');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    
    try {
      // Find first faculty with 7+ sections
      const faculties = await User.find({ role: 'Faculty' });
      
      let targetFaculty = null;
      for (const faculty of faculties) {
        if ((faculty.assignedSections || []).length >= 7) {
          targetFaculty = faculty;
          break;
        }
      }

      if (!targetFaculty) {
        console.log('❌ No faculty found with 7+ assigned sections');
        mongoose.connection.close();
        return;
      }

      console.log(`📌 SIMULATING API RESPONSE FOR: ${targetFaculty.name}`);
      console.log(`Faculty ID: ${targetFaculty._id}\n`);

      // Simulate /faculty/schedule endpoint
      console.log('1️⃣  GET /faculty/schedule\n');
      const schedule = await Timetable.find({ faculty_id: targetFaculty._id })
        .populate('section_id', 'name')
        .populate('subject_id', 'name code')
        .populate('classroom_id', 'name building')
        .select('day_of_week start_time end_time section_id subject_id classroom_id is_lab_class');

      console.log(`Returns: ${schedule.length} timetable entries`);
      
      // Group by day
      const byDay = {};
      for (const entry of schedule) {
        if (!byDay[entry.day_of_week]) byDay[entry.day_of_week] = [];
        byDay[entry.day_of_week].push(entry);
      }

      Object.entries(byDay).forEach(([day, entries]) => {
        console.log(`\n  ${day}:`);
        entries.forEach(e => {
          console.log(`    ${e.start_time}-${e.end_time} | ${e.section_id?.name} | ${e.subject_id?.name}`);
        });
      });

      // Simulate /faculty/assigned-sections endpoint
      console.log('\n\n2️⃣  GET /faculty/assigned-sections\n');
      const assignedSecIds = targetFaculty.assignedSections || [];
      const sections = await Section.find({ _id: { $in: assignedSecIds } })
        .populate('department_id', 'name code')
        .select('name semester students');

      const timetableSections = await Timetable.find({ 
        faculty_id: targetFaculty._id 
      }).distinct('section_id');

      const sectionAssignments = await Timetable.find({ 
        faculty_id: targetFaculty._id 
      })
        .populate('section_id', 'name');

      // Build the merged response (like the enhanced getAssignedSections does)
      const uniqueSectionMap = new Map();

      // From assignedSections
      for (const section of sections) {
        const key = section._id.toString();
        if (!uniqueSectionMap.has(key)) {
          uniqueSectionMap.set(key, {
            _id: section._id,
            name: section.name,
            semester: section.semester,
            studentCount: section.students?.length || 0,
            source: 'assignedSections'
          });
        }
      }

      // From Timetable
      for (const tt of sectionAssignments) {
        const sectionId = tt.section_id._id.toString();
        if (!uniqueSectionMap.has(sectionId)) {
          uniqueSectionMap.set(sectionId, {
            _id: tt.section_id._id,
            name: tt.section_id.name,
            semester: tt.section_id.semester,
            studentCount: 0,
            source: 'timetable'
          });
        } else {
          // Mark as multiple sources
          const existing = uniqueSectionMap.get(sectionId);
          existing.source = existing.source === 'timetable' ? 'both' : 'both';
        }
      }

      const mergedSections = Array.from(uniqueSectionMap.values());

      console.log(`Returns: ${mergedSections.length} unique sections`);
      for (const section of mergedSections) {
        console.log(`  • ${section.name} (Semester ${section.semester}, ${section.studentCount} students) [${section.source}]`);
      }

      // Analysis
      console.log('\n\n📊 ANALYSIS\n');
      console.log(`Assigned Sections: ${assignedSecIds.length}`);
      console.log(`Timetable Entries: ${schedule.length}`);
      console.log(`Merged Unique Sections: ${mergedSections.length}`);
      console.log(`Classes per Week: ${schedule.length}`);
      
      // Count by day
      const dayMap = new Map();
      for (const day of Object.keys(byDay)) {
        dayMap.set(day, byDay[day].length);
      }

      console.log(`\nClasses by Day:`);
      for (const [day, count] of dayMap) {
        console.log(`  ${day}: ${count} classes`);
      }

      // What frontend might be showing
      console.log('\n\n❓ POSSIBLE FRONTEND ISSUES\n');
      
      const uniqueDays = Object.keys(byDay).length;
      const maxClassesOnOneDay = Math.max(...Object.values(byDay).map(e => e.length));

      console.log(`If frontend only shows "${uniqueDays} days": User sees ${uniqueDays} instead of ${schedule.length} classes`);
      console.log(`If frontend only shows "one day's schedule": User sees ${maxClassesOnOneDay} instead of ${schedule.length} classes`);
      console.log(`If frontend counts "unique sections": User sees ${mergedSections.length} instead of ${schedule.length} classes`);
      console.log(`If frontend groups by "section": User sees ${mergedSections.length} sections but might not count all timetable entries`);

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
