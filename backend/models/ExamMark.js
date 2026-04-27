const mongoose = require('mongoose');

const examMarkSchema = new mongoose.Schema({
  section_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exam_type: { type: String, enum: ['T1', 'T2', 'T3', 'T4', 'T5', 'External Lab'], required: true },
  marks_obtained: { type: Number, required: true },
  total_marks: { type: Number, required: true },
  breakdown_marks: { type: mongoose.Schema.Types.Mixed },
  scaled_marks: { type: Number },
  locked: { type: Boolean, default: false },
  remarks: { type: String },
  recorded_at: { type: Date, default: Date.now }
}, { timestamps: true });

examMarkSchema.index({ student_id: 1, section_id: 1, subject_id: 1, exam_type: 1 }, { unique: true });

module.exports = mongoose.model('ExamMark', examMarkSchema);
