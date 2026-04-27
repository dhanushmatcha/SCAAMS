const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Department = require('../models/Department');
const Section = require('../models/Section');

const getAttendanceAnalytics = async (req, res) => {
    try {
        // Find total number of students
        const totalStudents = await User.countDocuments({ role: 'Student' });

        // Get students with < 75% attendance for Defaulters List
        const defaulters = await User.find({ role: 'Student', attendance_percentage: { $lt: 75 } })
            .populate('department', 'name')
            .populate('section_id', 'name semester')
            .lean();

        // Calculate average attendance across the entire student population
        const allStudents = await User.find({ role: 'Student' }).select('attendance_percentage');
        let totalPercentage = 0;
        allStudents.forEach(s => totalPercentage += (s.attendance_percentage || 100));
        const averageAttendance = totalStudents > 0 ? (totalPercentage / totalStudents).toFixed(2) : 100;

        // Count for today's attendance summary (if needed)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todaysAttendanceRecords = await Attendance.find({
            date: { $gte: today, $lt: tomorrow }
        });

        let todaysPresent = 0;
        let todaysAbsent = 0;

        todaysAttendanceRecords.forEach(att => {
            att.records.forEach(r => {
                if (r.status === 'Present' || r.status === 'Late') todaysPresent++;
                else if (r.status === 'Absent') todaysAbsent++;
            });
        });

        // 7-Day Trend Analytics
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const recentAttendance = await Attendance.find({
            date: { $gte: sevenDaysAgo }
        }).sort('date');

        const weeklyMap = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            weeklyMap[d.toLocaleDateString('en-US', { weekday: 'short' })] = { present: 0, absent: 0 };
        }

        recentAttendance.forEach(att => {
            const dayStr = new Date(att.date).toLocaleDateString('en-US', { weekday: 'short' });
            if (weeklyMap[dayStr]) {
                att.records.forEach(r => {
                    if (r.status === 'Present' || r.status === 'Late') weeklyMap[dayStr].present++;
                    else if (r.status === 'Absent') weeklyMap[dayStr].absent++;
                });
            }
        });

        const weeklyTrend = Object.keys(weeklyMap).map(day => ({
            name: day,
            present: weeklyMap[day].present,
            absent: weeklyMap[day].absent
        }));

        res.json({
            averageAttendance,
            totalStudents,
            defaulters,
            today: {
                present: todaysPresent,
                absent: todaysAbsent,
                totalMarked: todaysPresent + todaysAbsent
            },
            weeklyTrend
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAttendanceAnalytics };
