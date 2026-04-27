const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const User = require('./models/User');

dotenv.config();

const NEW_PASSWORD = 'faculty123';
const NEW_EMAIL_PREFIX = 'faculty';
const NEW_EMAIL_DOMAIN = '@college.edu';

const resetFacultyCredentials = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const facultyUsers = await User.find({ role: 'Faculty' }).sort({ _id: 1 });
    if (!facultyUsers.length) {
      console.log('No faculty users found.');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

    console.log(`Resetting ${facultyUsers.length} faculty users to password: ${NEW_PASSWORD}`);
    for (let i = 0; i < facultyUsers.length; i += 1) {
      const user = facultyUsers[i];
      const newEmail = `${NEW_EMAIL_PREFIX}${i + 1}${NEW_EMAIL_DOMAIN}`;
      const oldEmail = user.email;

      user.email = newEmail;
      user.password = hashedPassword;

      await user.save();
      console.log(`${i + 1}. ${oldEmail} -> ${newEmail}`);
    }

    console.log('\nAll faculty credentials have been reset.');
    console.log('Use the updated emails and password "faculty123" to log in.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error resetting faculty credentials:', error);
    process.exit(1);
  }
};

resetFacultyCredentials();
