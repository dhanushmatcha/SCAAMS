const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const SectionAssignment = require('./models/SectionAssignment');
const Section = require('./models/Section');
const Subject = require('./models/Subject');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB');
    console.log('\n📋 CREATING SECTIONASSIGNMENTS FROM TIMETABLE ENTRIES...\n');
    
    try {
      // Get all unique (faculty, section, subject) combinations from timetable
      const timetables = await Timetable.find().populate('faculty_id').populate('section_id').populate('subject_id');
      
      const assignmentMap = new Map();
      const createdAssignments = [];

      for (const tt of timetables) {
        const key = `${tt.faculty_id?._id}-${tt.section_id?._id}-${tt.subject_id?._id}`;
        
        if (!assignmentMap.has(key) && tt.faculty_id && tt.section_id && tt.subject_id) {
          assignmentMap.set(key, {
            faculty_id: tt.faculty_id._id,
            section_id: tt.section_id._id,
            subject_id: tt.subject_id._id,
            role: 'Teacher'
          });
        }
      }

      console.log(`Found ${assignmentMap.size} unique faculty-section-subject combinations`);
      console.log('\nCreating SectionAssignments...\n');

      for (const [key, data] of assignmentMap.entries()) {
        try {
          // Check if assignment already exists
          const existing = await SectionAssignment.findOne({
            faculty_id: data.faculty_id,
            section_id: data.section_id,
            subject_id: data.subject_id,
            role: data.role
          });

          if (!existing) {
            const assignment = await SectionAssignment.create(data);
            
            // Get faculty and section details for logging
            const faculty = await User.findById(data.faculty_id).select('name email');
            const section = await Section.findById(data.section_id).select('name');
            const subject = await Subject.findById(data.subject_id).select('name');

            createdAssignments.push({
              faculty: faculty?.name,
              section: section?.name,
              subject: subject?.name
            });
          }
        } catch (error) {
          if (error.code !== 11000) {
            console.error(`Error creating assignment: ${error.message}`);
          }
        }
      }

      console.log(`✅ CREATED: ${createdAssignments.length} SectionAssignments\n`);
      
      if (createdAssignments.length > 0) {
        console.log('SAMPLE ASSIGNMENTS (first 20):');
        console.log('─'.repeat(100));
        for (const assignment of createdAssignments.slice(0, 20)) {
          console.log(`✓ ${assignment.faculty} → ${assignment.section} (${assignment.subject})`);
        }
      }

      // Verify the sync
      console.log('\n\n🔍 VERIFYING SYNC...\n');

      const faculties = await User.find({ role: 'Faculty' }).select('name email');
      let perfectSyncCount = 0;

      for (const faculty of faculties) {
        const timetableCount = await Timetable.countDocuments({ faculty_id: faculty._id });
        const assignmentCount = await SectionAssignment.countDocuments({ faculty_id: faculty._id, role: 'Teacher' });

        if (timetableCount > 0 && assignmentCount > 0) {
          perfectSyncCount++;
        }
      }

      console.log(`✅ Faculty with both Timetable and SectionAssignments: ${perfectSyncCount}/${faculties.length}`);
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
