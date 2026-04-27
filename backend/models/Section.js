const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "A", "B", "CSE-1"
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number, required: true },
    strength: { type: Number, default: 0 }, // Number of students in the section
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    main_faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ta_faculty_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Section', sectionSchema);
