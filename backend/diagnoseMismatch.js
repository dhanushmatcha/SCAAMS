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
    console.log('🔍 FACULTY ASSIGNED SECTIONS MISMATCH DIAGNOSIS\n');
    
    try {
      const faculties = await User.find({ role: 'Faculty' }).populate('assignedSections', 'name');
      
      let mismatches = [];
      let summary = {
        total: faculties.length,
        onlyInAssignedSections: 0,
        mismatchDetails: []
      };

      for (const faculty of faculties) {
        // What admin sees
        const adminVisibleSections = faculty.assignedSections || [];
        const adminSectionIds = new Set(adminVisibleSections.map(s => s._id?.toString() || s.toString()));

        // What faculty endpoint returns - Simulate the logic
        let facultyVisibleSections = [];

        // First try: assignedSections (same as admin)
        if (adminVisibleSections.length > 0) {
          facultyVisibleSections = adminVisibleSections;
        } else {
          // Fallback 1: Timetable
          const timetableSections = await Timetable.find({ faculty_id: faculty._id }).populate('section_id');
          if (timetableSections.length > 0) {
            const uniqueSections = new Map();
            timetableSections.forEach(item => {
              if (item.section_id && !uniqueSections.has(item.section_id._id.toString())) {
                uniqueSections.set(item.section_id._id.toString(), item.section_id);
              }
            });
            facultyVisibleSections = Array.from(uniqueSections.values());
          } else {
            // Fallback 2: SectionAssignment
            const assignments = await SectionAssignment.find({ faculty_id: faculty._id, role: 'Teacher' })
              .populate('section_id', 'name semester');
            const uniqueAssignments = new Map();
            assignments.forEach(a => {
              if (a.section_id && !uniqueAssignments.has(a.section_id._id.toString())) {
                uniqueAssignments.set(a.section_id._id.toString(), a.section_id);
              }
            });
            facultyVisibleSections = Array.from(uniqueAssignments.values());
          }
        }

        const facultySectionIds = new Set(facultyVisibleSections.map(s => s._id?.toString() || s.toString()));

        // Check for mismatch
        let mismatch = false;
        const onlyInAdmin = [];
        const missingFromFacultyDashboard = [];

        for (const sectionId of adminSectionIds) {
          if (!facultySectionIds.has(sectionId)) {
            mismatch = true;
            onlyInAdmin.push(sectionId);
            missingFromFacultyDashboard.push(sectionId);
          }
        }

        if (mismatch && onlyInAdmin.length > 0) {
          summary.onlyInAssignedSections++;
          const sectionNames = adminVisibleSections
            .filter(s => onlyInAdmin.includes(s._id?.toString() || s.toString()))
            .map(s => s.name || 'Unknown');
          
          summary.mismatchDetails.push({
            facultyName: faculty.name,
            facultyId: faculty._id,
            missingFromFacultyDashboard: sectionNames,
            adminVisibleCount: adminVisibleSections.length,
            facultyVisibleCount: facultyVisibleSections.length
          });
        }
      }

      console.log('SUMMARY:');
      console.log('─'.repeat(100));
      console.log(`Total Faculty: ${summary.total}`);
      console.log(`Faculty with mismatches: ${summary.onlyInAssignedSections}`);

      if (summary.mismatchDetails.length > 0) {
        console.log('\n\nMISMATCH DETAILS:');
        console.log('─'.repeat(100));
        for (const detail of summary.mismatchDetails) {
          console.log(`\n${detail.facultyName} (${detail.facultyId})`);
          console.log(`  Admin Dashboard Shows: ${detail.adminVisibleCount} sections`);
          console.log(`  Faculty Dashboard Shows: ${detail.facultyVisibleCount} sections`);
          console.log(`  Missing From Faculty Dashboard:`);
          for (const section of detail.missingFromFacultyDashboard) {
            console.log(`    - ${section}`);
          }
        }
      } else {
        console.log('\n✅ ALL FACULTY HAVE MATCHING SECTIONS BETWEEN ADMIN AND FACULTY DASHBOARDS!');
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
