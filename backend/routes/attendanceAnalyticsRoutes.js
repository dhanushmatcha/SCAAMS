const express = require('express');
const router = express.Router();
const {
    getDailyAttendanceAnalytics,
    getWeeklyAttendanceAnalytics,
    getMonthlyAttendanceAnalytics,
    getSubjectWiseAttendanceAnalytics
} = require('../controllers/attendanceAnalyticsController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(authorize('Admin')); // Only admins can access detailed analytics

router.get('/daily', getDailyAttendanceAnalytics);
router.get('/weekly', getWeeklyAttendanceAnalytics);
router.get('/monthly', getMonthlyAttendanceAnalytics);
router.get('/subject-wise', getSubjectWiseAttendanceAnalytics);

module.exports = router;
