const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    description: { type: String },
    hod: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Link to Faculty role
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
