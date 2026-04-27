const express = require('express');
const router = express.Router();
const { processScan } = require('../controllers/hardwareController');

// POST /api/hardware/scan (called by ESP32 or Python Facial Rec script)
router.post('/scan', processScan);

module.exports = router;
