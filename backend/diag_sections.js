const mongoose = require('mongoose');
const Section = require('./models/Section');
const Department = require('./models/Department');
const MONGODB_URI = 'mongodb://127.0.0.1:27017/scaams';

async function diagnose() {
    await mongoose.connect(MONGODB_URI);
    const sections = await Section.find();
    for (const s of sections) {
        const dept = await Department.findById(s.department_id);
        console.log(`Section: ${s.name}, Dept: ${dept?.name || 'Unknown'}, Students: ${s.students.length}`);
    }
    process.exit();
}
diagnose();
