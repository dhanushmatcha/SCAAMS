const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
    section_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Must be Faculty
    classroom_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
    ta_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // TAs for this class
    day_of_week: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], required: true },
    start_time: { type: String, required: true }, // Format HH:mm
    end_time: { type: String, required: true },
    semester: { type: Number, required: true }, // 1, 2, 3, 4, 5, 6, 7, 8
    academic_year: { type: String, required: true }, // e.g., "2023-2024"
    status: { 
        type: String, 
        enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Shifted'], 
        default: 'Scheduled' 
    },
    status_reason: { type: String }, // Reason for cancellation or shift
    status_updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who updated the status
    status_updated_at: { type: Date, default: Date.now },
    is_recurring: { type: Boolean, default: false }, // For recurring classes
    recurring_pattern: { type: String }, // e.g., "Weekly", "Bi-weekly"
    effective_date: { type: Date }, // When this timetable entry becomes effective
    expiry_date: { type: Date }, // When this timetable entry expires
    
    // LAB HOURS (Optional - only for lab-inclusive subjects)
    lab_faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Faculty for lab hours (can be same or different)
    lab_ta_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // TAs assisting in lab
    lab_day_of_week: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] }, // Day of lab
    lab_start_time: { type: String }, // Lab start time HH:mm
    lab_end_time: { type: String }, // Lab end time HH:mm
    lab_classroom_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' }, // Lab room/space
    is_lab_class: { type: Boolean, default: false } // Whether this entry includes lab hours
}, { timestamps: true });

module.exports = mongoose.model('Timetable', timetableSchema);
