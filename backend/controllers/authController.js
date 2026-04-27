const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Admin Only (or Public for initial setup)
const registerUser = async (req, res) => {
    try {
        const { role, name, email, password, department, student_id, faculty_id, phone } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            role, name, email, password: hashedPassword, department, student_id, faculty_id, phone
        });

        if (user) {
            res.status(201).json({
                _id: user.id, name: user.name, email: user.email, role: user.role,
                token: generateToken(user._id, user.role),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).populate('section_id').populate('department');

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user.id, name: user.name, email: user.email, role: user.role,
                attendance_percentage: user.attendance_percentage,
                attendance_notifications: user.attendance_notifications,
                section: user.section_id,
                department: user.department,
                token: generateToken(user._id, user.role),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password')
            .populate('section_id')
            .populate('department');
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const updates = req.body;
        // Don't allow password or role updates here
        delete updates.password;
        delete updates.role;
        delete updates.email;

        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify user for password reset
// @route   POST /api/auth/reset-request
// @access  Public
const resetRequest = async (req, res) => {
    try {
        const { email, unique_id } = req.body;
        
        // Search for user by email AND (student_id OR faculty_id OR regd_no)
        const user = await User.findOne({
            email,
            $or: [
                { student_id: unique_id },
                { faculty_id: unique_id },
                { regd_no: unique_id }
            ]
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found with these credentials' });
        }

        res.json({ message: 'Verification successful', userId: user._id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { userId, newPassword } = req.body;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await User.findByIdAndUpdate(userId, { password: hashedPassword });

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, loginUser, getMe, updateProfile, resetRequest, resetPassword };
