const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb://127.0.0.1:27017/scaams';

async function dropIndex() {
    await mongoose.connect(MONGODB_URI);
    try {
        const db = mongoose.connection.db;
        const collection = db.collection('sectionassignments');
        await collection.dropIndex('section_id_1_role_1');
        console.log('Index dropped successfully.');
    } catch (e) {
        console.log('Index might not exist or already dropped:', e.message);
    }
    process.exit();
}
dropIndex();
