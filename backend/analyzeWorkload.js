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
    console.log('📊 FACULTY WORKLOAD ANALYSIS\n');
    
    try {
      const faculties = await User.find({ role: 'Faculty' });
      let workloadAnalysis = [];

      for (const faculty of faculties) {
        // Get timetable entries (each entry is 1 hour typically, some are 2 hours for double periods)
        const timetableEntries = await Timetable.find({ faculty_id: faculty._id });
        
        // Calculate hours per week (assuming each entry is 50 min ≈ 1 hour)
        let hoursPerWeek = 0;
        for (const entry of timetableEntries) {
          // Parse times like "09:00" and "09:50"
          const startTime = entry.start_time ? parseInt(entry.start_time.split(':')[0]) : 9;
          const endTime = entry.end_time ? parseInt(entry.end_time.split(':')[0]) : 10;
          const durationHours = (endTime - startTime) + 
            (entry.end_time?.split(':')[1] === '50' && entry.start_time?.split(':')[1] === '00' ? 0 : 0);
          hoursPerWeek += 1; // Assume 1 hour per slot
        }

        // Get assigned sections count
        const assignedSections = faculty.assignedSections?.length || 0;

        // Check if TA
        const taAssignments = await SectionAssignment.countDocuments({ faculty_id: faculty._id, role: 'TA' });

        workloadAnalysis.push({
          name: faculty.name,
          email: faculty.email,
          role: faculty.role,
          isTa: taAssignments > 0,
          isHod: faculty.isHod || false,
          classesPerWeek: timetableEntries.length,
          hoursPerWeek,
          assignedSections,
          timetableEntries: timetableEntries.length,
          taAssignments
        });
      }

      // Sort by hours per week
      workloadAnalysis.sort((a, b) => a.hoursPerWeek - b.hoursPerWeek);

      console.log('WORKLOAD SUMMARY:');
      console.log('─'.repeat(140));
      console.log('Faculty Name                     | Email                      | Classes | Hours/Week | Sections | TA Roles | HOD  | Status');
      console.log('─'.repeat(140));

      let unassignedCount = 0;
      let belowMinimum = [];

      for (const faculty of workloadAnalysis) {
        const name = faculty.name.padEnd(32);
        const email = (faculty.email || '').substring(0, 26).padEnd(26);
        const classes = String(faculty.classesPerWeek).padEnd(7);
        const hours = String(faculty.hoursPerWeek).padEnd(10);
        const sections = String(faculty.assignedSections).padEnd(8);
        const ta = String(faculty.taAssignments).padEnd(8);
        const hod = (faculty.isHod ? 'YES' : 'NO').padEnd(4);

        let status = '';
        if (faculty.assignedSections === 0) {
          status = '❌ NO SECTIONS';
          unassignedCount++;
        } else if (faculty.isTa && faculty.hoursPerWeek < 10) {
          status = `⚠️  TA: Below 10h (${faculty.hoursPerWeek}h)`;
          belowMinimum.push({ name: faculty.name, current: faculty.hoursPerWeek, target: 10 });
        } else if (!faculty.isHod && faculty.hoursPerWeek < 8) {
          status = `⚠️  Below 8h (${faculty.hoursPerWeek}h)`;
          belowMinimum.push({ name: faculty.name, current: faculty.hoursPerWeek, target: 8 });
        } else {
          status = '✅ OK';
        }

        console.log(`${name} | ${email} | ${classes} | ${hours} | ${sections} | ${ta} | ${hod} | ${status}`);
      }

      console.log('─'.repeat(140));
      console.log(`\nSUMMARY:`);
      console.log(`Total Faculty: ${faculties.length}`);
      console.log(`Faculty without sections: ${unassignedCount}`);
      console.log(`Faculty below minimum hours: ${belowMinimum.length}`);
      console.log(`Faculty with adequate workload: ${faculties.length - unassignedCount - belowMinimum.length}`);

      if (unassignedCount > 0) {
        console.log('\n❌ FACULTY WITHOUT ASSIGNED SECTIONS:');
        console.log('─'.repeat(140));
        for (const faculty of workloadAnalysis) {
          if (faculty.assignedSections === 0) {
            console.log(`${faculty.name} (${faculty.email})`);
          }
        }
      }

      if (belowMinimum.length > 0) {
        console.log('\n⚠️  FACULTY BELOW MINIMUM WORKLOAD:');
        console.log('─'.repeat(140));
        for (const faculty of belowMinimum) {
          console.log(`${faculty.name}: ${faculty.current}h/week (needs ${faculty.target}h)`);
        }
      }

      console.log('\n\n📋 AVAILABLE SECTIONS FOR ASSIGNMENT:');
      console.log('─'.repeat(140));
      const allSections = await Section.find().populate('department_id', 'name');
      for (const section of allSections) {
        const assignmentCount = await SectionAssignment.countDocuments({ section_id: section._id, role: 'Teacher' });
        const faculty = workloadAnalysis.find(f => f.assignedSections > 0);
        console.log(`${section.name} (${section.department_id?.name || 'N/A'}): ${assignmentCount} faculty assigned`);
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
