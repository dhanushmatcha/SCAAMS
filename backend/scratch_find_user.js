const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const findUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Searching for user...');

        const userByEmail = await User.findOne({ email: 'vikramverma1010@college.edu' });
        console.log('User by email:', userByEmail);

        const usersByName = await User.find({ name: /Vikram/i });
        console.log('Users by name "Vikram":', usersByName);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

findUser();
