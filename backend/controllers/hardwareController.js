const User = require('../models/User');

const processScan = async (req, res) => {
    try {
        const { hardware_id, rfid_uid, facial_id, location } = req.body;
        
        let student;
        if (rfid_uid) {
            student = await User.findOne({ role: 'Student', 'rfid_uid': rfid_uid });
            // Fallback for simulation: match by regd_no if rfid_uid wasn't explicitly modeled yet
            if (!student) student = await User.findOne({ role: 'Student', 'regd_no': rfid_uid });
        } else if (facial_id) {
            student = await User.findOne({ role: 'Student', 'regd_no': facial_id });
        }

        if (!student) {
            return res.status(404).json({ message: 'Student not recognized' });
        }

        // Get the io instance
        const io = req.app.get('socketio');
        if (io) {
            // Emitting to all connected clients (in production, emit to a specific hardware room or faculty room)
            io.emit('student_scanned', { student_id: student._id, scan_type: rfid_uid ? 'RFID' : 'Facial' });
        }

        res.status(200).json({ message: 'Scan processed successfully', student: { name: student.name, regd_no: student.regd_no } });
    } catch (error) {
        console.error('Hardware Scan Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { processScan };
