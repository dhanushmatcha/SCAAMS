const mongoose = require('mongoose');
const Department = require('./models/Department');
const Section = require('./models/Section');
const User = require('./models/User');

async function check() {
    await mongoose.connect('mongodb://localhost:27017/scaams');
    const students = await User.find({ role: 'Student', attendance_percentage: { $lt: 85 } }) // higher threshold to get data
        .populate('department')
        .populate('section_id')
        .limit(5);
    
    students.forEach(s => {
        console.log(`Name: ${s.name}`);
        console.log(`Regd: ${s.regd_no}`);
        console.log(`Dept: ${s.department?.name}`);
        console.log(`Sem: ${s.section_id?.semester}`);
        console.log('---');
    });
    process.exit();
}

check();
