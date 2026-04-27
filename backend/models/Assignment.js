const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    section_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    type: { 
        type: String, 
        enum: ['Assignment', 'Quiz', 'Test', 'Project', 'Exam'], 
        required: true 
    },
    total_marks: { type: Number, required: true },
    due_date: { type: Date, required: true },
    assigned_date: { type: Date, default: Date.now },
    status: { 
        type: String, 
        enum: ['Draft', 'Published', 'Closed'], 
        default: 'Draft' 
    },
    attachments: [{
        filename: String,
        file_url: String,
        uploaded_at: { type: Date, default: Date.now }
    }],
    submissions: [{
        student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        submitted_at: { type: Date },
        file_url: String,
        filename: String,
        marks_obtained: { type: Number, default: null },
        feedback: { type: String, default: '' },
        status: { 
            type: String, 
            enum: ['Not Submitted', 'Submitted', 'Graded'], 
            default: 'Not Submitted' 
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
