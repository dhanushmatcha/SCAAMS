const mongoose = require('mongoose');
require('dotenv').config();

const Subject = require('./models/Subject');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const subjects = await Subject.find().select('name code');
    console.log(`\nTotal Subjects: ${subjects.length}\n`);
    
    console.log('SUBJECT LIST:');
    console.log('─'.repeat(80));
    subjects.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name.padEnd(40)} (${s.code})`);
    });

    mongoose.connection.close();
  });
