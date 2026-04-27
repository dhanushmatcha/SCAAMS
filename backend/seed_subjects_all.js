const mongoose = require('mongoose');
const Subject = require('./models/Subject');
const Department = require('./models/Department');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/scaams';

const subjectsData = {
    "CSE": [
        // Sem 1
        { name: "Mathematics I", code: "MAT101", is_lab: false },
        { name: "Engineering Physics", code: "PHY101", is_lab: true },
        { name: "Basic Electrical Engineering", code: "BEE101", is_lab: true },
        { name: "Engineering Graphics", code: "EGR101", is_lab: true },
        { name: "Programming for Problem Solving", code: "PPS101", is_lab: true },
        // Sem 3
        { name: "Data Structures", code: "CSE301", is_lab: true },
        { name: "Digital Electronics", code: "CSE302", is_lab: true },
        { name: "Discrete Mathematics", code: "CSE303", is_lab: false },
        { name: "Computer Organization & Architecture", code: "CSE304", is_lab: false },
        { name: "Python Programming", code: "CSE305", is_lab: true },
        // Sem 5
        { name: "Operating Systems", code: "CSE501", is_lab: true },
        { name: "Database Management Systems", code: "CSE502", is_lab: true },
        { name: "Theory of Computation", code: "CSE503", is_lab: false },
        { name: "Software Engineering", code: "CSE504", is_lab: false },
        { name: "Computer Networks", code: "CSE505", is_lab: true },
        // Sem 7
        { name: "Machine Learning", code: "CSE701", is_lab: true },
        { name: "Cloud Computing", code: "CSE702", is_lab: false },
        { name: "Distributed Systems", code: "CSE703", is_lab: false },
        { name: "Cryptography & Network Security", code: "CSE704", is_lab: false },
        { name: "Big Data Analytics", code: "CSE705", is_lab: true },
        // Honors/Minors
        { name: "Advanced Algorithms (Honors)", code: "CSEH01", is_lab: false },
        { name: "Quantum Computing (Honors)", code: "CSEH02", is_lab: false },
        { name: "Principles of Management (Minor)", code: "MGT01", is_lab: false },
        { name: "Digital Marketing (Minor)", code: "MKT01", is_lab: false }
    ],
    "ECE": [
        // Sem 1 (Common usually)
        { name: "Mathematics I", code: "MAT101-E", is_lab: false },
        { name: "Engineering Chemistry", code: "CHM101", is_lab: true },
        { name: "English for Communication", code: "ENG101", is_lab: true },
        { name: "Basic Mechanical Engineering", code: "BME101", is_lab: false },
        { name: "Workshop Practice", code: "WSP101", is_lab: true },
        // Sem 3
        { name: "Electronic Devices", code: "ECE301", is_lab: true },
        { name: "Network Theory", code: "ECE302", is_lab: false },
        { name: "Signals & Systems", code: "ECE303", is_lab: false },
        { name: "Switching Theory", code: "ECE304", is_lab: false },
        { name: "Analog Circuits", code: "ECE305", is_lab: true },
        // Sem 5
        { name: "Microprocessors & Microcontrollers", code: "ECE501", is_lab: true },
        { name: "Digital Signal Processing", code: "ECE502", is_lab: true },
        { name: "Linear Integrated Circuits", code: "ECE503", is_lab: true },
        { name: "Control Systems", code: "ECE504", is_lab: false },
        { name: "Antennas & Wave Propagation", code: "ECE505", is_lab: false },
        // Sem 7
        { name: "VLSI Design", code: "ECE701", is_lab: true },
        { name: "Optical Communications", code: "ECE702", is_lab: true },
        { name: "Radar Engineering", code: "ECE703", is_lab: false },
        { name: "Wireless Communications", code: "ECE704", is_lab: false },
        { name: "Embedded Systems", code: "ECE705", is_lab: true },
        // Honors
        { name: "IoT Architecture (Honors)", code: "ECEH01", is_lab: true },
        { name: "CMOS Analog IC Design (Honors)", code: "ECEH02", is_lab: false }
    ],
    "IT": [
        { name: "Web Technologies", code: "IT501", is_lab: true },
        { name: "Information Security", code: "IT502", is_lab: false },
        { name: "E-Commerce", code: "IT503", is_lab: false },
        { name: "Software Project Management", code: "IT701", is_lab: false },
        { name: "Blockchain Technology", code: "IT702", is_lab: false },
        { name: "Mobile App Development", code: "IT703", is_lab: true },
        { name: "Data Warehousing & Mining", code: "IT301", is_lab: true },
        { name: "Object Oriented Programming", code: "IT302", is_lab: true }
    ],
    "MECH": [
        { name: "Thermodynamics", code: "ME301", is_lab: false },
        { name: "Manufacturing Processes", code: "ME302", is_lab: true },
        { name: "Fluid Mechanics", code: "ME303", is_lab: true },
        { name: "Heat and Mass Transfer", code: "ME501", is_lab: true },
        { name: "Design of Machine Elements", code: "ME502", is_lab: false },
        { name: "CAD/CAM", code: "ME503", is_lab: true },
        { name: "Automobile Engineering", code: "ME701", is_lab: true },
        { name: "Robotics", code: "ME702", is_lab: true },
        { name: "Power Plant Engineering", code: "ME703", is_lab: false }
    ],
    "CIVIL": [
        { name: "Strength of Materials", code: "CE301", is_lab: true },
        { name: "Surveying", code: "CE302", is_lab: true },
        { name: "Structural Analysis", code: "CE501", is_lab: false },
        { name: "Geotechnical Engineering", code: "CE502", is_lab: true },
        { name: "Hydraulic Engineering", code: "CE503", is_lab: true },
        { name: "Transportation Engineering", code: "CE701", is_lab: true },
        { name: "Environmental Engineering", code: "CE702", is_lab: true },
        { name: "Construction Management", code: "CE703", is_lab: false }
    ],
    "EEE": [
        { name: "Electrical Machines I", code: "EE301", is_lab: true },
        { name: "Power Systems I", code: "EE302", is_lab: false },
        { name: "Power Electronics", code: "EE501", is_lab: true },
        { name: "Electrical Measurements", code: "EE502", is_lab: true },
        { name: "High Voltage Engineering", code: "EE701", is_lab: false },
        { name: "Smart Grids", code: "EE702", is_lab: false }
    ]
};

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const departments = await Department.find();
        const deptMap = {};
        departments.forEach(d => {
            deptMap[d.code] = d._id;
        });

        for (const [deptCode, subjects] of Object.entries(subjectsData)) {
            const deptId = deptMap[deptCode];
            if (!deptId) {
                console.warn(`Department ${deptCode} not found, skipping...`);
                continue;
            }

            for (const sub of subjects) {
                const existing = await Subject.findOne({ code: sub.code });
                if (existing) {
                    console.log(`Subject ${sub.code} already exists, updating...`);
                    await Subject.findByIdAndUpdate(existing._id, { ...sub, department_id: deptId });
                } else {
                    console.log(`Creating subject ${sub.code}: ${sub.name}`);
                    await Subject.create({ ...sub, department_id: deptId });
                }
            }
        }

        console.log('Seeding completed successfully');
        process.exit();
    } catch (error) {
        console.error('Error seeding subjects:', error);
        process.exit(1);
    }
}

seed();
