const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Timetable = require('../models/Timetable');
const Subject = require('../models/Subject');
const Section = require('../models/Section');
const Department = require('../models/Department');

const getDailyAttendanceAnalytics = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(targetDate.getDate() + 1);

        const dailyAttendance = await Attendance.find({
            date: { $gte: targetDate, $lt: nextDay }
        })
        .populate({
            path: 'timetable_id',
            populate: [
                { path: 'subject_id', select: 'name code' },
                { path: 'section_id', select: 'name semester' },
                { path: 'faculty_id', select: 'name' }
            ]
        });

        const analytics = {
            date: targetDate.toISOString().split('T')[0],
            totalClasses: dailyAttendance.length,
            totalStudents: dailyAttendance.reduce((sum, att) => sum + att.records.length, 0),
            totalPresent: dailyAttendance.reduce((sum, att) => 
                sum + att.records.filter(r => r.status === 'Present' || r.status === 'Late').length, 0),
            totalAbsent: dailyAttendance.reduce((sum, att) => 
                sum + att.records.filter(r => r.status === 'Absent').length, 0),
            classDetails: dailyAttendance.map(att => ({
                subject: att.timetable_id?.subject_id?.name || 'Unknown',
                section: att.timetable_id?.section_id?.name || 'Unknown',
                faculty: att.timetable_id?.faculty_id?.name || 'Unknown',
                totalStudents: att.records.length,
                presentCount: att.records.filter(r => r.status === 'Present' || r.status === 'Late').length,
                absentCount: att.records.filter(r => r.status === 'Absent').length,
                attendanceRate: att.records.length > 0 ? 
                    Math.round((att.records.filter(r => r.status === 'Present' || r.status === 'Late').length / att.records.length) * 100) : 0
            }))
        };

        res.json(analytics);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getWeeklyAttendanceAnalytics = async (req, res) => {
    try {
        const { weekStart } = req.query;
        const startDate = weekStart ? new Date(weekStart) : new Date();
        const dayOfWeek = startDate.getDay();
        const weekStartDate = new Date(startDate);
        weekStartDate.setDate(startDate.getDate() - dayOfWeek);
        weekStartDate.setHours(0, 0, 0, 0);

        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekStartDate.getDate() + 7);

        const weeklyAttendance = await Attendance.find({
            date: { $gte: weekStartDate, $lt: weekEndDate }
        })
        .populate('timetable_id', 'subject_id name')
        .sort({ date: 1 });

        const dailyBreakdown = [];
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(weekStartDate);
            currentDate.setDate(weekStartDate.getDate() + i);
            const dayAttendance = weeklyAttendance.filter(att => 
                att.date.toDateString() === currentDate.toDateString()
            );

            dailyBreakdown.push({
                date: currentDate.toISOString().split('T')[0],
                dayName: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
                totalClasses: dayAttendance.length,
                totalStudents: dayAttendance.reduce((sum, att) => sum + att.records.length, 0),
                totalPresent: dayAttendance.reduce((sum, att) => 
                    sum + att.records.filter(r => r.status === 'Present' || r.status === 'Late').length, 0),
                totalAbsent: dayAttendance.reduce((sum, att) => 
                    sum + att.records.filter(r => r.status === 'Absent').length, 0)
            });
        }

        const weeklyRate = weeklyAttendance.length > 0 ? 
                weeklyAttendance.reduce((sum, att) => 
                    sum + ((att.records.filter(r => r.status === 'Present' || r.status === 'Late').length / att.records.length) * 100), 0) / weeklyAttendance.length : 0;
            
            const weeklyStats = {
                weekStart: weekStartDate.toISOString().split('T')[0],
                weekEnd: weekEndDate.toISOString().split('T')[0],
                totalClasses: weeklyAttendance.length,
                totalStudents: weeklyAttendance.reduce((sum, att) => sum + att.records.length, 0),
                totalPresent: weeklyAttendance.reduce((sum, att) => 
                    sum + att.records.filter(r => r.status === 'Present' || r.status === 'Late').length, 0),
                totalAbsent: weeklyAttendance.reduce((sum, att) => 
                    sum + att.records.filter(r => r.status === 'Absent').length, 0),
                averageAttendanceRate: Math.round(weeklyRate),
                dailyBreakdown
            };

        res.json(weeklyStats);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getMonthlyAttendanceAnalytics = async (req, res) => {
    try {
        const { month, year } = req.query;
        const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
        const targetYear = year ? parseInt(year) : new Date().getFullYear();
        
        const monthStart = new Date(targetYear, targetMonth, 1);
        const monthEnd = new Date(targetYear, targetMonth + 1, 0);

        const monthlyAttendance = await Attendance.find({
            date: { $gte: monthStart, $lt: monthEnd }
        })
        .populate('timetable_id', 'subject_id name')
        .sort({ date: 1 });

        const weeklyBreakdown = [];
        const weeksInMonth = Math.ceil(monthEnd.getDate() / 7);
        
        for (let week = 0; week < weeksInMonth; week++) {
            const weekStart = new Date(monthStart);
            weekStart.setDate(monthStart.getDate() + (week * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            const weekAttendance = monthlyAttendance.filter(att => 
                att.date >= weekStart && att.date <= weekEnd
            );

            weeklyBreakdown.push({
                weekNumber: week + 1,
                weekStart: weekStart.toISOString().split('T')[0],
                weekEnd: weekEnd.toISOString().split('T')[0],
                totalClasses: weekAttendance.length,
                totalStudents: weekAttendance.reduce((sum, att) => sum + att.records.length, 0),
                totalPresent: weekAttendance.reduce((sum, att) => 
                    sum + att.records.filter(r => r.status === 'Present' || r.status === 'Late').length, 0),
                totalAbsent: weekAttendance.reduce((sum, att) => 
                    sum + att.records.filter(r => r.status === 'Absent').length, 0),
                attendanceRate: weekAttendance.length > 0 ? 
                    Math.round((weekAttendance.reduce((sum, att) => 
                        sum + (att.records.filter(r => r.status === 'Present' || r.status === 'Late').length / att.records.length) * 100, 0)) / weekAttendance.length) : 0
            });
        }

        const monthlyStats = {
            month: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            totalClasses: monthlyAttendance.length,
            totalStudents: monthlyAttendance.reduce((sum, att) => sum + att.records.length, 0),
            totalPresent: monthlyAttendance.reduce((sum, att) => 
                sum + att.records.filter(r => r.status === 'Present' || r.status === 'Late').length, 0),
            totalAbsent: monthlyAttendance.reduce((sum, att) => 
                sum + att.records.filter(r => r.status === 'Absent').length, 0),
            averageAttendanceRate: monthlyAttendance.length > 0 ? 
                Math.round(monthlyAttendance.reduce((sum, att) => 
                    sum + (att.records.filter(r => r.status === 'Present' || r.status === 'Late').length / att.records.length) * 100, 0) / monthlyAttendance.length) : 0,
            weeklyBreakdown
        };

        res.json(monthlyStats);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getSubjectWiseAttendanceAnalytics = async (req, res) => {
    try {
        const { subject_id, start_date, end_date } = req.query;
        
        let matchQuery = {};
        if (subject_id) {
            const timetables = await Timetable.find({ subject_id });
            matchQuery.timetable_id = { $in: timetables.map(t => t._id) };
        }
        if (start_date && end_date) {
            matchQuery.date = { $gte: new Date(start_date), $lte: new Date(end_date) };
        }

        const subjectAttendance = await Attendance.find(matchQuery)
            .populate({
                path: 'timetable_id',
                populate: [
                    { path: 'subject_id', select: 'name code' },
                    { path: 'section_id', select: 'name semester' }
                ]
            })
            .sort({ date: 1 });

        const subjectStats = subjectAttendance.reduce((acc, att) => {
            const subjectName = att.timetable_id?.subject_id?.name || 'Unknown';
            if (!acc[subjectName]) {
                acc[subjectName] = {
                    subject: att.timetable_id?.subject_id,
                    totalClasses: 0,
                    totalStudents: 0,
                    totalPresent: 0,
                    totalAbsent: 0,
                    attendanceRate: 0,
                    classes: []
                };
            }
            
            acc[subjectName].totalClasses++;
            acc[subjectName].totalStudents += att.records.length;
            acc[subjectName].totalPresent += att.records.filter(r => r.status === 'Present' || r.status === 'Late').length;
            acc[subjectName].totalAbsent += att.records.filter(r => r.status === 'Absent').length;
            acc[subjectName].classes.push({
                date: att.date,
                totalStudents: att.records.length,
                presentCount: att.records.filter(r => r.status === 'Present' || r.status === 'Late').length,
                absentCount: att.records.filter(r => r.status === 'Absent').length
            });
            
            return acc;
        }, {});

        // Calculate attendance rates for each subject
        Object.keys(subjectStats).forEach(subject => {
            const stats = subjectStats[subject];
            const rate = stats.totalStudents > 0 ? (stats.totalPresent / stats.totalStudents) * 100 : 0;
            stats.attendanceRate = Math.round(rate);
        });

        res.json({
            period: start_date && end_date ? `${start_date} to ${end_date}` : 'All time',
            subjectStats
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = {
    getDailyAttendanceAnalytics,
    getWeeklyAttendanceAnalytics,
    getMonthlyAttendanceAnalytics,
    getSubjectWiseAttendanceAnalytics
};
