const Fee = require('../models/Fee');
const User = require('../models/User');

// @desc    Get fees for logged-in student
// @route   GET /api/student/fees
// @access  Student
const getStudentFees = async (req, res) => {
    try {
        const fees = await Fee.find({ student_id: req.user.id }).sort({ createdAt: -1 });
        res.json(fees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all fees (Admin)
// @route   GET /api/admin/fees
// @access  Admin
const getAllFees = async (req, res) => {
    try {
        const fees = await Fee.find()
            .populate('student_id', 'name regd_no department section_id')
            .sort({ createdAt: -1 });
        res.json(fees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add or Update fee record (Admin)
// @route   POST /api/admin/fees
// @access  Admin
const updateFeeRecord = async (req, res) => {
    try {
        const { student_id, academic_year, semester, total_amount, paid_amount, payment_entry } = req.body;

        let fee = await Fee.findOne({ student_id, academic_year, semester });

        if (fee) {
            if (total_amount) fee.total_amount = total_amount;
            if (paid_amount !== undefined) fee.paid_amount = paid_amount;
            
            if (payment_entry) {
                fee.payment_history.push(payment_entry);
                fee.paid_amount += payment_entry.amount;
            }
            
            // Update status
            if (fee.paid_amount >= fee.total_amount) fee.status = 'Paid';
            else if (fee.paid_amount > 0) fee.status = 'Partial';
            else fee.status = 'Pending';

            await fee.save();
        } else {
            fee = await Fee.create({
                student_id, academic_year, semester, total_amount, paid_amount,
                status: (paid_amount >= total_amount) ? 'Paid' : (paid_amount > 0 ? 'Partial' : 'Pending'),
                payment_history: payment_entry ? [payment_entry] : []
            });
        }

        res.json(fee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getStudentFees,
    getAllFees,
    updateFeeRecord
};
