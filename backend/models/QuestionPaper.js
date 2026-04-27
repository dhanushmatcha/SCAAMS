const mongoose = require('mongoose');

const questionPaperSchema = new mongoose.Schema({
  section_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exam_type: { type: String, enum: ['T1', 'T4'], required: true },
  filename: { type: String },
  file_url: { type: String },
  questions_data: { type: mongoose.Schema.Types.Mixed }, // Structured JSON of typed questions
  question_to_co_map: { type: mongoose.Schema.Types.Mixed }, // e.g., { "1": "CO1", "2": "CO2" }
  locked: { type: Boolean, default: false },
  uploaded_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('QuestionPaper', questionPaperSchema);
