const express = require('express');
const router = express.Router();
const { getStudentSchedule, getStudentAttendance, getStudentNotices, getStudentUpcomingClasses, getStudentClassUpdates, getStudentTimetable, getStudentMarks } = require('../controllers/studentController');
const { getStudentProgressSummary } = require('../controllers/analyticsController');
const { getStudentFees } = require('../controllers/feeController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(authorize('Student'));

router.get('/schedule', getStudentSchedule);
router.get('/attendance', getStudentAttendance);
router.get('/notices', getStudentNotices);
router.get('/upcoming-classes', getStudentUpcomingClasses);
router.get('/class-updates', getStudentClassUpdates);
router.get('/timetable', getStudentTimetable);
router.get('/marks', getStudentMarks);
router.get('/progress-summary', getStudentProgressSummary);
router.get('/fees', getStudentFees);

module.exports = router;
