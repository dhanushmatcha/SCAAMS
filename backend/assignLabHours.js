const mongoose = require('mongoose');
require('dotenv').config();

const Subject = require('./models/Subject');
const Section = require('./models/Section');
const User = require('./models/User');
const Timetable = require('./models/Timetable');
const Classroom = require('./models/Classroom');
const SectionAssignment = require('./models/SectionAssignment');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB');
    console.log('\n🔬 ASSIGNING LAB HOURS TO FACULTY & TAs...\n');
    
    try {
      // Step 1: Mark subjects that have lab components
      // In engineering, most CS and EC subjects have labs (DSA, DBMS, Logic Design, Signals all have labs)
      console.log('STEP 1: Marking Subjects with Lab Components\n');
      const allSubjects = await Subject.find();
      let labSubjectsMarked = 0;

      for (const subject of allSubjects) {
        // Mark most engineering subjects as having labs (except pure theory subjects)
        const hasLab = subject.name.toLowerCase().includes('lab') || 
                       subject.name.toLowerCase().includes('practical') ||
                       subject.code.toLowerCase().includes('lab') ||
                       // Mark specific subjects known to have labs
                       ['Data Structures', 'Database', 'Logic Design', 'Signals', 'Circuits'].some(
                         keyword => subject.name.includes(keyword)
                       );
        
        if (hasLab && !subject.is_lab) {
          subject.is_lab = true;
          subject.is_lab_only = false; // These are theory + lab
          await subject.save();
          labSubjectsMarked++;
        }
      }

      console.log(`✅ Marked ${labSubjectsMarked} subjects as lab-inclusive subjects\n`);

      // Step 2: Get all lab subjects
      const labSubjects = await Subject.find({ is_lab: true });
      console.log(`STEP 2: Found ${labSubjects.length} lab subjects`);
      if (labSubjects.length > 0) {
        console.log('Lab Subjects:');
        labSubjects.slice(0, 10).forEach(s => console.log(`  - ${s.name} (${s.code})`));
        if (labSubjects.length > 10) console.log(`  ... and ${labSubjects.length - 10} more`);
      }
      console.log('');

      // Step 3: Assign lab hours for each lab subject in each section
      console.log('STEP 3: Assigning Lab Hours\n');

      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const labTimeSlots = [
        { start: '09:00', end: '10:50' }, // 2-hour lab slot
        { start: '11:00', end: '12:50' },
        { start: '13:00', end: '14:50' },
        { start: '15:00', end: '16:50' }
      ];

      const sections = await Section.find();
      let labEntriesCreated = 0;
      const labAssignments = [];

      for (const section of sections) {
        // Get all lab subjects taught in this section
        const labAssignmentsInSection = await SectionAssignment.find({
          section_id: section._id,
          role: 'Teacher'
        }).populate('subject_id').populate('faculty_id');

        for (const assignment of labAssignmentsInSection) {
          if (!assignment.subject_id?.is_lab) continue; // Skip non-lab subjects

          const faculty = assignment.faculty_id;
          if (!faculty) continue;

          // Check if this section already has a lab entry for this subject
          const existingLab = await Timetable.findOne({
            section_id: section._id,
            subject_id: assignment.subject_id._id,
            is_lab_class: true
          });

          if (existingLab) continue; // Lab already assigned

          // Find an available time slot for the lab
          let labSlotFound = false;

          for (const day of daysOfWeek) {
            if (labSlotFound) break;

            for (const timeSlot of labTimeSlots) {
              // Check for conflicts
              const conflict = await Timetable.findOne({
                section_id: section._id,
                lab_day_of_week: day,
                lab_start_time: timeSlot.start,
                is_lab_class: true
              });

              const facultyConflict = await Timetable.findOne({
                lab_faculty_id: faculty._id,
                lab_day_of_week: day,
                lab_start_time: timeSlot.start,
                is_lab_class: true
              });

              if (conflict || facultyConflict) continue;

              // Get or find a lab classroom
              const labClassroom = await Classroom.findOne({ 
                $or: [
                  { room_number: new RegExp('Lab', 'i') },
                  { room_number: new RegExp('Practical', 'i') }
                ]
              });

              if (!labClassroom) continue;

              // Get TAs for this section-subject
              const taAssignments = await SectionAssignment.find({
                section_id: section._id,
                subject_id: assignment.subject_id._id,
                role: 'TA'
              }).populate('faculty_id');

              const taIds = taAssignments.map(ta => ta.faculty_id._id);

              // Create a regular timetable entry but marked as lab
              const labEntry = await Timetable.create({
                section_id: section._id,
                subject_id: assignment.subject_id._id,
                faculty_id: faculty._id,
                classroom_id: labClassroom._id,
                ta_ids: taIds.slice(0, 2), // Max 2 TAs
                day_of_week: day,
                start_time: timeSlot.start,
                end_time: timeSlot.end,
                semester: section.semester,
                academic_year: '2024-2025',
                status: 'Scheduled',
                is_lab_class: true,
                lab_faculty_id: faculty._id,
                lab_ta_ids: taIds.slice(0, 2),
                lab_day_of_week: day,
                lab_start_time: timeSlot.start,
                lab_end_time: timeSlot.end,
                lab_classroom_id: labClassroom._id
              });

              labEntriesCreated++;
              labAssignments.push({
                section: section.name,
                subject: assignment.subject_id.name,
                faculty: faculty.name,
                day: day,
                time: `${timeSlot.start} - ${timeSlot.end}`,
                taCount: taIds.length
              });

              labSlotFound = true;
              break;
            }
          }

          if (!labSlotFound) {
            console.log(`⚠️  Could not find slot for ${faculty.name} - ${assignment.subject_id.name} in ${section.name}`);
          }
        }
      }

      console.log(`✅ Created ${labEntriesCreated} lab hour entries\n`);

      if (labAssignments.length > 0) {
        console.log('LAB ASSIGNMENTS (first 20):');
        console.log('─'.repeat(100));
        for (const assignment of labAssignments.slice(0, 20)) {
          console.log(`✓ ${assignment.section} | ${assignment.subject}`);
          console.log(`  Faculty: ${assignment.faculty}`);
          console.log(`  Time: ${assignment.day} ${assignment.time}`);
          console.log(`  TAs: ${assignment.taCount}`);
          console.log('');
        }
      }

      // Step 4: Verify lab hours constraint (max 2 hours per week per faculty/TA)
      console.log('\nSTEP 4: Verifying Lab Hours Constraint (Max 2 hours/week)\n');

      const faculties = await User.find({ role: 'Faculty' });
      let constraintViolations = 0;

      for (const fac of faculties) {
        const labClasses = await Timetable.find({
          $or: [
            { lab_faculty_id: fac._id, is_lab_class: true },
            { lab_ta_ids: fac._id, is_lab_class: true }
          ]
        });

        const weeklyHours = labClasses.length * 2; // Each lab is 2 hours
        if (weeklyHours > 2) {
          constraintViolations++;
          console.log(`⚠️  ${fac.name}: ${weeklyHours} lab hours/week (exceeds 2 hour limit)`);
        }
      }

      console.log(`\n✅ Constraint violations: ${constraintViolations}`);

      console.log('\n\n📊 SUMMARY:');
      console.log('─'.repeat(100));
      console.log(`Lab Subjects Marked: ${labSubjectsMarked}`);
      console.log(`Lab Hour Entries Created: ${labEntriesCreated}`);
      console.log(`Lab Assignments: ${labAssignments.length}`);
      console.log(`Constraint Violations: ${constraintViolations}`);

      console.log('\n✅ Lab hours assignment completed successfully');
      
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
