const mongoose = require('mongoose');
require('./models/Department');
require('./models/Section');
const User = require('./models/User');

async function check() {
    await mongoose.connect('mongodb://localhost:27017/scaams');
    const students = await User.find({ role: 'Student' }).limit(5);
    console.log(JSON.stringify(students, null, 2));
    process.exit();
}

check();
