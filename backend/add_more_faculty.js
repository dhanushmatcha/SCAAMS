const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/scaams';

async function addFaculty() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const depts = await Department.find();
        const facultyCount = await User.countDocuments({ role: 'Faculty' });
        
        console.log(`Current faculty count: ${facultyCount}. Adding 10 more per department...`);

        const hashedPassword = await bcrypt.hash('password123', 10);

        const newFaculty = [];
        const names = [
            'Ravi Teja', 'Suresh Babu', 'Anjali Devi', 'Mohan Rao', 'Sneha Reddy',
            'Prakash Raj', 'Swathi Priya', 'Naveen Kumar', 'Divya Vani', 'Sanjay Dutt',
            'Lakshmi Narayan', 'Rajesh Hamal', 'Gita Kapoor', 'Arjun Sarja', 'Meena Kumari'
        ];

        for (const dept of depts) {
            for (let i = 0; i < 15; i++) {
                const name = `${names[i % names.length]} (${dept.code}-${i+1})`;
                const email = `${dept.code.toLowerCase()}.fac${i+facultyCount+1}@vignan.ac.in`;
                
                newFaculty.push({
                    name,
                    email,
                    password: hashedPassword,
                    role: 'Faculty',
                    department: dept._id,
                    employee_id: `FAC-${dept.code}-${1000 + i + facultyCount}`,
                    designation: 'Assistant Professor'
                });
            }
        }

        await User.insertMany(newFaculty);
        console.log(`Successfully added ${newFaculty.length} new faculty members.`);
        process.exit();
    } catch (error) {
        console.error('Error adding faculty:', error);
        process.exit(1);
    }
}

addFaculty();
