const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Section = require('./models/Section');
const Department = require('./models/Department');

dotenv.config();

const firstNames = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua", "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", "Lisa", "Nancy", "Betty", "Margaret", "Sandra", "Ashley", "Kimberly", "Emily", "Donna", "Michelle"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"];

const generateRandomName = () => {
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${first} ${last}`;
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const seedLargeData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for Large Data Seeding...');

        // 1. Password Hash (calculate once, use for all)
        console.log("Generating common password hash...");
        const salt = await bcrypt.genSalt(10);
        const defaultPassword = await bcrypt.hash('pass123', salt);

        // 2. Departments
        let departments = await Department.find();
        if (departments.length === 0) {
            console.log('Creating departments...');
            departments = await Department.insertMany([
                { name: 'Computer Science and Engineering' },
                { name: 'Electronics and Communication' },
                { name: 'Mechanical Engineering' }
            ]);
        }

        const cseDept = departments.find(d => d.name === 'Computer Science and Engineering') || departments[0];
        const eceDept = departments.find(d => d.name === 'Electronics and Communication') || departments[1];

        // 3. Delete existing Sections and students for a clean slate
        console.log('Clearing old sections and students...');
        await Section.deleteMany({});
        await User.deleteMany({ role: 'Student' });

        // Also wipe timetables and attendance to prevent dangling references
        const Attendance = require('./models/Attendance');
        const Timetable = require('./models/Timetable');
        await Attendance.deleteMany({});
        await Timetable.deleteMany({});

        // 4. Create 30 Faculty
        console.log('Clearing existing faculty...');
        await User.deleteMany({ role: 'Faculty' });

        console.log('Creating 30 Faculty members...');
        const facultyDocs = [];
        let existingFacultyCount = 0; // We just deleted them all

        for (let i = 1; i <= 30; i++) {
            const facNum = existingFacultyCount + i;
            const email = `faculty_${facNum}@vignan.ac.in`;
            const name = `Prof. ${generateRandomName()}`;

            facultyDocs.push({
                role: 'Faculty',
                name: name,
                email: email,
                password: defaultPassword,
                department: cseDept._id,
                faculty_id: `FAC${String(facNum).padStart(4, '0')}`
            });
        }

        // Insert faculty with unique catching
        for (const doc of facultyDocs) {
            try {
                const ex = await User.findOne({ email: doc.email });
                if (!ex) await User.create(doc);
            } catch (e) { /* ignore duplication */ }
        }
        console.log('Faculty creation completed.');

        // 5. Create Sections
        console.log('Creating 8 Sections across CSE and ECE...');
        const sectionNames = ['A', 'B', 'C', 'D'];
        const createdSections = [];

        for (const sName of sectionNames) {
            createdSections.push(await Section.create({ name: `CSE-${sName}`, department_id: cseDept._id, semester: 1 }));
            createdSections.push(await Section.create({ name: `ECE-${sName}`, department_id: eceDept._id, semester: 1 }));
        }

        // 6. Create 450 Students and assign
        const totalStudentsToCreate = 450;
        console.log(`Creating ${totalStudentsToCreate} Students...`);

        const studentsPerSection = Math.ceil(totalStudentsToCreate / createdSections.length); // ~56-57 max < 72

        let studentCount = 0;
        let cseRegCount = 1;
        let eceRegCount = 1;

        for (const section of createdSections) {
            console.log(`Populating Section ${section.name}...`);
            const isCSE = section.name.includes('CSE');
            const deptId = isCSE ? cseDept._id : eceDept._id;

            let studentsAddedToThisSection = 0;
            const newStudentsIds = [];

            while (studentsAddedToThisSection < studentsPerSection && studentCount < totalStudentsToCreate) {
                const regNo = isCSE ? `23CS${String(cseRegCount++).padStart(3, '0')}` : `23EC${String(eceRegCount++).padStart(4, '0')}`;
                const email = `stud_${regNo.toLowerCase()}@vignan.ac.in`;

                const studentData = {
                    role: 'Student',
                    name: generateRandomName(),
                    email: email,
                    password: defaultPassword,
                    department: deptId,
                    student_id: regNo,
                    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
                    attendance_percentage: Math.floor(65 + Math.random() * 35)
                };

                try {
                    const user = await User.create(studentData);
                    newStudentsIds.push(user._id);
                    studentCount++;
                    studentsAddedToThisSection++;
                } catch (e) { /* ignore dups */ }

                if (studentCount % 50 === 0) console.log(`Created ${studentCount} students so far...`);
            }

            section.students = [...(section.students || []), ...newStudentsIds];
            await section.save();
            console.log(`Assigned ${newStudentsIds.length} students to ${section.name}. Max 72 check passed.`);
        }

        console.log(`Seeding complete! Successfully created 30 faculty, ${createdSections.length} sections, and ${studentCount} students.`);
        process.exit(0);

    } catch (error) {
        console.error('Error seeding large data:', error);
        process.exit(1);
    }
};

seedLargeData();
