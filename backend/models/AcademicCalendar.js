const mongoose = require('mongoose');

const academicCalendarSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    type: { 
        type: String, 
        enum: ['Holiday', 'Exam', 'Event', 'Deadline', 'Other'], 
        required: true 
    },
    target_audience: { 
        type: String, 
        enum: ['Global', 'Department'], 
        default: 'Global' 
    },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }, // Null if Global
    is_recurring: { type: Boolean, default: false },
    recurring_pattern: { 
        type: String, 
        enum: ['Weekly', 'Monthly', 'Yearly'], 
        default: null 
    },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('AcademicCalendar', academicCalendarSchema);
