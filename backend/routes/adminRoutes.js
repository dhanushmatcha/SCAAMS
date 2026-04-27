const express = require('express');
const router = express.Router();
const {
    getUsers, getDashboardStats,
    getDepartments, getSections, getSubjects, getClassrooms, getTimetables,
    createDepartment, createSection, createSubject, createClassroom, createTimetable,
    assignSectionsToFaculty, assignSectionTeacher, getSectionAssignments,
    generateTimetableForFaculty, getAllQuestionPapers, getAllExamMarks,
    getAcademicCalendar, createAcademicCalendar, updateAcademicCalendar, deleteAcademicCalendar,
    bulkCreateUsers, bulkDeleteUsers, bulkUpdateUsers,
    synchronizeAssignedSections, checkSectionMismatch, syncAllFacultySections,
    getSectionDetails, assignStudentsToSection, getAvailableStudents,
    shuffleStudentsInDepartment, getStudentHistoryByRegdNo
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { getAttendanceAnalytics } = require('../controllers/attendanceController');
const { getAdvancedAnalytics, getRiskReport } = require('../controllers/analyticsController');

router.use(protect);
router.use(authorize('Admin'));

router.get('/users', getUsers);
router.get('/stats', getDashboardStats);
router.get('/analytics/attendance', getAttendanceAnalytics);
router.get('/analytics/advanced', getAdvancedAnalytics);
router.get('/analytics/risk-report', getRiskReport);

router.get('/department', getDepartments);
router.get('/section', getSections);
router.get('/subject', getSubjects);
router.get('/classroom', getClassrooms);
router.get('/timetable', getTimetables);

router.post('/department', createDepartment);
router.post('/section', createSection);
router.post('/subject', createSubject);
router.post('/classroom', createClassroom);
router.post('/timetable', createTimetable);
router.post('/assign-sections', assignSectionsToFaculty);
router.post('/assign-teacher', assignSectionTeacher);
router.get('/section-assignments', getSectionAssignments);

// NEW: Section Details and Student Assignment Routes
router.get('/section/:sectionId/details', getSectionDetails);
router.post('/section/:sectionId/assign-students', assignStudentsToSection);
router.get('/students/available', getAvailableStudents);
router.post('/shuffle-students', shuffleStudentsInDepartment);
router.get('/student/history/:regdNo', authorize('Admin', 'Faculty'), getStudentHistoryByRegdNo);

router.post('/generate-timetable', generateTimetableForFaculty);

// SYNCHRONIZATION & DIAGNOSTIC ROUTES
router.post('/sync-assigned-sections', synchronizeAssignedSections);
router.post('/check-mismatch', checkSectionMismatch);
router.post('/sync-all-faculty-sections', syncAllFacultySections);
router.get('/question-papers', getAllQuestionPapers);
router.get('/exam-marks', getAllExamMarks);

// Bulk User Operations
router.post('/users/bulk-create', bulkCreateUsers);
router.delete('/users/bulk-delete', bulkDeleteUsers);
router.put('/users/bulk-update', bulkUpdateUsers);

router.get('/section/:sectionId/timetable', (req, res, next) => {
    const Timetable = require('../models/Timetable');
    Timetable.find({ section_id: req.params.sectionId })
        .populate('subject_id', 'name code')
        .populate('faculty_id', 'name')
        .populate('classroom_id', 'room_number')
        .sort({ day_of_week: 1, start_time: 1 })
        .then(tt => res.json(tt))
        .catch(err => res.status(500).json({ message: err.message }));
});

// Academic Calendar Routes
router.get('/academic-calendar', getAcademicCalendar);
router.post('/academic-calendar', createAcademicCalendar);
router.put('/academic-calendar/:id', updateAcademicCalendar);
router.delete('/academic-calendar/:id', deleteAcademicCalendar);

module.exports = router;
