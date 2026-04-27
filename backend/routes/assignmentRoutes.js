const express = require('express');
const router = express.Router();
const {
    getFacultyAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    submitAssignment,
    gradeSubmission,
    getStudentAssignments
} = require('../controllers/assignmentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

// Faculty routes
router.get('/faculty', authorize('Faculty'), getFacultyAssignments);
router.post('/', authorize('Faculty'), createAssignment);
router.put('/:id', authorize('Faculty'), updateAssignment);
router.delete('/:id', authorize('Faculty'), deleteAssignment);
router.post('/:id/grade', authorize('Faculty'), gradeSubmission);

// Student routes
router.post('/:id/submit', authorize('Student'), submitAssignment);
router.get('/student', authorize('Student'), getStudentAssignments);

module.exports = router;
