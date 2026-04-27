const Assignment = require('../models/Assignment');
const SectionAssignment = require('../models/SectionAssignment');
const User = require('../models/User');
const Section = require('../models/Section');

const validateFacultyAssignment = async (facultyId, sectionId, subjectId) => {
    return await SectionAssignment.exists({
        faculty_id: facultyId,
        section_id: sectionId,
        subject_id: subjectId,
        role: 'Teacher'
    });
};

const getFacultyAssignments = async (req, res) => {
    try {
        const assignments = await Assignment.find({ faculty_id: req.user.id })
            .populate('subject_id', 'name code')
            .populate('section_id', 'name semester')
            .sort({ due_date: -1 });
        res.json(assignments);
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

const createAssignment = async (req, res) => {
    try {
        const { section_id, subject_id } = req.body;
        if (!section_id || !subject_id) {
            return res.status(400).json({ message: 'Section and subject are required' });
        }

        const assigned = await validateFacultyAssignment(req.user.id, section_id, subject_id);
        if (!assigned) {
            return res.status(403).json({ message: 'Unauthorized to create assignments for this section or subject' });
        }

        const assignment = await Assignment.create({
            ...req.body,
            faculty_id: req.user.id
        });
        
        const populatedAssignment = await Assignment.findById(assignment._id)
            .populate('subject_id', 'name code')
            .populate('section_id', 'name semester')
            .populate('faculty_id', 'name');
            
        // If assignment is published immediately, notify students
        if (populatedAssignment.status === 'Published') {
            await notifyStudentsAboutAssignment(populatedAssignment);
        }

        res.status(201).json(populatedAssignment);
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

const updateAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const assignment = await Assignment.findById(id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        if (assignment.faculty_id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to update this assignment' });
        }

        const sectionId = req.body.section_id ? req.body.section_id : assignment.section_id;
        const subjectId = req.body.subject_id ? req.body.subject_id : assignment.subject_id;
        const isValid = await validateFacultyAssignment(req.user.id, sectionId, subjectId);

        if (!isValid) {
            return res.status(403).json({ message: 'Unauthorized to update assignment for this section or subject' });
        }

        // Check if status is being changed to Published
        const wasPublished = assignment.status === 'Published';
        const isPublishing = req.body.status === 'Published' && !wasPublished;

        const updatedAssignment = await Assignment.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        )
        .populate('subject_id', 'name code')
        .populate('section_id', 'name semester')
        .populate('faculty_id', 'name');

        // If assignment is being published, notify all students in the section
        if (isPublishing) {
            await notifyStudentsAboutAssignment(updatedAssignment);
        }

        res.json(updatedAssignment);
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

const deleteAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const assignment = await Assignment.findById(id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        if (assignment.faculty_id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to delete this assignment' });
        }

        await Assignment.findByIdAndDelete(id);
        res.json({ message: 'Assignment deleted successfully' });
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

const submitAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const { file_url, filename } = req.body;
        
        const assignment = await Assignment.findById(id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        
        // Check if student has already submitted
        const existingSubmission = assignment.submissions.find(
            sub => sub.student_id.toString() === req.user.id
        );
        
        if (existingSubmission) {
            // Update existing submission
            existingSubmission.submitted_at = new Date();
            existingSubmission.file_url = file_url;
            existingSubmission.filename = filename;
            existingSubmission.status = 'Submitted';
        } else {
            // Add new submission
            assignment.submissions.push({
                student_id: req.user.id,
                submitted_at: new Date(),
                file_url,
                filename,
                status: 'Submitted'
            });
        }
        
        await assignment.save();
        
        res.json({ message: 'Assignment submitted successfully' });
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

const gradeSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const { student_id, marks_obtained, feedback } = req.body;
        
        const assignment = await Assignment.findById(id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        if (assignment.faculty_id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to grade this submission' });
        }
        
        // Find and update the student's submission
        const submission = assignment.submissions.find(
            sub => sub.student_id.toString() === student_id
        );
        
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }
        
        submission.marks_obtained = marks_obtained;
        submission.feedback = feedback;
        submission.status = 'Graded';
        
        await assignment.save();
        
        res.json({ message: 'Submission graded successfully' });
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

const getStudentAssignments = async (req, res) => {
    try {
        const Section = require('../models/Section');
        
        // Find student's section
        const studentSection = await Section.findOne({ students: req.user.id });
        if (!studentSection) {
            return res.json([]);
        }
        
        const assignments = await Assignment.find({ 
            section_id: studentSection._id,
            status: 'Published'
        })
        .populate('subject_id', 'name code')
        .populate('faculty_id', 'name')
        .sort({ due_date: 1 });
        
        // Add submission status for current student
        const assignmentsWithStatus = assignments.map(assignment => {
            const submission = assignment.submissions.find(
                sub => sub.student_id.toString() === req.user.id
            );
            
            return {
                ...assignment.toObject(),
                submissionStatus: submission ? submission.status : 'Not Submitted',
                submittedAt: submission ? submission.submitted_at : null,
                marksObtained: submission ? submission.marks_obtained : null,
                feedback: submission ? submission.feedback : null
            };
        });
        
        res.json(assignmentsWithStatus);
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

// NEW: Helper function to notify students about a published assignment
const notifyStudentsAboutAssignment = async (assignment) => {
    try {
        // Get all students in the section
        const section = await Section.findById(assignment.section_id).populate('students');
        if (!section || !section.students || section.students.length === 0) {
            return;
        }

        const notificationMessage = `New ${assignment.type} "${assignment.title}" has been assigned in ${assignment.section_id?.name || 'your section'}. Due: ${new Date(assignment.due_date).toLocaleDateString()}`;
        
        // Create notifications for all students in the section
        const updatePromises = section.students.map(student =>
            User.findByIdAndUpdate(
                student._id,
                {
                    $push: {
                        assignment_notifications: {
                            title: `New ${assignment.type} Assignment`,
                            message: notificationMessage,
                            assignment_id: assignment._id,
                            type: 'assignment',
                            priority: 'medium',
                            date: new Date(),
                            read: false
                        }
                    }
                },
                { new: true }
            )
        );

        await Promise.all(updatePromises);
    } catch (error) {
        console.error('Error notifying students about assignment:', error);
    }
};

module.exports = {
    getFacultyAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    submitAssignment,
    gradeSubmission,
    getStudentAssignments,
    notifyStudentsAboutAssignment
};
