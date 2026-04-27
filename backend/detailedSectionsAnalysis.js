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
    console.log('🔍 DETAILED FACULTY SECTIONS ANALYSIS\n');
    
    try {
      const faculties = await User.find({ role: 'Faculty' });
      
      let details = [];

      for (const faculty of faculties) {
        const adminSections = await User.findById(faculty._id).populate('assignedSections', 'name semester');
        const adminCount = adminSections.assignedSections?.length || 0;

        // What faculty endpoint would return
        let facultySections = [];
        
        // First try: assignedSections
        if (adminCount > 0) {
          facultySections = adminSections.assignedSections;
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
            facultySections = Array.from(uniqueSections.values());
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
            facultySections = Array.from(uniqueAssignments.values());
          }
        }

        if (adminCount > 0) {
          details.push({
            facultyName: faculty.name,
            facultyId: faculty._id,
            adminSectionCount: adminCount,
            facultySectionCount: facultySections.length,
            adminSections: adminSections.assignedSections?.map(s => s.name) || [],
            facultySections: facultySections.map(s => s.name || 'Unknown'),
            match: adminCount === facultySections.length && adminCount > 0
          });
        }
      }

      // Sort by faculty name
      details.sort((a, b) => a.facultyName.localeCompare(b.facultyName));

      console.log('FACULTY WITH ASSIGNED SECTIONS:');
      console.log('─'.repeat(120));
      console.log('Faculty Name                     | Admin Sees | Faculty Sees | Admin Sections                    | Faculty Sections');
      console.log('─'.repeat(120));

      let totalMatches = 0;
      let totalMismatches = 0;

      for (const detail of details) {
        const name = detail.facultyName.padEnd(32);
        const adminCount = String(detail.adminSectionCount).padEnd(10);
        const facultyCount = String(detail.facultySectionCount).padEnd(12);
        const adminSects = detail.adminSections.join(', ').substring(0, 32).padEnd(32);
        const facultySects = detail.facultySections.join(', ').substring(0, 40);
        const status = detail.match ? '✅' : '❌';

        console.log(`${name} | ${adminCount} | ${facultyCount} | ${adminSects} | ${facultySects} ${status}`);

        if (detail.match) {
          totalMatches++;
        } else {
          totalMismatches++;
        }
      }

      console.log('─'.repeat(120));
      console.log(`\nTotal Faculty with Assignments: ${details.length}`);
      console.log(`Matching: ${totalMatches}`);
      console.log(`Mismatching: ${totalMismatches}`);

      if (totalMismatches === 0) {
        console.log('\n✅ ALL SECTIONS ARE PROPERLY SYNCHRONIZED!');
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
