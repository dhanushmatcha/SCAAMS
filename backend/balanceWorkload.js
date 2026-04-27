const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const SectionAssignment = require('./models/SectionAssignment');
const Section = require('./models/Section');
const Subject = require('./models/Subject');
const Classroom = require('./models/Classroom');
const Department = require('./models/Department');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    console.log('🚀 COMPREHENSIVE WORKLOAD BALANCING & TIMETABLE GENERATION\n');
    
    try {
      const MINIMUM_HOURS = 8;
      const MINIMUM_HOURS_TA = 10;
      const HOURS_PER_CLASS = 1; // Each class slot = 1 hour

      const faculties = await User.find({ role: 'Faculty' });
      const allSections = await Section.find().populate('department_id');
      const subjects = await Subject.find();
      const classrooms = await Classroom.find();

      if (classrooms.length === 0) {
        console.error('❌ No classrooms found. Please create classrooms first.');
        mongoose.connection.close();
        return;
      }

      // Time slots
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const timeSlots = [
        { start: '09:00', end: '09:50' },
        { start: '10:00', end: '10:50' },
        { start: '11:00', end: '11:50' },
        { start: '13:00', end: '13:50' },
        { start: '14:00', end: '14:50' },
        { start: '15:00', end: '15:50' }
      ];

      // Get current workload for all faculty
      const facultyWorkload = new Map();
      for (const faculty of faculties) {
        const timetableCount = await Timetable.countDocuments({ faculty_id: faculty._id });
        const taAssignmentCount = await SectionAssignment.countDocuments({ 
          faculty_id: faculty._id, 
          role: 'TA' 
        });
        const assignedSectionsCount = faculty.assignedSections?.length || 0;

        facultyWorkload.set(faculty._id.toString(), {
          faculty,
          currentClasses: timetableCount,
          currentHours: timetableCount * HOURS_PER_CLASS,
          isTa: taAssignmentCount > 0,
          isHod: faculty.isHod || false,
          assignedSections: assignedSectionsCount,
          needsMoreWork: timetableCount === 0
        });
      }

      // Get unassigned faculty
      const unassignedFaculty = Array.from(facultyWorkload.values())
        .filter(fw => fw.needsMoreWork && !fw.isHod)
        .sort((a, b) => a.faculty.name.localeCompare(b.faculty.name));

      console.log(`\n📋 UNASSIGNED FACULTY: ${unassignedFaculty.length}/107`);
      console.log('─'.repeat(100));
      unassignedFaculty.slice(0, 10).forEach(fw => {
        console.log(`  • ${fw.faculty.name} (${fw.faculty.email})`);
      });
      if (unassignedFaculty.length > 10) {
        console.log(`  ... and ${unassignedFaculty.length - 10} more`);
      }

      // Strategy 1: Assign sections to unassigned faculty
      console.log(`\n\n📌 PHASE 1: ASSIGNING SECTIONS TO UNASSIGNED FACULTY`);
      console.log('─'.repeat(100));

      let sectionsAssigned = 0;
      let assignmentsFailed = [];

      for (const unassigned of unassignedFaculty) {
        // Find a section in their department that needs faculty
        const availableSections = allSections.filter(s => {
          const dept = s.department_id?.code || '';
          const facultyDept = unassigned.faculty.email?.split('.')[1] || '';
          
          // Match department
          return dept.toLowerCase().includes(facultyDept.toLowerCase()) || 
                 facultyDept.toLowerCase().includes(dept.toLowerCase());
        });

        if (availableSections.length > 0) {
          // Pick a section with fewer faculty
          const section = availableSections[0];
          
          // Create timetable entries (start with 2 classes per week)
          const newEntries = [];
          let slotsUsed = 0;
          const maxSlots = 2; // 2 classes per week initially

          for (const day of daysOfWeek) {
            if (slotsUsed >= maxSlots) break;
            
            for (const slot of timeSlots) {
              if (slotsUsed >= maxSlots) break;

              // Check if slot is available
              const conflictCount = await Timetable.countDocuments({
                faculty_id: unassigned.faculty._id,
                day_of_week: day,
                start_time: slot.start
              });

              if (conflictCount === 0) {
                const subject = subjects[Math.floor(Math.random() * subjects.length)];
                const classroom = classrooms[Math.floor(Math.random() * classrooms.length)];

                newEntries.push({
                  section_id: section._id,
                  subject_id: subject._id,
                  faculty_id: unassigned.faculty._id,
                  classroom_id: classroom._id,
                  day_of_week: day,
                  start_time: slot.start,
                  end_time: slot.end,
                  semester: section.semester,
                  academic_year: '2024-2025',
                  status: 'Scheduled'
                });

                slotsUsed++;
              }
            }
          }

          if (newEntries.length > 0) {
            await Timetable.insertMany(newEntries);
            
            // Add to assignedSections
            if (!unassigned.faculty.assignedSections.includes(section._id)) {
              unassigned.faculty.assignedSections.push(section._id);
              await unassigned.faculty.save();
            }

            sectionsAssigned += newEntries.length;
          } else {
            assignmentsFailed.push(unassigned.faculty.name);
          }
        } else {
          assignmentsFailed.push(unassigned.faculty.name);
        }
      }

      console.log(`✅ Timetable entries created for unassigned faculty: ${sectionsAssigned}`);
      if (assignmentsFailed.length > 0) {
        console.log(`⚠️  Failed to assign: ${assignmentsFailed.slice(0, 5).join(', ')}${assignmentsFailed.length > 5 ? ` ... and ${assignmentsFailed.length - 5} more` : ''}`);
      }

      // Strategy 2: Boost faculty below minimum hours
      console.log(`\n\n📌 PHASE 2: BOOSTING FACULTY BELOW MINIMUM HOURS`);
      console.log('─'.repeat(100));

      let hoursAdded = 0;
      const belowMinimum = Array.from(facultyWorkload.values())
        .filter(fw => {
          const minHours = fw.isTa ? MINIMUM_HOURS_TA : (fw.isHod ? 0 : MINIMUM_HOURS);
          return fw.currentHours < minHours && !fw.needsMoreWork;
        })
        .sort((a, b) => a.currentHours - b.currentHours);

      for (const underloaded of belowMinimum) {
        const minHours = underloaded.isTa ? MINIMUM_HOURS_TA : MINIMUM_HOURS;
        const hoursNeeded = minHours - underloaded.currentHours;
        const classesNeeded = Math.ceil(hoursNeeded / HOURS_PER_CLASS);

        let classesAdded = 0;
        const newEntries = [];

        for (const day of daysOfWeek) {
          if (classesAdded >= classesNeeded) break;

          for (const slot of timeSlots) {
            if (classesAdded >= classesNeeded) break;

            // Check conflict
            const conflictCount = await Timetable.countDocuments({
              faculty_id: underloaded.faculty._id,
              day_of_week: day,
              start_time: slot.start
            });

            if (conflictCount === 0) {
              // Find a section this faculty doesn't have
              const facultyAssigned = underloaded.faculty.assignedSections || [];
              const section = allSections.find(s => !facultyAssigned.includes(s._id));

              if (section) {
                const subject = subjects[Math.floor(Math.random() * subjects.length)];
                const classroom = classrooms[Math.floor(Math.random() * classrooms.length)];

                newEntries.push({
                  section_id: section._id,
                  subject_id: subject._id,
                  faculty_id: underloaded.faculty._id,
                  classroom_id: classroom._id,
                  day_of_week: day,
                  start_time: slot.start,
                  end_time: slot.end,
                  semester: section.semester,
                  academic_year: '2024-2025',
                  status: 'Scheduled'
                });

                classesAdded++;
              }
            }
          }
        }

        if (newEntries.length > 0) {
          await Timetable.insertMany(newEntries);
          hoursAdded += newEntries.length;

          // Update assignedSections
          const newSectionIds = [...new Set(newEntries.map(e => e.section_id.toString()))];
          for (const sectionId of newSectionIds) {
            if (!underloaded.faculty.assignedSections.includes(sectionId)) {
              underloaded.faculty.assignedSections.push(sectionId);
            }
          }
          await underloaded.faculty.save();
        }
      }

      console.log(`✅ Hours added to underloaded faculty: ${hoursAdded}`);

      // Verification
      console.log(`\n\n✅ FINAL VERIFICATION`);
      console.log('─'.repeat(100));

      let finalStats = {
        totalFaculty: faculties.length,
        nowAssigned: 0,
        withMinimumHours: 0,
        violations: []
      };

      for (const faculty of faculties) {
        const timetableCount = await Timetable.countDocuments({ faculty_id: faculty._id });
        const hours = timetableCount * HOURS_PER_CLASS;
        const isTa = await SectionAssignment.countDocuments({ 
          faculty_id: faculty._id, 
          role: 'TA' 
        }) > 0;
        const isHod = faculty.isHod || false;

        if (timetableCount > 0) finalStats.nowAssigned++;

        const minHours = isTa ? MINIMUM_HOURS_TA : (isHod ? 0 : MINIMUM_HOURS);
        if (hours >= minHours) {
          finalStats.withMinimumHours++;
        } else if (!isHod && timetableCount > 0) {
          finalStats.violations.push({
            name: faculty.name,
            currentHours: hours,
            minimumRequired: minHours,
            type: isTa ? 'TA' : 'Faculty'
          });
        }
      }

      console.log(`Total Faculty: ${finalStats.totalFaculty}`);
      console.log(`Faculty now assigned: ${finalStats.nowAssigned}`);
      console.log(`Faculty with minimum hours: ${finalStats.withMinimumHours}`);
      
      if (finalStats.violations.length > 0) {
        console.log(`\n⚠️  Remaining violations: ${finalStats.violations.length}`);
        finalStats.violations.slice(0, 10).forEach(v => {
          console.log(`  ${v.name}: ${v.currentHours}h (needs ${v.minimumRequired}h) [${v.type}]`);
        });
      } else {
        console.log(`\n🎉 ALL CONSTRAINTS MET!`);
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
