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
    console.log('📊 DETAILED FACULTY WORKLOAD ANALYSIS\n');
    
    try {
      const faculties = await User.find({ role: 'Faculty' }).populate('assignedSections', 'name');
      
      let detailedAnalysis = [];

      for (const faculty of faculties) {
        const assignedSectionCount = faculty.assignedSections?.length || 0;
        
        if (assignedSectionCount >= 7) {
          const timetables = await Timetable.find({ faculty_id: faculty._id })
            .populate('section_id', 'name')
            .populate('subject_id', 'name');

          const classesPerSection = new Map();
          for (const tt of timetables) {
            const sectionId = tt.section_id?._id?.toString();
            if (sectionId) {
              if (!classesPerSection.has(sectionId)) {
                classesPerSection.set(sectionId, []);
              }
              classesPerSection.get(sectionId).push({
                day: tt.day_of_week,
                time: `${tt.start_time}-${tt.end_time}`,
                subject: tt.subject_id?.name
              });
            }
          }

          detailedAnalysis.push({
            name: faculty.name,
            assignedSections: faculty.assignedSections?.map(s => s.name) || [],
            totalClasses: timetables.length,
            classesPerSection,
            timetableDetails: timetables
          });
        }
      }

      console.log(`Faculty with 7+ assigned sections: ${detailedAnalysis.length}\n`);
      console.log('═'.repeat(140));

      for (const analysis of detailedAnalysis.sort((a, b) => b.assignedSections.length - a.assignedSections.length)) {
        console.log(`\n${analysis.name}`);
        console.log('─'.repeat(140));
        console.log(`  Assigned Sections (${analysis.assignedSections.length}): ${analysis.assignedSections.join(', ')}`);
        console.log(`  Total Classes per Week: ${analysis.totalClasses}`);
        console.log(`  Average Classes per Section: ${(analysis.totalClasses / analysis.assignedSections.length).toFixed(2)}\n`);

        console.log('  Timetable Distribution:');
        for (const tt of analysis.timetableDetails) {
          console.log(`    • ${tt.day_of_week} ${tt.start_time}-${tt.end_time} | Section: ${tt.section_id?.name} | Subject: ${tt.subject_id?.name}`);
        }
      }

      // Summary
      console.log('\n\n' + '═'.repeat(140));
      console.log('📋 SUMMARY\n');

      if (detailedAnalysis.length > 0) {
        const avgClassesPerFaculty = detailedAnalysis.reduce((sum, a) => sum + a.totalClasses, 0) / detailedAnalysis.length;
        const avgSectionsPerFaculty = detailedAnalysis.reduce((sum, a) => sum + a.assignedSections.length, 0) / detailedAnalysis.length;
        
        console.log(`Faculty analyzed: ${detailedAnalysis.length}`);
        console.log(`Average sections assigned: ${avgSectionsPerFaculty.toFixed(2)}`);
        console.log(`Average classes per week: ${avgClassesPerFaculty.toFixed(2)}`);
        console.log(`Average classes per section: ${(avgClassesPerFaculty / avgSectionsPerFaculty).toFixed(2)}`);
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
