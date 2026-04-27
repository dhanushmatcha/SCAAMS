const mongoose = require('mongoose');
const Subject = require('./models/Subject');
const Section = require('./models/Section');
const Department = require('./models/Department');
const MONGODB_URI = 'mongodb://127.0.0.1:27017/scaams';

async function checkCoverage() {
    await mongoose.connect(MONGODB_URI);
    const sections = await Section.find();
    const subjects = await Subject.find();

    console.log(`Total Sections: ${sections.length}`);
    
    for (const sec of sections) {
        const dept = await Department.findById(sec.department_id);
        const semSubs = subjects.filter(sub => 
            sub.department_id.toString() === sec.department_id.toString() &&
            (
                (sec.semester === 1 && sub.code.includes('1')) ||
                (sec.semester === 3 && sub.code.includes('3')) ||
                (sec.semester === 5 && sub.code.includes('5')) ||
                (sec.semester === 7 && sub.code.includes('7'))
            )
        );
        console.log(`Section: ${sec.name}, Sem: ${sec.semester}, Dept: ${dept?.code}, Subs Found: ${semSubs.length}`);
    }
    process.exit();
}
checkCoverage();
