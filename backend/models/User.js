const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: String,
    message: String,
    type: String,
    priority: String,
    date: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
}, { _id: false });

const assignmentNotificationSchema = new mongoose.Schema({
    title: String,
    message: String,
    assignment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
    type: String,
    priority: String,
    date: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
}, { _id: false });

const userSchema = new mongoose.Schema({
    role: { type: String, enum: ['Admin', 'Faculty', 'Student'], required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    student_id: { type: String }, // For students
    regd_no: { type: String }, // Registration number for students
    section_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' }, // For students
    faculty_id: { type: String }, // For faculties
    phone: { type: String },
    assignedSections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Section' }], // For faculties
    attendance_percentage: { type: Number, default: 100 }, // Computed field
    attendance_notifications: [notificationSchema],
    assignment_notifications: [assignmentNotificationSchema],
    
    // NEW: Profile Fields
    dob: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    address: { type: String },
    bio: { type: String },
    skills: [{ type: String }],
    experience: { type: String }, // For Faculty
    achievements: [{ type: String }],
    profile_picture: { type: String, default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
