const User = require('../models/User');

const sendLowAttendanceAlerts = async (req, res) => {
    try {
        const { threshold } = req.query;
        const attendanceThreshold = threshold ? parseInt(threshold) : 75;

        // Find all students with attendance below threshold
        const lowAttendanceStudents = await User.find({
            role: 'Student',
            attendance_percentage: { $lt: attendanceThreshold }
        }).select('name email attendance_percentage attendance_notifications');

        const alerts = [];
        const updatedStudents = [];

        for (const student of lowAttendanceStudents) {
            const hasRecentAlert = student.attendance_notifications.some(
                notification => notification.type === 'low_attendance' && 
                new Date(notification.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            );

            if (!hasRecentAlert) {
                // Add new alert notification
                const alertNotification = {
                    title: '⚠️ Low Attendance Alert',
                    message: `Your attendance has dropped to ${student.attendance_percentage}%. You must maintain at least ${attendanceThreshold}% to be eligible for exams.`,
                    type: 'low_attendance',
                    priority: 'high',
                    date: new Date(),
                    read: false
                };

                student.attendance_notifications.push(alertNotification);
                alerts.push({
                    student: student.name,
                    email: student.email,
                    attendance: student.attendance_percentage,
                    message: alertNotification.message
                });
            }

            updatedStudents.push(student);
        }

        // Save all updated students
        await Promise.all(updatedStudents.map(student => student.save()));

        res.json({
            threshold: attendanceThreshold,
            totalAlertsSent: alerts.length,
            alerts,
            summary: `Processed ${lowAttendanceStudents.length} students with attendance below ${attendanceThreshold}%`
        });
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

const getCronJobStatus = async (req, res) => {
    try {
        // Check if there are any students needing alerts
        const criticalStudents = await User.countDocuments({
            role: 'Student',
            attendance_percentage: { $lt: 60 }
        });

        const lowStudents = await User.countDocuments({
            role: 'Student',
            attendance_percentage: { $lt: 75, $gte: 60 }
        });

        res.json({
            criticalStudents,
            lowStudents,
            lastChecked: new Date(),
            status: 'Active',
            nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next day
        });
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

// Cron job function to run daily
const runDailyAttendanceCheck = async () => {
    try {
        console.log('Running daily attendance check...');
        
        const students = await User.find({ role: 'Student' })
            .select('name email attendance_percentage attendance_notifications');

        let alertsSent = 0;
        let criticalAlerts = 0;

        for (const student of students) {
            if (student.attendance_percentage < 60) {
                // Critical alert
                const hasRecentCriticalAlert = student.attendance_notifications.some(
                    notification => notification.type === 'critical_attendance' && 
                    new Date(notification.date) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // Last 3 days
                );

                if (!hasRecentCriticalAlert) {
                    student.attendance_notifications.push({
                        title: '🚨 Critical Attendance Alert',
                        message: `Your attendance is critically low at ${student.attendance_percentage}%. Immediate action required to avoid academic penalties.`,
                        type: 'critical_attendance',
                        priority: 'urgent',
                        date: new Date(),
                        read: false
                    });
                    criticalAlerts++;
                }
            } else if (student.attendance_percentage < 75) {
                // Low attendance alert
                const hasRecentLowAlert = student.attendance_notifications.some(
                    notification => notification.type === 'low_attendance' && 
                    new Date(notification.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                );

                if (!hasRecentLowAlert) {
                    student.attendance_notifications.push({
                        title: '⚠️ Low Attendance Alert',
                        message: `Your attendance has dropped to ${student.attendance_percentage}%. You must maintain at least 75% to be eligible for exams.`,
                        type: 'low_attendance',
                        priority: 'high',
                        date: new Date(),
                        read: false
                    });
                    alertsSent++;
                }
            }

            await student.save();
        }

        console.log(`Daily attendance check completed: ${alertsSent} low alerts, ${criticalAlerts} critical alerts sent`);
        
        return {
            totalStudents: students.length,
            alertsSent,
            criticalAlerts,
            timestamp: new Date()
        };
    } catch (error) {
        console.error('Error in daily attendance check:', error);
        throw error;
    }
};

module.exports = {
    sendLowAttendanceAlerts,
    getCronJobStatus,
    runDailyAttendanceCheck
};
