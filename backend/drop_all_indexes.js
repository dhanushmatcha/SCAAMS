const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb://127.0.0.1:27017/scaams';

async function dropAllIndexes() {
    await mongoose.connect(MONGODB_URI);
    try {
        const db = mongoose.connection.db;
        const collection = db.collection('sectionassignments');
        await collection.dropIndexes();
        console.log('All indexes dropped successfully.');
    } catch (e) {
        console.log('Error dropping indexes:', e.message);
    }
    process.exit();
}
dropAllIndexes();
