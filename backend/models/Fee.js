const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    academic_year: { type: String, required: true },
    semester: { type: Number, required: true },
    total_amount: { type: Number, required: true },
    paid_amount: { type: Number, default: 0 },
    due_date: { type: Date },
    status: { 
        type: String, 
        enum: ['Paid', 'Partial', 'Pending'], 
        default: 'Pending' 
    },
    payment_history: [{
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        method: { type: String, enum: ['Cash', 'Online', 'Bank Transfer', 'Cheque'] },
        transaction_id: { type: String },
        remarks: { type: String }
    }]
}, { timestamps: true });

// Virtual for pending amount
feeSchema.virtual('pending_amount').get(function() {
    return this.total_amount - this.paid_amount;
});

feeSchema.set('toJSON', { virtuals: true });
feeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Fee', feeSchema);
