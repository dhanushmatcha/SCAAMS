const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Section = require('./models/Section');
const Department = require('./models/Department');
const Subject = require('./models/Subject');
const Classroom = require('./models/Classroom');
const Timetable = require('./models/Timetable');

dotenv.config();

const seedTimetable = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for Timetable Seeding...');

        // 1. Ensure Classrooms - Multiple Blocks with Different Room Types
        console.log('Clearing old classrooms and recreating...');
        await Classroom.deleteMany({});
        let classrooms = await Classroom.insertMany([
            // ========== A BLOCK (CSE & General) ==========
            { room_number: 'A-101', capacity: 80, features: ['Projector', 'AC', 'Whiteboard'] },
            { room_number: 'A-102', capacity: 80, features: ['Projector', 'AC', 'Smartboard'] },
            { room_number: 'A-103', capacity: 60, features: ['Projector', 'AC'] },
            { room_number: 'A-104', capacity: 60, features: ['Projector', 'AC'] },
            { room_number: 'A-Sem-1', capacity: 120, features: ['Projector', 'AC', 'Auditorium', 'Video Conference'] },
            { room_number: 'A-Lab-CSE-1', capacity: 45, features: ['Computers', 'AC', 'High Speed Internet', 'Software'] },
            { room_number: 'A-Lab-CSE-2', capacity: 45, features: ['Computers', 'AC', 'High Speed Internet', 'Software'] },

            // ========== N BLOCK (ECE & EEE) ==========
            { room_number: 'N-101', capacity: 80, features: ['Projector', 'AC', 'Whiteboard'] },
            { room_number: 'N-102', capacity: 80, features: ['Projector', 'AC', 'Smartboard'] },
            { room_number: 'N-103', capacity: 60, features: ['Projector', 'AC'] },
            { room_number: 'N-Sem-1', capacity: 120, features: ['Projector', 'AC', 'Auditorium', 'Video Conference'] },
            { room_number: 'N-Lab-Electronics', capacity: 50, features: ['Oscilloscope', 'Power Supply', 'Multimeter', 'AC', 'Testing Equipment'] },
            { room_number: 'N-Lab-Electrical', capacity: 50, features: ['Electrical Equipment', 'AC', 'Safety Devices', 'Testing Lab'] },
            { room_number: 'N-Lab-Circuits', capacity: 50, features: ['Circuit Board', 'Components', 'AC', 'Soldering Station'] },

            // ========== H BLOCK (Mechanical & General) ==========
            { room_number: 'H-301', capacity: 80, features: ['Projector', 'AC', 'Whiteboard'] },
            { room_number: 'H-302', capacity: 80, features: ['Projector', 'AC', 'Smartboard'] },
            { room_number: 'H-303', capacity: 60, features: ['Projector', 'AC'] },
            { room_number: 'H-304', capacity: 60, features: ['Projector', 'AC'] },
            { room_number: 'H-Sem-1', capacity: 120, features: ['Projector', 'AC', 'Auditorium', 'Video Conference'] },
            { room_number: 'H-Lab-Mechanical', capacity: 40, features: ['CNC Machine', 'Lathe', 'AC', 'Safety Equipment', 'Tools'] },
            { room_number: 'H-Lab-Workshop', capacity: 40, features: ['Welding Equipment', 'Drilling', 'AC', 'Safety Gear', 'Workbench'] },
            { room_number: 'H-Drawing-1', capacity: 50, features: ['Drawing Tables', 'AC', 'CAD Software', 'Plotters'] },

            // ========== U BLOCK (Civil Engineering) ==========
            { room_number: 'U-101', capacity: 80, features: ['Projector', 'AC', 'Whiteboard'] },
            { room_number: 'U-102', capacity: 60, features: ['Projector', 'AC'] },
            { room_number: 'U-103', capacity: 60, features: ['Projector', 'AC'] },
            { room_number: 'U-Sem-1', capacity: 100, features: ['Projector', 'AC', 'Seminar Hall', 'Video Conference'] },
            { room_number: 'U-Lab-Civil', capacity: 40, features: ['Testing Equipment', 'Material Lab', 'AC', 'Concrete Testing Machine'] },
            { room_number: 'U-Lab-Strength', capacity: 40, features: ['UTM Machine', 'Load Frame', 'AC', 'Testing Apparatus'] },
            { room_number: 'U-Drawing-1', capacity: 50, features: ['Drawing Tables', 'AC', 'CAD Lab', 'Plotters'] },

            // ========== PHARMA BLOCK (Pharmacy) ==========
            { room_number: 'Ph-101', capacity: 70, features: ['Projector', 'AC', 'Whiteboard'] },
            { room_number: 'Ph-102', capacity: 70, features: ['Projector', 'AC', 'Smartboard'] },
            { room_number: 'Ph-Sem-1', capacity: 100, features: ['Projector', 'AC', 'Seminar Hall'] },
            { room_number: 'Ph-Lab-Pharma', capacity: 45, features: ['Fume Hood', 'Analytical Equipment', 'AC', 'Safety Cabinet', 'Refrigerator'] },
            { room_number: 'Ph-Lab-Biotech', capacity: 45, features: ['Incubator', 'Centrifuge', 'AC', 'Microbiology Equipment', 'Laminar Hood'] },

            // ========== STAFF ROOMS (Faculty Spaces) ==========
            { room_number: 'A-Staff-1', capacity: 20, features: ['Desk', 'Computer', 'AC', 'Coffee Machine', 'WiFi'] },
            { room_number: 'A-Staff-2', capacity: 20, features: ['Desk', 'Computer', 'AC', 'WiFi', 'Meeting Table'] },
            { room_number: 'N-Staff-1', capacity: 20, features: ['Desk', 'Computer', 'AC', 'Coffee Machine', 'WiFi'] },
            { room_number: 'N-Staff-2', capacity: 20, features: ['Desk', 'Computer', 'AC', 'WiFi', 'Meeting Table'] },
            { room_number: 'H-Staff-1', capacity: 20, features: ['Desk', 'Computer', 'AC', 'Coffee Machine', 'WiFi'] },
            { room_number: 'H-Staff-2', capacity: 20, features: ['Desk', 'Computer', 'AC', 'WiFi', 'Meeting Table'] },
            { room_number: 'U-Staff-1', capacity: 20, features: ['Desk', 'Computer', 'AC', 'Coffee Machine', 'WiFi'] },
            { room_number: 'Ph-Staff-1', capacity: 20, features: ['Desk', 'Computer', 'AC', 'Coffee Machine', 'WiFi'] },
            { room_number: 'Central-Staff-Room', capacity: 30, features: ['Meeting Table', 'Projector', 'AC', 'Whiteboard', 'Video Conference'] },

            // ========== CENTRAL LABS (Common for All) ==========
            { room_number: 'Central-Physics-Lab', capacity: 50, features: ['Optical Bench', 'Pendulum', 'Spectrometer', 'AC', 'Safety Equipment'] },
            { room_number: 'Central-Chemistry-Lab', capacity: 50, features: ['Fume Hood', 'Distillation Units', 'AC', 'Safety Cabinet', 'Testing Equipment'] },
            { room_number: 'Central-Sem-1', capacity: 150, features: ['Projector', 'AC', 'Large Auditorium', 'Video Conference', 'Sound System'] }
        ]);

        // 2. Ensure Subjects
        const depts = await Department.find();
        const cseDept = depts.find(d => d.name.includes('Computer'));
        const eceDept = depts.find(d => d.name.includes('Electronics'));

        console.log('Clearing old subjects and recreating...');
        await Subject.deleteMany({});
        await Subject.insertMany([
            { name: 'Data Structures and Algorithms', code: 'CS201', department_id: cseDept._id },
            { name: 'Database Management Systems', code: 'CS202', department_id: cseDept._id },
            { name: 'Digital Logic Design', code: 'EC201', department_id: eceDept._id },
            { name: 'Signals and Systems', code: 'EC202', department_id: eceDept._id },
        ]);

        const subjectsDb = await Subject.find();
        const dsa = subjectsDb.find(s => s.code === 'CS201');
        const dbms = subjectsDb.find(s => s.code === 'CS202');
        const dld = subjectsDb.find(s => s.code === 'EC201');

        // 3. Clear existing Timetables to avoid duplicates
        console.log('Clearing old timetables...');
        await Timetable.deleteMany({});

        // 4. Get Faculty and Sections
        const faculties = await User.find({ role: 'Faculty' });
        const sections = await Section.find().populate('department_id');

        if (faculties.length === 0 || sections.length === 0) {
            console.log('Error: Not enough faculty or sections found. Please run seed_large_data.js first.');
            process.exit(1);
        }

        const fac1 = faculties[0];
        const fac2 = faculties[1];
        const fac3 = faculties[2];

        const cseSecA = sections.find(s => s.name === '1CSE-A');
        const cseSecB = sections.find(s => s.name === '1CSE-B');
        const eceSecA = sections.find(s => s.name === '1ECE-A');

        // Determine current day and a wide active time slot so it always shows as "Live Now" when the user checks
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = days[new Date().getDay()];

        // Let's get current hour to make a dynamic timezone slot, but a wide slot is safer
        // E.g., 00:00 to 23:59 ensures it's ALWAYS active today for demonstration.
        // Wait, to make it look realistic, let's just make a slot right now.
        const now = new Date();
        const startHour = String(now.getHours() - 1).padStart(2, '0'); // Started an hour ago
        const endHour = String(now.getHours() + 1).padStart(2, '0'); // Ends in an hour

        let startTime = `${startHour}:00`;
        let endTime = `${endHour}:00`;

        if (now.getHours() === 0) startTime = `00:00`;
        if (now.getHours() === 23) endTime = `23:59`;

        console.log(`Creating 'Live Now' timetables for ${currentDay} between ${startTime} and ${endTime}...`);

        const newSlots = [
            // Live Now Slot for Faculty 1 (CSE-A)
            {
                section_id: cseSecA._id,
                subject_id: dsa._id,
                faculty_id: fac1._id,
                classroom_id: classrooms[0]._id,
                day_of_week: currentDay,
                start_time: startTime,
                end_time: endTime,
                semester: 1,
                academic_year: "2024-2025"
            },
            // Another slot for Faculty 1 earlier today
            {
                section_id: cseSecB._id,
                subject_id: dbms._id,
                faculty_id: fac1._id,
                classroom_id: classrooms[1]._id,
                day_of_week: currentDay,
                start_time: '09:00',
                end_time: '10:40',
                semester: 1,
                academic_year: "2024-2025"
            },
            // Live Now Slot for Faculty 2 (CSE-B)
            {
                section_id: cseSecB._id,
                subject_id: dbms._id,
                faculty_id: fac2._id,
                classroom_id: classrooms[1]._id,
                day_of_week: currentDay,
                start_time: startTime,
                end_time: endTime,
                semester: 1,
                academic_year: "2024-2025"
            },
            // Live Now Slot for Faculty 3 (ECE-A)
            {
                section_id: eceSecA._id,
                subject_id: dld._id,
                faculty_id: fac3._id,
                classroom_id: classrooms[2]._id,
                day_of_week: currentDay,
                start_time: startTime,
                end_time: endTime,
                semester: 1,
                academic_year: "2024-2025"
            }
        ];

        // Generate 5 random slots for EACH faculty to populate their individual timetables
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const timeSlots = [
            { start: '09:00', end: '09:50' },
            { start: '10:00', end: '10:50' },
            { start: '11:00', end: '11:50' },
            { start: '13:00', end: '13:50' },
            { start: '14:00', end: '14:50' },
            { start: '15:00', end: '15:50' }
        ];

        console.log('Generating individual week timetables for all 30 faculty members...');
        
        // Track room usage to ensure no two sections share the same room at the same time
        // Format: { "day-time": Map(classroomId -> sectionId) }
        const roomUsageMap = {};
        
        for (const faculty of faculties) {
            // Pick a few random slots across the week
            for (let i = 0; i < 5; i++) {
                const day = daysOfWeek[i]; // One class per day
                const time = timeSlots[Math.floor(Math.random() * timeSlots.length)];
                const subject = subjectsDb[Math.floor(Math.random() * subjectsDb.length)];
                const section = sections[Math.floor(Math.random() * sections.length)];
                
                // Create a key for this time slot
                const timeKey = `${day}-${time.start}`;
                
                if (!roomUsageMap[timeKey]) {
                    roomUsageMap[timeKey] = new Map();
                }
                
                // Find a classroom not used by another section at this time
                let selectedClassroom = null;
                for (const classroom of classrooms) {
                    const usedBySection = roomUsageMap[timeKey].get(classroom._id.toString());
                    if (!usedBySection || usedBySection === section._id.toString()) {
                        // Classroom is free or already assigned to this section
                        selectedClassroom = classroom;
                        break;
                    }
                }
                
                // Fallback: if all classrooms are used by other sections, pick any (shouldn't happen)
                if (!selectedClassroom) {
                    selectedClassroom = classrooms[0];
                }
                
                // Record this room assignment
                roomUsageMap[timeKey].set(selectedClassroom._id.toString(), section._id.toString());

                newSlots.push({
                    section_id: section._id,
                    subject_id: subject._id,
                    faculty_id: faculty._id,
                    classroom_id: selectedClassroom._id,
                    day_of_week: day,
                    start_time: time.start,
                    end_time: time.end,
                    semester: section.semester,
                    academic_year: "2024-2025"
                });
            }
        }

        await Timetable.insertMany(newSlots);
        console.log(`Timetable seeding complete! Generated ${newSlots.length} individual slots total.`);
        console.log(`Faculty 1 (${fac1.email}) has a LIVE CLASS for CSE-A right now.`);
        console.log(`Faculty 2 (${fac2.email}) has a LIVE CLASS for CSE-B right now.`);
        console.log(`Faculty 3 (${fac3.email}) has a LIVE CLASS for ECE-A right now.`);

        process.exit(0);
    } catch (error) {
        require('fs').writeFileSync('error.json', JSON.stringify({ msg: error.message, stack: error.stack }));
        console.log("Logged error to error.json");
        process.exit(1);
    }
};

seedTimetable();
