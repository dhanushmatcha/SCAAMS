const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
    room_number: { type: String, required: true, unique: true },
    capacity: { type: Number, required: true },
    features: [{ type: String }] // e.g., "Projector", "Smartboard", "AC"
}, { timestamps: true });

module.exports = mongoose.model('Classroom', classroomSchema);
