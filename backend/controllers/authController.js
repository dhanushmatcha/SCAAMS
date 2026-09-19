const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// Generate JWT
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// Helper to generate temporary password in format: SCAAMS + 4 random digits (e.g. SCAAMS5736)
const generateTempPassword = () => {
    const randomNumber = crypto.randomInt(0, 10000).toString().padStart(4, "0");
    return `SCAAMS${randomNumber}`;
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Admin Only (or Public for initial setup)
const registerUser = async (req, res) => {
    try {
        const { role, name, email, password, department, student_id, faculty_id, phone } = req.body;

        const userExists = await User.findOne({ email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            role, name, email: email.trim().toLowerCase(), password: hashedPassword, department, student_id, faculty_id, phone
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
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const cleanEmail = email.trim();
        const user = await User.findOne({ 
            email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } 
        }).populate('section_id').populate('department');

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
        const cleanEmail = email ? email.trim() : '';
        const cleanId = unique_id ? unique_id.trim() : '';

        if (!cleanEmail && !cleanId) {
            return res.status(400).json({ message: 'Email or Regd No / Faculty ID is required' });
        }

        const conditions = [];
        if (cleanEmail) {
            conditions.push({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } });
        }
        if (cleanId) {
            const idRegex = new RegExp(`^${cleanId}$`, 'i');
            conditions.push({ student_id: idRegex });
            conditions.push({ faculty_id: idRegex });
            conditions.push({ regd_no: idRegex });
        }

        const user = await User.findOne({ $or: conditions });

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

// @desc    Forgot password - Generate temp password & send email via Gmail SMTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({ message: 'Email address is required' });
        }

        const cleanEmail = email.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }

        const user = await User.findOne({ 
            email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } 
        });

        if (!user) {
            return res.status(404).json({ message: 'User with this email address does not exist' });
        }

        // Generate temporary password in pattern SCAAMS####
        const tempPassword = generateTempPassword();

        // Hash temporary password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        // Update user password in MongoDB
        user.password = hashedPassword;
        await user.save();

        // Email content per specifications
        const emailSubject = 'SCAAMS - Temporary Password';
        const emailBody = `Hello ${user.name},\n\nA password reset request was made for your SCAAMS account.\n\nYour temporary password is:\n${tempPassword}\n\nPlease log in using this temporary password and change your password after logging in.\n\nIf you did not request this reset, please contact the administrator.\n\nRegards,\nSCAAMS Team`;

        const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #4f46e5; text-align: center;">SCAAMS</h2>
            <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>A password reset request was made for your SCAAMS account.</p>
            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #64748b;">Your temporary password is:</p>
                <h3 style="margin: 10px 0 0 0; font-size: 24px; letter-spacing: 2px; color: #1e293b;">${tempPassword}</h3>
            </div>
            <p>Please log in using this temporary password and change your password after logging in.</p>
            <p style="color: #64748b; font-size: 13px;">If you did not request this reset, please contact the administrator.</p>
            <br />
            <p>Regards,<br /><strong>SCAAMS Team</strong></p>
        </div>
        `;

        try {
            // Attempt email delivery via Nodemailer Gmail SMTP
            await sendEmail({
                email: user.email,
                subject: emailSubject,
                message: emailBody,
                html: htmlBody
            });

            // Return success response ONLY after successful email dispatch
            return res.status(200).json({ 
                message: 'Temporary password has been sent to your registered email address.' 
            });
        } catch (mailError) {
            console.error('Email delivery error:', mailError.message);
            return res.status(500).json({ 
                message: 'Failed to send temporary password email. Please verify your Gmail App Password in backend/.env.' 
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { 
    registerUser, 
    loginUser, 
    getMe, 
    updateProfile, 
    resetRequest, 
    resetPassword,
    forgotPassword 
};
