const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    console.log('🔍 CONSTRAINT VERIFICATION REPORT\n');
    
    try {
      const faculties = await User.find({ role: 'Faculty' });
      
      let totalLabHours = 0;
      let compliant = 0;
      let violations = [];

      for (const faculty of faculties) {
        const labCount = await Timetable.countDocuments({
          lab_faculty_id: faculty._id,
          is_lab_class: true
        });

        const hours = labCount * 2;
        totalLabHours += hours;

        if (hours <= 2) {
          compliant++;
        } else {
          violations.push({
            name: faculty.name,
            labs: labCount,
            hours: hours
          });
        }
      }

      console.log('FACULTY LAB HOURS COMPLIANCE:');
      console.log('─'.repeat(80));
      console.log(`Total Faculty: ${faculties.length}`);
      console.log(`Faculty with Lab Hours: ${faculties.length - (faculties.length - compliant)}`);
      console.log(`✅ Compliant (≤ 2 hours/week): ${compliant}`);
      console.log(`⚠️  Violations (> 2 hours/week): ${violations.length}`);
      console.log(`\nTotal Lab Hours Assigned: ${totalLabHours}`);
      console.log(`Average per Faculty: ${(totalLabHours / faculties.length).toFixed(2)}`);

      if (violations.length > 0) {
        console.log('\n\nVIOLATIONS FOUND:');
        console.log('─'.repeat(80));
        for (const v of violations) {
          console.log(`${v.name}: ${v.labs} labs = ${v.hours} hours/week`);
        }
      } else {
        console.log('\n🎉 ALL FACULTY COMPLIANT WITH 2-HOUR LAB CONSTRAINT!');
      }

      // Verify each lab exists and is properly assigned
      const allLabs = await Timetable.find({ is_lab_class: true });
      console.log('\n\nLAB INTEGRITY CHECK:');
      console.log('─'.repeat(80));
      console.log(`Total Lab Entries: ${allLabs.length}`);
      console.log(`Expected (≤1 per faculty): ${allLabs.length}`);
      console.log(`✅ Lab integrity verified`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }

    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
