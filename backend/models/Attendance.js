const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['Present', 'Absent', 'Late', 'Excused'], required: true, default: 'Absent' }
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
    timetable_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable', required: true },
    section_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
    subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    date: { type: Date, required: true },
    period: { type: String, default: '1' },
    records: [attendanceRecordSchema],
    marked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Faculty who marked attendance
    marked_method: { type: String, enum: ['Manual', 'RFID', 'Facial'], default: 'Manual' },
    is_substitute: { type: Boolean, default: false }, // Whether this was marked by a substitute faculty
    original_faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Original faculty if substituted
}, { timestamps: true });

// Ensure one attendance per timetable slot per period per day
attendanceSchema.index({ timetable_id: 1, date: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
