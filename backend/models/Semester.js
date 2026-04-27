const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "Fall 2023", "Spring 2024"
    academic_year: { type: String, required: true }, // e.g., "2023-2024"
    semester_number: { type: Number, required: true, min: 1, max: 8 }, // 1-8
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    status: { 
        type: String, 
        enum: ['Upcoming', 'Active', 'Completed', 'Cancelled'], 
        default: 'Upcoming' 
    },
    description: { type: String },
    is_current: { type: Boolean, default: false },
    departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    created_at: { type: Date, default: Date.now },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updated_at: { type: Date }
}, { timestamps: true });

// Static method to get current semester
semesterSchema.statics.getCurrentSemester = async function() {
    return await this.findOne({ is_current: true })
        .populate('departments', 'name')
        .populate('created_by', 'name');
};

module.exports = mongoose.model('Semester', semesterSchema);
