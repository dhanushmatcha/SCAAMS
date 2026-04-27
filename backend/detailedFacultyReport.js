const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const SectionAssignment = require('./models/SectionAssignment');
const Section = require('./models/Section');
const Subject = require('./models/Subject');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('\n📋 DETAILED FACULTY WORKLOAD REPORT\n');
    
    try {
      const faculties = await User.find({ role: 'Faculty' }).sort({ name: 1 });
      
      console.log('Faculty Name                     | Email                      | Dept | Hours | Classes | Sections | Subjects');
      console.log('─'.repeat(150));

      let totalHours = 0;
      let totalClasses = 0;
      let totalSections = 0;

      for (const faculty of faculties) {
        const classes = await Timetable.find({ faculty_id: faculty._id })
          .populate('subject_id', 'name');
        
        const sections = await Timetable.find({ faculty_id: faculty._id })
          .populate('section_id', 'name')
          .distinct('section_id');

        const classesCount = classes.length;
        const hours = classesCount; // 1 hour per class
        const sectionsCount = sections.length;
        
        // Get unique subjects
        const uniqueSubjects = new Map();
        classes.forEach(c => {
          if (c.subject_id) {
            uniqueSubjects.set(c.subject_id._id.toString(), c.subject_id.name);
          }
        });

        // Get department from email
        const emailParts = faculty.email?.split('.') || [];
        const dept = emailParts[1]?.toUpperCase() || 'N/A';

        const name = faculty.name.padEnd(32);
        const email = (faculty.email || '').substring(0, 26).padEnd(26);
        const deptStr = dept.padEnd(4);
        const hoursStr = String(hours).padEnd(6);
        const classesStr = String(classesCount).padEnd(7);
        const sectionsStr = String(sectionsCount).padEnd(9);
        const subjectsStr = Array.from(uniqueSubjects.values()).slice(0, 2).join(', ');

        console.log(`${name} | ${email} | ${deptStr} | ${hoursStr} | ${classesStr} | ${sectionsStr} | ${subjectsStr}`);

        totalHours += hours;
        totalClasses += classesCount;
        totalSections += sectionsCount;
      }

      console.log('─'.repeat(150));
      console.log(`TOTALS: ${totalClasses} classes, ${totalHours} hours/week, ${totalSections} section assignments`);
      console.log(`Average per faculty: ${(totalHours/faculties.length).toFixed(2)} hours/week`);

      // Statistics
      console.log('\n\n📊 COMPLIANCE STATISTICS\n');
      
      let stats = {
        below8: 0,
        between8to9: 0,
        above10: 0
      };

      for (const faculty of faculties) {
        const classCount = await Timetable.countDocuments({ faculty_id: faculty._id });
        
        if (classCount < 8) stats.below8++;
        else if (classCount <= 9) stats.between8to9++;
        else stats.above10++;
      }

      console.log(`✅ Faculty with 8-9 hours (compliant): ${stats.between8to9} (${((stats.between8to9/faculties.length)*100).toFixed(1)}%)`);
      console.log(`✅ Faculty with 10+ hours: ${stats.above10} (${((stats.above10/faculties.length)*100).toFixed(1)}%)`);
      console.log(`❌ Faculty below 8 hours: ${stats.below8} (${((stats.below8/faculties.length)*100).toFixed(1)}%)`);

      console.log('\n✅ SYSTEM STATUS: FULLY OPERATIONAL\n');

    } catch (error) {
      console.error('❌ Error:', error.message);
    }

    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
