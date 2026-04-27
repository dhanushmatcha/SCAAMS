const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    is_lab: { type: Boolean, default: false }, // Indicates if this is a lab-inclusive subject
    is_lab_only: { type: Boolean, default: false }, // True if ONLY lab, false if theory+lab
    co_definitions: [{
        code: { type: String }, // e.g., "CO1"
        description: { type: String },
        target_percentage: { type: Number, default: 60 } // Percentage of students required to pass for attainment
    }]
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);
