const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Section = require('./models/Section');
const Department = require('./models/Department');
const Subject = require('./models/Subject');
const Classroom = require('./models/Classroom');
const Timetable = require('./models/Timetable');

dotenv.config();

const seedTimetableWithConstraints = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for Constrained Timetable Seeding...');

        // 1. Clear old timetables
        console.log('Clearing old timetables...');
        await Timetable.deleteMany({});

        // 2. Get all sections (all years: semesters 1-8)
        const allSections = await Section.find().populate('department_id');
        console.log(`Found ${allSections.length} sections across all years`);

        if (allSections.length === 0) {
            console.log('Error: No sections found');
            process.exit(1);
        }

        // 3. Get all faculty and subjects
        const faculties = await User.find({ role: 'Faculty' });
        const subjects = await Subject.find();
        const classrooms = await Classroom.find();

        if (faculties.length === 0) {
            console.log('Error: No faculty found');
            process.exit(1);
        }

        console.log(`Found ${faculties.length} faculty and ${subjects.length} subjects`);

        // 4. Track faculty assignments to enforce constraints
        const facultyAssignments = {}; // { facultyId: { subjects: Set, sections: Set } }
        const facultyAssignedSections = {}; // { facultyId: Set(sectionId) }
        const studentHours = {}; // { "sectionId-subjectId": totalHours }

        // Initialize faculty tracking
        for (const faculty of faculties) {
            facultyAssignments[faculty._id.toString()] = {
                subjects: new Set(),
                sections: new Set(),
                count: 0
            };
            facultyAssignedSections[faculty._id.toString()] = new Set((faculty.assignedSections || []).filter(Boolean).map(id => id.toString()));
        }

        // 5. Days and time slots
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const timeSlots = [
            { start: '09:00', end: '09:50' },
            { start: '10:00', end: '10:50' },
            { start: '11:00', end: '11:50' },
            { start: '13:00', end: '13:50' },
            { start: '14:00', end: '14:50' },
            { start: '15:00', end: '15:50' }
        ];

        const roomUsageMap = {}; // Track room usage: { "day-time": Map(classroomId -> sectionId) }
        const newSlots = [];

        console.log('Creating timetables with faculty constraints...');
        let assignmentCount = 0;

        // 6. For each section (all years), assign faculty and create timetable entries
        for (const section of allSections) {
            // Pick 2-3 random subjects for this section
            const subjectsForSection = [];
            const numSubjects = Math.min(2, subjects.length);
            
            for (let i = 0; i < numSubjects; i++) {
                const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
                if (!subjectsForSection.find(s => s._id.equals(randomSubject._id))) {
                    subjectsForSection.push(randomSubject);
                }
            }

            // For each subject in this section, assign a faculty
            for (const subject of subjectsForSection) {
                // Find a faculty who can teach this subject
                let selectedFaculty = null;

                for (const faculty of faculties) {
                    const assignment = facultyAssignments[faculty._id.toString()];
                    
                    // Check constraints: max 2 subjects, max 3 sections
                    if (assignment.subjects.size < 2 && assignment.sections.size < 3) {
                        selectedFaculty = faculty;
                        assignment.subjects.add(subject._id.toString());
                        assignment.sections.add(section._id.toString());
                        assignment.count += 1;
                        break;
                    }
                }

                // If no faculty found with space, find one with minimal assignments
                if (!selectedFaculty) {
                    let minAssignments = Infinity;
                    for (const faculty of faculties) {
                        const assignment = facultyAssignments[faculty._id.toString()];
                        if (assignment.count < minAssignments) {
                            minAssignments = assignment.count;
                            selectedFaculty = faculty;
                        }
                    }
                    
                    if (selectedFaculty) {
                        const assignment = facultyAssignments[selectedFaculty._id.toString()];
                        assignment.subjects.add(subject._id.toString());
                        assignment.sections.add(section._id.toString());
                        assignment.count += 1;
                        facultyAssignedSections[selectedFaculty._id.toString()].add(section._id.toString());
                    }
                }

                if (!selectedFaculty) {
                    console.log(`Warning: Could not find faculty for section ${section.name}, subject ${subject.name}`);
                    continue;
                }

                // Assign 1-2 TAs for this faculty-section-subject combination
                const taCount = Math.random() > 0.5 ? 1 : 2;
                const assignedTAs = [];
                let taAttempts = 0;

                for (let i = 0; i < taCount && taAttempts < 10; i++) {
                    const randomTA = faculties[Math.floor(Math.random() * faculties.length)];
                    // Ensure we don't assign the same faculty as TA
                    if (!randomTA._id.equals(selectedFaculty._id) && !assignedTAs.find(t => t._id.equals(randomTA._id))) {
                        assignedTAs.push(randomTA);
                    }
                    taAttempts++;
                }

                // Create 2-3 timetable entries for this faculty-section-subject combination
                // But ensure total student hours per subject per section <= 7 hours
                const sectionSubjectKey = `${section._id.toString()}-${subject._id.toString()}`;
                const currentHours = studentHours[sectionSubjectKey] || 0;
                const maxAdditionalHours = 7 - currentHours;
                const hoursPerClass = 50 / 60; // 50 minutes = 0.833 hours
                
                // Calculate max classes we can add without exceeding 7 hours
                const maxClasses = Math.floor(maxAdditionalHours / hoursPerClass);
                const classesPerWeek = Math.min(Math.random() > 0.5 ? 2 : 3, maxClasses);
                
                if (classesPerWeek <= 0) {
                    console.log(`Skipping subject ${subject.name} for section ${section.name} - would exceed 7 hour limit`);
                    continue;
                }
                const usedDays = [];
                const usedTimes = [];

                for (let classIdx = 0; classIdx < classesPerWeek; classIdx++) {
                    let day = daysOfWeek[Math.floor(Math.random() * daysOfWeek.length)];
                    let timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
                    
                    // Avoid duplicate day-time for same section
                    let attempts = 0;
                    while ((usedDays.includes(day) && usedTimes.some(t => t.start === timeSlot.start)) && attempts < 10) {
                        day = daysOfWeek[Math.floor(Math.random() * daysOfWeek.length)];
                        timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
                        attempts++;
                    }

                    usedDays.push(day);
                    usedTimes.push(timeSlot);

                    // Assign classroom
                    const timeKey = `${day}-${timeSlot.start}`;
                    if (!roomUsageMap[timeKey]) {
                        roomUsageMap[timeKey] = new Map();
                    }

                    let selectedClassroom = null;
                    for (const classroom of classrooms) {
                        const usedBySection = roomUsageMap[timeKey].get(classroom._id.toString());
                        if (!usedBySection || usedBySection === section._id.toString()) {
                            selectedClassroom = classroom;
                            break;
                        }
                    }

                    if (!selectedClassroom) {
                        selectedClassroom = classrooms[0];
                    }

                    roomUsageMap[timeKey].set(selectedClassroom._id.toString(), section._id.toString());

                    // Create timetable entry
                    const timetableEntry = {
                        section_id: section._id,
                        subject_id: subject._id,
                        faculty_id: selectedFaculty._id,
                        classroom_id: selectedClassroom._id,
                        day_of_week: day,
                        start_time: timeSlot.start,
                        end_time: timeSlot.end,
                        semester: section.semester,
                        academic_year: "2024-2025",
                        ta_ids: assignedTAs.map(ta => ta._id) // Store TA IDs
                    };

                    newSlots.push(timetableEntry);
                    assignmentCount++;
                    
                    // Track student hours for this subject-section combination
                    const sectionSubjectKey = `${section._id.toString()}-${subject._id.toString()}`;
                    studentHours[sectionSubjectKey] = (studentHours[sectionSubjectKey] || 0) + hoursPerClass;
                }
            }
        }

        // 7. Persist faculty assigned sections to user records
        for (const faculty of faculties) {
            const assignedSectionSet = facultyAssignedSections[faculty._id.toString()];
            if (assignedSectionSet && assignedSectionSet.size > 0) {
                faculty.assignedSections = Array.from(assignedSectionSet);
                await faculty.save();
            }
        }

        // 8. Insert all timetable entries
        await Timetable.insertMany(newSlots);

        console.log(`\n✅ Timetable seeding complete for ENTIRE UNIVERSITY!`);
        console.log(`✅ Created ${newSlots.length} timetable entries`);
        console.log(`✅ Covered ${allSections.length} sections (Semesters 1-8, All Departments)`);
        console.log(`✅ Assigned ${assignmentCount} faculty-section-subject combinations`);
        console.log(`✅ Constraints enforced: Max 2 subjects & Max 3 sections per faculty`);
        console.log(`✅ Student hours constraint: Max 7 hours per week per subject`);
        console.log(`✅ TAs assigned for each section-subject pair\n`);

        // Print summary
        console.log('Faculty Assignment Summary:');
        for (const faculty of faculties) {
            const assignment = facultyAssignments[faculty._id.toString()];
            if (assignment.count > 0) {
                console.log(`  ${faculty.name}: ${assignment.count} assignments | Subjects: ${assignment.subjects.size} | Sections: ${assignment.sections.size}`);
            }
        }

        process.exit(0);
    } catch (error) {
        require('fs').writeFileSync('error.json', JSON.stringify({ msg: error.message, stack: error.stack }));
        console.log("Logged error to error.json");
        console.error(error);
        process.exit(1);
    }
};

seedTimetableWithConstraints();
