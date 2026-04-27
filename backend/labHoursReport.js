const mongoose = require('mongoose');
require('dotenv').config();

const Timetable = require('./models/Timetable');
const Section = require('./models/Section');
const Subject = require('./models/Subject');
const Classroom = require('./models/Classroom');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB');
    console.log('\n📋 LAB HOURS ASSIGNMENT REPORT\n');
    
    try {
      const labClasses = await Timetable.find({ is_lab_class: true })
        .populate('section_id', 'name')
        .populate('subject_id', 'name')
        .populate('lab_faculty_id', 'name email')
        .populate('lab_ta_ids', 'name')
        .populate('lab_classroom_id', 'room_number')
        .sort({ lab_day_of_week: 1, lab_start_time: 1 });

      console.log(`Total Lab Hours Assigned: ${labClasses.length} (${labClasses.length * 2} hours)\n`);

      if (labClasses.length > 0) {
        console.log('LAB ASSIGNMENTS:');
        console.log('─'.repeat(120));
        console.log(
          'Section      | Subject                      | Faculty                  | Day        | Time         | Room   | TAs'
        );
        console.log('─'.repeat(120));

        for (const lab of labClasses) {
          const section = (lab.section_id?.name || 'N/A').padEnd(12);
          const subject = (lab.subject_id?.name || 'N/A').substring(0, 28).padEnd(28);
          const faculty = (lab.lab_faculty_id?.name || 'N/A').substring(0, 24).padEnd(24);
          const day = (lab.lab_day_of_week || 'N/A').padEnd(10);
          const time = `${lab.lab_start_time}-${lab.lab_end_time}`.padEnd(12);
          const room = (lab.lab_classroom_id?.room_number || 'N/A').padEnd(6);
          const tas = (lab.lab_ta_ids?.length || 0);

          console.log(`${section} | ${subject} | ${faculty} | ${day} | ${time} | ${room} | ${tas}`);
        }
      }

      // Summary by faculty
      console.log('\n\n📊 SUMMARY BY FACULTY:');
      console.log('─'.repeat(120));

      const facultyLabMap = {};
      for (const lab of labClasses) {
        const facultyName = lab.lab_faculty_id?.name || 'Unknown';
        if (!facultyLabMap[facultyName]) {
          facultyLabMap[facultyName] = {
            count: 0,
            subjects: [],
            sections: []
          };
        }
        facultyLabMap[facultyName].count++;
        facultyLabMap[facultyName].subjects.push(lab.subject_id?.name);
        facultyLabMap[facultyName].sections.push(lab.section_id?.name);
      }

      const facultyEntries = Object.entries(facultyLabMap).sort((a, b) => b[1].count - a[1].count);

      console.log('Faculty Name                     | Labs | Hours | Subjects                          | Sections');
      console.log('─'.repeat(120));

      for (const [faculty, data] of facultyEntries) {
        const name = faculty.padEnd(32);
        const labs = String(data.count).padEnd(5);
        const hours = String(data.count * 2).padEnd(6);
        const subjects = data.subjects.join(', ').substring(0, 33).padEnd(33);
        const sections = data.sections.join(', ');

        console.log(`${name} | ${labs} | ${hours} | ${subjects} | ${sections}`);
      }

      // Summary by subject
      console.log('\n\n📚 SUMMARY BY SUBJECT:');
      console.log('─'.repeat(100));

      const subjectLabMap = {};
      for (const lab of labClasses) {
        const subjectName = lab.subject_id?.name || 'Unknown';
        if (!subjectLabMap[subjectName]) {
          subjectLabMap[subjectName] = {
            count: 0,
            faculties: new Set(),
            sections: new Set()
          };
        }
        subjectLabMap[subjectName].count++;
        subjectLabMap[subjectName].faculties.add(lab.lab_faculty_id?.name);
        subjectLabMap[subjectName].sections.add(lab.section_id?.name);
      }

      const subjectEntries = Object.entries(subjectLabMap).sort((a, b) => b[1].count - a[1].count);

      console.log('Subject                          | Labs | Hours | Faculty Count | Section Count');
      console.log('─'.repeat(100));

      for (const [subject, data] of subjectEntries) {
        const name = subject.padEnd(32);
        const labs = String(data.count).padEnd(5);
        const hours = String(data.count * 2).padEnd(6);
        const facCount = String(data.faculties.size).padEnd(13);
        const secCount = String(data.sections.size);

        console.log(`${name} | ${labs} | ${hours} | ${facCount} | ${secCount}`);
      }

      console.log('\n\n✅ Lab hours assignment report completed');
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }

    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
