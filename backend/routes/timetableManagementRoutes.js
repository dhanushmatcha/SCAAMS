const express = require('express');
const router = express.Router();
const {
    getCurrentSemester,
    createSemester,
    getAllSemesters,
    updateSemester,
    createTimetableWithSemester,
    updateTimetableStatus,
    getLiveClassView,
    getUpcomingClassForecast
} = require('../controllers/timetableManagementController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

// Semester Management (Admin only)
router.get('/semester/current', authorize('Admin'), getCurrentSemester);
router.post('/semester', authorize('Admin'), createSemester);
router.get('/semesters', authorize('Admin'), getAllSemesters);
router.put('/semester/:id', authorize('Admin'), updateSemester);

// Timetable Management (Admin only)
router.post('/timetable', authorize('Admin'), createTimetableWithSemester);
router.put('/timetable/:id/status', authorize('Admin'), updateTimetableStatus);

// Live Class Monitoring (Admin only)
router.get('/live-classes', authorize('Admin'), getLiveClassView);

// Upcoming Class Forecast (All authenticated users)
router.get('/upcoming-classes', getUpcomingClassForecast);

module.exports = router;
