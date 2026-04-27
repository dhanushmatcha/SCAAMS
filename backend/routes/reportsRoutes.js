const express = require('express');
const router = express.Router();
const {
    getDepartmentWiseAttendance,
    getCourseWiseAttendance,
    getFacultyWiseAttendance,
    getLowAttendanceStudents,
    getClassUtilizationStats,
    getFacultyAttendanceHistory,
    getFacultyAttendanceTrends,
    getStudentAttendanceBySubject
} = require('../controllers/reportsController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

// Admin Reports
router.get('/admin/department-wise', authorize('Admin'), getDepartmentWiseAttendance);
router.get('/admin/course-wise', authorize('Admin'), getCourseWiseAttendance);
router.get('/admin/faculty-wise', authorize('Admin'), getFacultyWiseAttendance);
router.get('/admin/low-attendance-students', authorize('Admin'), getLowAttendanceStudents);
router.get('/admin/class-utilization', authorize('Admin'), getClassUtilizationStats);

// Faculty Reports
router.get('/faculty/attendance-history', authorize('Faculty'), getFacultyAttendanceHistory);
router.get('/faculty/attendance-trends', authorize('Faculty'), getFacultyAttendanceTrends);

// Student Dashboard
router.get('/student/attendance-by-subject', authorize('Student'), getStudentAttendanceBySubject);

module.exports = router;
