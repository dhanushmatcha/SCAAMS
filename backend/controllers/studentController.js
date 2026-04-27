const Timetable = require('../models/Timetable');
const Attendance = require('../models/Attendance');
const Notice = require('../models/Notice');
const Section = require('../models/Section');

const getStudentSchedule = async (req, res) => {
    try {
        const Section = require('../models/Section');
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        
        // Find student's section
        const studentSection = await Section.findOne({ students: req.user.id });
        if (!studentSection) {
            return res.json([]); // Return empty if student not assigned to any section
        }
        
        // Get schedule for student's section only
        const schedule = await Timetable.find({ 
            day_of_week: today,
            section_id: studentSection._id 
        })
            .populate('subject_id')
            .populate('faculty_id', 'name')
            .populate('classroom_id', 'room_number');
        res.json(schedule);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getStudentAttendance = async (req, res) => {
    try {
        // Find all attendance records where this student is present/absent
        const attendanceRecords = await Attendance.find({ 'records.student_id': req.user.id })
            .populate({
                path: 'timetable_id',
                populate: { path: 'subject_id' }
            });

        let totalClasses = 0;
        let presentClasses = 0;
        let subjectStats = {};

        attendanceRecords.forEach(record => {
            const studentRecord = record.records.find(r => r.student_id.toString() === req.user.id);
            if (!studentRecord) return;

            const subjectName = record.timetable_id?.subject_id?.name || 'Unknown Subject';

            if (!subjectStats[subjectName]) {
                subjectStats[subjectName] = { total: 0, present: 0 };
            }

            totalClasses++;
            subjectStats[subjectName].total++;

            if (studentRecord.status === 'Present') {
                presentClasses++;
                subjectStats[subjectName].present++;
            }
        });

        const overallPercentage = totalClasses === 0 ? 100 : Math.round((presentClasses / totalClasses) * 100);

        Object.keys(subjectStats).forEach(key => {
            subjectStats[key].percentage = Math.round((subjectStats[key].present / subjectStats[key].total) * 100);
        });

        res.json({
            overallPercentage,
            totalClasses,
            presentClasses,
            subjectStats,
            detailedRaw: attendanceRecords
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getStudentNotices = async (req, res) => {
    try {
        // Find student's section and department
        const studentSection = await Section.findOne({ students: req.user.id }).populate('department_id');
        if (!studentSection) {
            return res.json([]); // Return empty if student not assigned to any section
        }

        // Get all relevant notices: Global, Department-specific, and Section-specific
        const noticeQuery = [
            { target_audience: 'Global' },
            { target_audience: 'Section', section_id: studentSection._id }
        ];

        // Add department-specific notices only if department exists
        if (studentSection.department_id) {
            noticeQuery.push({ 
                target_audience: 'Department', 
                department_id: studentSection.department_id._id 
            });
        }

        const notices = await Notice.find({
            $or: noticeQuery
        })
        .populate('author_id', 'name')
        .sort({ createdAt: -1 })
        .limit(50); // Limit to latest 50 notices

        res.json(notices);
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

const getStudentUpcomingClasses = async (req, res) => {
    try {
        const Section = require('../models/Section');
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];
        const now = new Date();

        // Find student's section
        const studentSection = await Section.findOne({ students: req.user.id });
        if (!studentSection) {
            return res.json({ upcoming_classes: [], summary: {} });
        }

        // Get today's and tomorrow's classes
        const todayClasses = await Timetable.find({
            section_id: studentSection._id,
            day_of_week: today
        })
        .populate('subject_id', 'name code')
        .populate('faculty_id', 'name')
        .populate('classroom_id', 'room_number')
        .sort({ start_time: 1 });

        const tomorrow = days[(new Date().getDay() + 1) % 7];
        const tomorrowClasses = await Timetable.find({
            section_id: studentSection._id,
            day_of_week: tomorrow
        })
        .populate('subject_id', 'name code')
        .populate('faculty_id', 'name')
        .populate('classroom_id', 'room_number')
        .sort({ start_time: 1 });

        const nowTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        // Process today's classes
        const processedTodayClasses = todayClasses.map(classItem => {
            const [startHour, startMin] = classItem.start_time.split(':').map(Number);
            const [endHour, endMin] = classItem.end_time.split(':').map(Number);
            
            const classStartTime = new Date();
            classStartTime.setHours(startHour, startMin, 0, 0);
            
            const classEndTime = new Date();
            classEndTime.setHours(endHour, endMin, 0, 0);

            let classStatus = 'Upcoming';
            let timeRemaining = null;
            let timeUntilStart = null;

            if (now >= classStartTime && now <= classEndTime) {
                classStatus = 'In Progress';
                timeRemaining = Math.floor((classEndTime - now) / 1000 / 60);
            } else if (now > classEndTime) {
                classStatus = 'Completed';
            } else if (now < classStartTime) {
                timeUntilStart = Math.floor((classStartTime - now) / 1000 / 60);
            }

            return {
                id: classItem._id,
                subject: classItem.subject_id,
                faculty: classItem.faculty_id,
                classroom: classItem.classroom_id,
                start_time: classItem.start_time,
                end_time: classItem.end_time,
                status: classItem.status || 'Scheduled',
                class_status: classStatus,
                time_remaining: timeRemaining,
                time_until_start: timeUntilStart,
                day: 'Today'
            };
        });

        // Process tomorrow's classes
        const processedTomorrowClasses = tomorrowClasses.map(classItem => ({
            id: classItem._id,
            subject: classItem.subject_id,
            faculty: classItem.faculty_id,
            classroom: classItem.classroom_id,
            start_time: classItem.start_time,
            end_time: classItem.end_time,
            status: classItem.status || 'Scheduled',
            class_status: 'Upcoming',
            day: 'Tomorrow'
        }));

        // Combine and sort upcoming classes
        const upcomingClasses = [
            ...processedTodayClasses.filter(c => c.class_status === 'Upcoming'),
            ...processedTomorrowClasses
        ];

        res.json({
            current_date: now.toISOString().split('T')[0],
            current_time: nowTime,
            today_classes: processedTodayClasses,
            tomorrow_classes: processedTomorrowClasses,
            upcoming_classes: upcomingClasses,
            summary: {
                today_total: processedTodayClasses.length,
                today_upcoming: processedTodayClasses.filter(c => c.class_status === 'Upcoming').length,
                today_in_progress: processedTodayClasses.filter(c => c.class_status === 'In Progress').length,
                today_completed: processedTodayClasses.filter(c => c.class_status === 'Completed').length,
                tomorrow_total: processedTomorrowClasses.length
            }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getStudentClassUpdates = async (req, res) => {
    try {
        const Section = require('../models/Section');
        const User = require('../models/User');

        // Find student's section
        const studentSection = await Section.findOne({ students: req.user.id });
        if (!studentSection) {
            return res.json({ recent_updates: [], summary: {} });
        }

        const recentUpdates = await Timetable.find({
            section_id: studentSection._id,
            status_updated_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        })
        .populate('subject_id', 'name code')
        .populate('faculty_id', 'name')
        .populate('classroom_id', 'room_number')
        .populate('status_updated_by', 'name')
        .sort({ status_updated_at: -1 });

        const updates = recentUpdates.map(update => ({
            id: update._id,
            subject: update.subject_id,
            faculty: update.faculty_id,
            classroom: update.classroom_id,
            start_time: update.start_time,
            end_time: update.end_time,
            day_of_week: update.day_of_week,
            status: update.status,
            status_reason: update.status_reason,
            updated_by: update.status_updated_by,
            updated_at: update.status_updated_at
        }));

        res.json({
            student_id: req.user.id,
            section: studentSection.name,
            recent_updates: updates,
            summary: {
                total_updates: updates.length,
                cancelled_classes: updates.filter(u => u.status === 'Cancelled').length,
                shifted_classes: updates.filter(u => u.status === 'Shifted').length,
                last_update: updates.length > 0 ? updates[0].updated_at : null
            }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getStudentTimetable = async (req, res) => {
    try {
        const Section = require('../models/Section');
        // Find student's section (more robust than just checking student.section_id)
        const studentSection = await Section.findOne({ students: req.user.id });
        
        let sectionId;
        if (!studentSection) {
            // Fallback to checking student document if not in any section's student list
            const student = await User.findById(req.user.id);
            if (!student || !student.section_id) {
                return res.json([]); // Return empty array instead of 404 to avoid frontend errors
            }
            sectionId = student.section_id;
        } else {
            sectionId = studentSection._id;
        }

        // Get timetable for student's section
        const timetable = await Timetable.find({ 
            section_id: sectionId 
        })
        .populate('subject_id', 'name code')
        .populate('faculty_id', 'name')
        .populate('classroom_id', 'room_number')
        .sort({ day_of_week: 1, start_time: 1 });

        res.json(timetable);
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

const getStudentMarks = async (req, res) => {
    try {
        const ExamMark = require('../models/ExamMark');
        const marks = await ExamMark.find({ student_id: req.user.id })
            .populate('section_id', 'name semester')
            .populate('subject_id', 'name code')
            .populate('faculty_id', 'name email');

        res.json(marks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getStudentSchedule, getStudentAttendance, getStudentNotices, getStudentUpcomingClasses, getStudentClassUpdates, getStudentTimetable, getStudentMarks };
