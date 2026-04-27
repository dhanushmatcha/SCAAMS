const express = require('express');
const router = express.Router();
const { sendLowAttendanceAlerts, getCronJobStatus, runDailyAttendanceCheck } = require('../controllers/alertController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(authorize('Admin'));

router.post('/send-alerts', sendLowAttendanceAlerts);
router.get('/cron-status', getCronJobStatus);
router.post('/run-daily-check', runDailyAttendanceCheck);

module.exports = router;
