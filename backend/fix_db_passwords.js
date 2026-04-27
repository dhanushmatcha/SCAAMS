const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const User = require('./models/User');

dotenv.config();

const fixPasswords = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB...');

        const users = await User.find({});
        console.log(`Found ${users.length} users. Checking for plain text passwords...`);

        let fixedCount = 0;
        for (const user of users) {
            // Check if password looks like a bcrypt hash (usually starts with $2a$ or $2b$)
            if (!user.password.startsWith('$2')) {
                console.log(`Hashing password for: ${user.email}`);
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
                await user.save();
                fixedCount++;
            }
        }

        console.log(`Fixed ${fixedCount} passwords.`);

        // Specifically check for Vikram Verma
        const vikram = await User.findOne({ name: /Vikram Verma/i });
        if (vikram) {
            console.log(`Verified Vikram Verma: ${vikram.email}`);
        } else {
            console.log("Vikram Verma not found.");
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixPasswords();
