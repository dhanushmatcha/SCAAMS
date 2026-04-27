const Timetable = require('../models/Timetable');
const Semester = require('../models/Semester');
const Classroom = require('../models/Classroom');
const Subject = require('../models/Subject');
const Section = require('../models/Section');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

// Get current active semester
const getCurrentSemester = async (req, res) => {
    try {
        const currentSemester = await Semester.getCurrentSemester();
        if (!currentSemester) {
            return res.status(404).json({ message: 'No active semester found' });
        }
        res.json(currentSemester);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// Create new semester
const createSemester = async (req, res) => {
    try {
        const semesterData = {
            ...req.body,
            created_by: req.user.id,
            is_current: req.body.is_current || false
        };

        // If setting as current, unset previous current semester
        if (req.body.is_current) {
            await Semester.updateMany({}, { is_current: false });
        }

        const semester = await Semester.create(semesterData);
        const populatedSemester = await Semester.findById(semester._id)
            .populate('departments', 'name')
            .populate('created_by', 'name');

        res.status(201).json(populatedSemester);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// Get all semesters
const getAllSemesters = async (req, res) => {
    try {
        const semesters = await Semester.find()
            .populate('departments', 'name')
            .populate('created_by', 'name')
            .sort({ created_at: -1 });

        res.json(semesters);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// Update semester
const updateSemester = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = {
            ...req.body,
            updated_by: req.user.id,
            updated_at: new Date()
        };

        const semester = await Semester.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        )
        .populate('departments', 'name')
        .populate('created_by', 'name')
        .populate('updated_by', 'name');

        if (!semester) {
            return res.status(404).json({ message: 'Semester not found' });
        }

        res.json(semester);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// Create timetable with semester management
const createTimetableWithSemester = async (req, res) => {
    try {
        const currentSemester = await Semester.getCurrentSemester();
        if (!currentSemester) {
            return res.status(400).json({ message: 'No active semester found' });
        }

        const timetableData = {
            ...req.body,
            semester: currentSemester.semester_number,
            academic_year: currentSemester.academic_year,
            status: 'Scheduled',
            effective_date: new Date()
        };

        const timetable = await Timetable.create(timetableData);
        const populatedTimetable = await Timetable.findById(timetable._id)
            .populate('section_id', 'name semester')
            .populate('subject_id', 'name code')
            .populate('faculty_id', 'name')
            .populate('classroom_id', 'room_number');

        res.status(201).json(populatedTimetable);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// Update timetable status
const updateTimetableStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, status_reason } = req.body;

        const updateData = {
            status,
            status_reason,
            status_updated_by: req.user.id,
            status_updated_at: new Date()
        };

        const timetable = await Timetable.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        )
        .populate('section_id', 'name semester')
            .populate('subject_id', 'name code')
            .populate('faculty_id', 'name')
            .populate('classroom_id', 'room_number')
            .populate('status_updated_by', 'name');

        if (!timetable) {
            return res.status(404).json({ message: 'Timetable not found' });
        }

        // Emit real-time update to all connected clients
        const io = req.app.get('socketio');
        if (io) {
            io.emit('timetable_status_updated', {
                timetable_id: id,
                status,
                status_reason,
                updated_by: req.user.name,
                timestamp: new Date()
            });
        }

        res.json(timetable);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// Get live class view for admin
const getLiveClassView = async (req, res) => {
    try {
        const now = new Date();
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        // Get all current timetables
        const currentTimetables = await Timetable.find({
            status: { $in: ['Scheduled', 'In Progress'] },
            effective_date: { $lte: now },
            expiry_date: { $gte: now }
        })
        .populate('section_id', 'name semester')
        .populate('subject_id', 'name code')
        .populate('faculty_id', 'name email')
        .populate('classroom_id', 'room_number capacity')
        .populate('status_updated_by', 'name');

        // Get room occupancy
        const allRooms = await Classroom.find();
        const occupiedRoomIds = [];

        for (const timetable of currentTimetables) {
            const [startHour, startMin] = timetable.start_time.split(':').map(Number);
            const [endHour, endMin] = timetable.end_time.split(':').map(Number);
            
            const classStartTime = new Date();
            classStartTime.setHours(startHour, startMin, 0, 0);
            
            const classEndTime = new Date();
            classEndTime.setHours(endHour, endMin, 0, 0);

            const classInfo = {
                id: timetable._id,
                subject: timetable.subject_id,
                section: timetable.section_id,
                faculty: timetable.faculty_id,
                classroom: timetable.classroom_id,
                status: timetable.status,
                start_time: timetable.start_time,
                end_time: timetable.end_time,
                day_of_week: timetable.day_of_week
            };

            if (now >= classStartTime && now <= classEndTime && timetable.status === 'In Progress') {
                // Live class
                classInfo.is_live = true;
                classInfo.time_remaining = Math.floor((classEndTime - now) / 1000 / 60); // minutes remaining
                
                // Get attendance data
                const todayAttendance = await Attendance.findOne({
                    timetable_id: timetable._id,
                    date: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()), $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) }
                });

                if (todayAttendance) {
                    classInfo.attendance = {
                        total_students: todayAttendance.records.length,
                        present_count: todayAttendance.records.filter(r => r.status === 'Present' || r.status === 'Late').length,
                        absent_count: todayAttendance.records.filter(r => r.status === 'Absent').length,
                        attendance_rate: todayAttendance.records.length > 0 ? 
                            Math.round((todayAttendance.records.filter(r => r.status === 'Present' || r.status === 'Late').length / todayAttendance.records.length) * 100) : 0
                    };
                }

                liveClasses.push(classInfo);
                occupiedRoomIds.push(timetable.classroom_id._id);
            } else if (now < classStartTime && timetable.status === 'Scheduled') {
                // Upcoming class
                classInfo.time_until_start = Math.floor((classStartTime - now) / 1000 / 60); // minutes until start
                upcomingClasses.push(classInfo);
            }
        }

        // Get room occupancy status
        const roomStatus = allRooms.map(room => {
            const isOccupied = occupiedRoomIds.includes(room._id);
            const currentClass = liveClasses.find(lc => lc.classroom_id._id.toString() === room._id.toString());
            
            return {
                room_id: room._id,
                room_number: room.room_number,
                capacity: room.capacity,
                is_occupied: isOccupied,
                current_class: currentClass || null,
                occupancy_rate: isOccupied ? Math.round((currentClass?.attendance?.present_count || 0) / room.capacity * 100) : 0
            };
        });

        res.json({
            timestamp: now,
            current_day: currentDay,
            current_time: currentTime,
            live_classes: liveClasses,
            upcoming_classes: upcomingClasses,
            room_occupancy: roomStatus,
            summary: {
                total_live_classes: liveClasses.length,
                total_upcoming_classes: upcomingClasses.length,
                occupied_rooms: occupiedRooms.length,
                total_rooms: allRooms.length
            }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// Get upcoming class forecast
const getUpcomingClassForecast = async (req, res) => {
    try {
        const { days_ahead = 7 } = req.query; // Default to 7 days
        const now = new Date();
        const endDate = new Date(now.getTime() + (parseInt(days_ahead) * 24 * 60 * 60 * 1000));

        const upcomingTimetables = await Timetable.find({
            status: { $in: ['Scheduled', 'In Progress'] },
            effective_date: { $lte: endDate },
            expiry_date: { $gte: now }
        })
        .populate('section_id', 'name semester')
        .populate('subject_id', 'name code')
        .populate('faculty_id', 'name')
        .populate('classroom_id', 'room_number')
        .sort({ day_of_week: 1, start_time: 1 });

        // Group by day
        const forecastByDay = {};
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        for (let i = 0; i < parseInt(days_ahead); i++) {
            const forecastDate = new Date(now);
            forecastDate.setDate(now.getDate() + i);
            const dayName = forecastDate.toLocaleDateString('en-US', { weekday: 'long' });
            
            const dayClasses = upcomingTimetables.filter(timetable => 
                timetable.day_of_week === dayName &&
                new Date(timetable.effective_date).toDateString() === forecastDate.toDateString()
            );

            forecastByDay[dayName] = {
                date: forecastDate.toISOString().split('T')[0],
                day_name: dayName,
                classes: dayClasses.map(timetable => ({
                    id: timetable._id,
                    subject: timetable.subject_id,
                    section: timetable.section_id,
                    faculty: timetable.faculty_id,
                    classroom: timetable.classroom_id,
                    start_time: timetable.start_time,
                    end_time: timetable.end_time,
                    status: timetable.status
                }))
            };
        }

        res.json({
            forecast_period: `${days_ahead} days from ${now.toISOString().split('T')[0]}`,
            generated_at: now.toISOString(),
            forecast_by_day: forecastByDay
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = {
    getCurrentSemester,
    createSemester,
    getAllSemesters,
    updateSemester,
    createTimetableWithSemester,
    updateTimetableStatus,
    getLiveClassView,
    getUpcomingClassForecast
};
