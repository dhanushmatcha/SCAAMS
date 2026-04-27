const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Section = require('./models/Section');
const Department = require('./models/Department');

dotenv.config();

const seedStudents = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for Seeding...');

        // Check departments
        let departments = await Department.find();
        if (departments.length === 0) {
            console.log('Creating default departments...');
            departments = await Department.insertMany([
                { name: 'Computer Science and Engineering' },
                { name: 'Electronics and Communication' }
            ]);
        }

        // Check sections
        let sections = await Section.find().populate('department_id');
        if (sections.length === 0) {
            console.log('Creating default sections...');
            const cseDept = departments.find(d => d.name === 'Computer Science and Engineering');
            sections = await Section.insertMany([
                { name: 'A', department_id: cseDept._id, semester: 1 },
                { name: 'B', department_id: cseDept._id, semester: 1 }
            ]);
            // Refetch with populated department_id
            sections = await Section.find().populate('department_id');
        }

        console.log(`Found/Created ${sections.length} sections. Creating students...`);

        const salt = await bcrypt.genSalt(10);
        const defaultPassword = await bcrypt.hash('student123', salt);

        let studentCount = 0;

        // Create Demo Admin
        const adminExists = await User.findOne({ email: 'admin@vignan.ac.in' });
        if (!adminExists) {
            await User.create({
                role: 'Admin',
                name: 'Admin User',
                email: 'admin@vignan.ac.in',
                password: defaultPassword
            });
            console.log('Created Demo Admin (admin@vignan.ac.in)');
        }

        // Create Demo Faculty
        const facultyEmails = ['smith@vignan.ac.in', 'jones@vignan.ac.in', 'brown@vignan.ac.in', 'davis@vignan.ac.in', 'wilson@vignan.ac.in'];
        const facultyNames = ['Dr. John Smith', 'Dr. Mary Jones', 'Dr. Robert Brown', 'Dr. Lisa Davis', 'Dr. Michael Wilson'];
        const facultyIds = ['FAC001', 'FAC002', 'FAC003', 'FAC004', 'FAC005'];

        for (let i = 0; i < facultyEmails.length; i++) {
            const facultyExists = await User.findOne({ email: facultyEmails[i] });
            if (!facultyExists) {
                await User.create({
                    role: 'Faculty',
                    name: facultyNames[i],
                    email: facultyEmails[i],
                    password: defaultPassword,
                    faculty_id: facultyIds[i]
                });
                console.log(`Created Demo Faculty (${facultyEmails[i]})`);
            }
        }

        for (const section of sections) {
            if (section.students.length > 0) {
                console.log(`Section ${section.name} already has ${section.students.length} students. Skipping...`);
                continue;
            }

            const deptId = section.department_id._id || section.department_id;
            const newStudentsIds = [];

            for (let i = 1; i <= 55; i++) {
                const regNo = `211FA0${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

                const studentData = {
                    role: 'Student',
                    name: `Student ${section.name} ${i}`,
                    email: `student_${section.name.toLowerCase()}_${i}@vignan.ac.in`,
                    password: defaultPassword,
                    department: deptId,
                    student_id: regNo,
                    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
                    attendance_percentage: Math.floor(65 + Math.random() * 35)
                };

                let user = await User.findOne({ email: studentData.email });
                if (!user) {
                    user = await User.create(studentData);
                    studentCount++;
                }

                newStudentsIds.push(user._id);
            }

            section.students = newStudentsIds;
            await section.save();
            console.log(`Added ${newStudentsIds.length} students to Section ${section.name}`);
        }

        console.log(`Seeding complete. Created ${studentCount} new students.`);
        process.exit(0);

    } catch (error) {
        console.error('Error seeding students:', error);
        process.exit(1);
    }
};

seedStudents();
