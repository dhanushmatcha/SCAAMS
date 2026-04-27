const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scaams')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    
    try {
      console.log('Checking existing users and creating valid credentials...\n');
      
      // Check if admin exists
      let admin = await User.findOne({ role: 'Admin' });
      if (!admin) {
        console.log('Creating admin user...');
        admin = await User.create({
          name: 'Super Admin',
          email: 'admin@vignan.ac.in',
          password: 'admin123',
          role: 'Admin'
        });
        console.log('✅ Admin created successfully');
      } else {
        console.log('✅ Admin already exists');
      }
      
      // Check sample student
      const student = await User.findOne({ role: 'Student' });
      if (student) {
        console.log('\n👨‍🎓 STUDENT LOGIN:');
        console.log('─'.repeat(40));
        console.log(`Email: ${student.email}`);
        console.log(`Password: password123`);
        console.log(`Name: ${student.name}`);
        console.log(`Regd No: ${student.regd_no}`);
        console.log(`Section: ${student.section_id ? 'Assigned' : 'Not assigned'}`);
      }
      
      // Check sample faculty
      const faculty = await User.findOne({ role: 'Faculty' });
      if (faculty) {
        console.log('\n👨‍🏫 FACULTY LOGIN:');
        console.log('─'.repeat(40));
        console.log(`Email: ${faculty.email}`);
        console.log(`Password: faculty123`);
        console.log(`Name: ${faculty.name}`);
        console.log(`Faculty ID: ${faculty.faculty_id}`);
        console.log(`Department: ${faculty.department || 'Not assigned'}`);
      }
      
      // Create test users if needed
      console.log('\n🔧 Creating test users if needed...');
      
      // Create a test student with simple email
      let testStudent = await User.findOne({ email: 'student@test.com' });
      if (!testStudent) {
        const Section = require('./models/Section');
        const section = await Section.findOne();
        
        testStudent = await User.create({
          name: 'Test Student',
          email: 'student@test.com',
          password: 'password123',
          role: 'Student',
          regd_no: 'TEST001',
          section_id: section ? section._id : null
        });
        console.log('✅ Test student created: student@test.com');
      }
      
      // Create a test faculty with simple email
      let testFaculty = await User.findOne({ email: 'faculty@test.com' });
      if (!testFaculty) {
        const Department = require('./models/Department');
        const department = await Department.findOne();
        
        testFaculty = await User.create({
          name: 'Test Faculty',
          email: 'faculty@test.com',
          password: 'faculty123',
          role: 'Faculty',
          faculty_id: 'TEST001',
          department: department ? department._id : null
        });
        console.log('✅ Test faculty created: faculty@test.com');
      }
      
      console.log('\n🎯 SIMPLE TEST CREDENTIALS:');
      console.log('─'.repeat(40));
      console.log('STUDENT:');
      console.log('  Email: student@test.com');
      console.log('  Password: password123');
      console.log('');
      console.log('FACULTY:');
      console.log('  Email: faculty@test.com');
      console.log('  Password: faculty123');
      console.log('');
      console.log('ADMIN:');
      console.log('  Email: admin@vignan.ac.in');
      console.log('  Password: admin123');
      
      console.log('\n✅ All credentials are now ready for testing!');
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });
