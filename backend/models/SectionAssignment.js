const mongoose = require('mongoose');

const sectionAssignmentSchema = new mongoose.Schema({
  section_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['Teacher', 'TA'], default: 'Teacher' }
}, { timestamps: true });

// Ensure each section-subject pairing has only one assignment
sectionAssignmentSchema.index({ section_id: 1, subject_id: 1 }, { unique: true });

module.exports = mongoose.model('SectionAssignment', sectionAssignmentSchema);
