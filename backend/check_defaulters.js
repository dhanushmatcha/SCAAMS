const mongoose = require('mongoose');
const User = require('./models/User');
require('./models/Department');
require('./models/Section');

async function check() {
    await mongoose.connect('mongodb://localhost:27017/scaams');
    // Find defaulters specifically
    const defaulters = await User.find({ role: 'Student', attendance_percentage: { $lt: 85 } })
        .populate('department', 'name')
        .populate('section_id', 'name semester')
        .lean();
    
    console.log('--- DEFAULTERS DEBUG ---');
    console.log(`Found ${defaulters.length} defaulters`);
    defaulters.slice(0, 3).forEach(d => {
        console.log(`Object Keys: ${Object.keys(d).join(', ')}`);
        console.log(`Regd No: ${d.regd_no}`);
        console.log(`Student ID: ${d.student_id}`);
        console.log(`Dept Name: ${d.department?.name}`);
        console.log('---');
    });
    process.exit();
}

check();
