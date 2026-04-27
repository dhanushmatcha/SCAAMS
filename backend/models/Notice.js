const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    target_audience: { type: String, enum: ['Global', 'Department', 'Section'], required: true },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }, // Null if Global
    section_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' }, // Null if Global or Department
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Admin or Faculty
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);
