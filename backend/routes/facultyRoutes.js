const express = require('express');
const router = express.Router();
const { getSchedule, getStudentsForSection, markAttendance, createNotice, getAssignedSections, getTargetingOptions, getCurrentClassForAttendance, updateClassStatus, getFacultyClassesForToday, getSubstituteClassesForToday, getFacultyTimetable, uploadQuestionPaper, submitExamMarksBulk, getFacultyQuestionPapers, getFacultyExamMarks, getAssignmentValidationContext, updateCODefinitions, getAttainmentReport, getSubstitutionSuggestions, getStudentHistoryByRegdNo } = require('../controllers/facultyController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(authorize('Faculty'));

router.get('/schedule', getSchedule);
router.get('/students/:sectionId', getStudentsForSection);
router.post('/attendance', markAttendance);
router.post('/notice', createNotice);
router.get('/assigned-sections', getAssignedSections);
router.get('/targeting-options', getTargetingOptions);
router.post('/question-paper', uploadQuestionPaper);
router.post('/marks/bulk', submitExamMarksBulk);
router.get('/question-papers', getFacultyQuestionPapers);
router.get('/marks', getFacultyExamMarks);
router.get('/assignments/context', getAssignmentValidationContext);
router.get('/current-class', getCurrentClassForAttendance);
router.put('/class-status', updateClassStatus);
router.get('/today-classes', getFacultyClassesForToday);
router.get('/substitute-classes', getSubstituteClassesForToday);
router.get('/timetable', getFacultyTimetable);

// NEW: CO-PO and Substitution Routes
router.put('/co-definitions', updateCODefinitions);
router.get('/attainment-report', getAttainmentReport);
router.get('/substitution-suggestions/:timetable_id', getSubstitutionSuggestions);
router.get('/student/history/:regdNo', authorize('Faculty', 'Admin'), getStudentHistoryByRegdNo);

module.exports = router;
