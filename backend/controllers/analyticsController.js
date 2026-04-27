const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Timetable = require('../models/Timetable');
const Subject = require('../models/Subject');
const Department = require('../models/Department');
const Section = require('../models/Section');
const ExamMark = require('../models/ExamMark');

const getAdvancedAnalytics = async (req, res) => {
    try {
        // Find total number of students
        const totalStudents = await User.countDocuments({ role: 'Student' });

        // Get students with < 75% attendance for Defaulters List
        const defaulters = await User.find({ role: 'Student', attendance_percentage: { $lt: 75 } })
            .populate('department', 'name')
            .populate('section_id', 'name semester')
            .lean();

        // Calculate average attendance across entire student population
        const allStudents = await User.find({ role: 'Student' }).select('attendance_percentage');
        let totalPercentage = 0;
        allStudents.forEach(s => totalPercentage += (s.attendance_percentage || 100));
        const averageAttendance = totalStudents > 0 ? (totalPercentage / totalStudents).toFixed(2) : 100;

        // Count for today's attendance summary
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

        // Subject-wise attendance analytics
        const subjectWiseAnalytics = await getSubjectWiseAnalytics();

        // Department-wise attendance analytics
        const departmentWiseAnalytics = await getDepartmentWiseAnalytics();

        // Monthly attendance trends (last 6 months)
        const monthlyTrends = await getMonthlyAttendanceTrends();

        // Faculty performance metrics
        const facultyMetrics = await getFacultyPerformanceMetrics();

        res.json({
            averageAttendance,
            totalStudents,
            defaulters,
            today: {
                present: todaysPresent,
                absent: todaysAbsent,
                totalMarked: todaysPresent + todaysAbsent
            },
            subjectWiseAnalytics,
            departmentWiseAnalytics,
            monthlyTrends,
            facultyMetrics
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSubjectWiseAnalytics = async () => {
    try {
        const subjects = await Subject.find();
        const subjectAnalytics = [];

        for (const subject of subjects) {
            const timetables = await Timetable.find({ subject_id: subject._id });
            const attendanceRecords = await Attendance.find({
                timetable_id: { $in: timetables.map(t => t._id) }
            });

            let totalClasses = 0;
            let presentClasses = 0;

            attendanceRecords.forEach(att => {
                att.records.forEach(r => {
                    totalClasses++;
                    if (r.status === 'Present' || r.status === 'Late') presentClasses++;
                });
            });

            const percentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;

            subjectAnalytics.push({
                subjectName: subject.name,
                subjectCode: subject.code,
                totalClasses,
                presentClasses,
                percentage
            });
        }

        return subjectAnalytics;
    } catch (error) {
        return [];
    }
};

const getDepartmentWiseAnalytics = async () => {
    try {
        const departments = await Department.find();
        const departmentAnalytics = [];

        for (const dept of departments) {
            const students = await User.find({ 
                role: 'Student', 
                department_id: dept._id 
            }).select('attendance_percentage');

            let totalPercentage = 0;
            students.forEach(s => totalPercentage += (s.attendance_percentage || 100));
            
            const averagePercentage = students.length > 0 ? 
                (totalPercentage / students.length).toFixed(2) : 0;

            const defaultersCount = students.filter(s => (s.attendance_percentage || 100) < 75).length;

            departmentAnalytics.push({
                departmentName: dept.name,
                studentCount: students.length,
                averagePercentage: parseFloat(averagePercentage),
                defaultersCount
            });
        }

        return departmentAnalytics;
    } catch (error) {
        return [];
    }
};

const getMonthlyAttendanceTrends = async () => {
    try {
        const trends = [];
        const currentDate = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);
            
            const monthAttendance = await Attendance.find({
                date: { $gte: monthDate, $lt: nextMonth }
            });

            let totalClasses = 0;
            let presentClasses = 0;

            monthAttendance.forEach(att => {
                att.records.forEach(r => {
                    totalClasses++;
                    if (r.status === 'Present' || r.status === 'Late') presentClasses++;
                });
            });

            const percentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;

            trends.push({
                month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                totalClasses,
                presentClasses,
                percentage
            });
        }

        return trends;
    } catch (error) {
        return [];
    }
};

const getFacultyPerformanceMetrics = async () => {
    try {
        const faculties = await User.find({ role: 'Faculty' }).select('_id name');
        const facultyMetrics = [];

        for (const faculty of faculties) {
            const timetables = await Timetable.find({ faculty_id: faculty._id });
            const attendanceRecords = await Attendance.find({
                timetable_id: { $in: timetables.map(t => t._id) }
            });

            const totalClassesMarked = attendanceRecords.length;
            const totalStudentsMarked = attendanceRecords.reduce((sum, att) => sum + att.records.length, 0);

            facultyMetrics.push({
                facultyName: faculty.name,
                totalClassesMarked,
                totalStudentsMarked,
                averageStudentsPerClass: totalClassesMarked > 0 ? 
                    Math.round(totalStudentsMarked / totalClassesMarked) : 0
            });
        }

        return facultyMetrics;
    } catch (error) {
        return [];
    }
};

// NEW: Risk Analysis Report (Admin)
const getRiskReport = async (req, res) => {
    try {
        const students = await User.find({ role: 'Student' })
            .populate('department', 'name')
            .populate('section_id', 'name');

        const riskReport = [];

        for (const student of students) {
            let riskScore = 0;
            let riskReasons = [];

            // 1. Attendance Check
            const att = student.attendance_percentage || 0;
            if (att < 75) {
                riskScore += 40;
                riskReasons.push(`Low overall attendance (${att}%)`);
            }

            // 2. Marks Check
            const examMarks = await ExamMark.find({ student_id: student._id });
            if (examMarks.length > 0) {
                const totalMax = examMarks.reduce((sum, m) => sum + (m.total_marks || 100), 0);
                const totalObtained = examMarks.reduce((sum, m) => sum + (m.marks_obtained || 0), 0);
                const marksPercentage = (totalObtained / totalMax) * 100;

                if (marksPercentage < 40) {
                    riskScore += 40;
                    riskReasons.push(`Poor exam performance (${marksPercentage.toFixed(1)}%)`);
                }
            }

            // 3. Attendance Trend (Last 5 classes)
            const recentAttendance = await Attendance.find({
                'records.student_id': student._id
            }).sort({ date: -1 }).limit(5);

            if (recentAttendance.length >= 3) {
                const recentPresentCount = recentAttendance.filter(att => 
                    att.records.find(r => r.student_id.toString() === student._id.toString() && (r.status === 'Present' || r.status === 'Late'))
                ).length;
                const recentPercentage = (recentPresentCount / recentAttendance.length) * 100;

                if (recentPercentage < att - 10) {
                    riskScore += 20;
                    riskReasons.push(`Declining attendance trend (Recent: ${recentPercentage.toFixed(0)}%)`);
                }
            }

            if (riskScore >= 40) {
                riskReport.push({
                    studentId: student._id,
                    name: student.name,
                    regd_no: student.regd_no,
                    department: student.department?.name,
                    section: student.section_id?.name,
                    riskScore,
                    riskLevel: riskScore >= 80 ? 'High' : riskScore >= 60 ? 'Medium' : 'Low',
                    riskReasons
                });
            }
        }

        res.json(riskReport.sort((a, b) => b.riskScore - a.riskScore));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// NEW: Student Progress Summary (Gamification)
const getStudentProgressSummary = async (req, res) => {
    try {
        const studentId = req.user.id;
        const student = await User.findById(studentId);

        if (!student) return res.status(404).json({ message: 'Student not found' });

        // 1. Calculate Rank in Section (Based on Attendance)
        const sectionStudents = await User.find({ 
            section_id: student.section_id, 
            role: 'Student' 
        }).sort({ attendance_percentage: -1 });

        const rank = sectionStudents.findIndex(s => s._id.toString() === studentId) + 1;

        // 2. Calculate Attendance Streak
        const allAttendance = await Attendance.find({
            'records.student_id': studentId
        }).sort({ date: -1 });

        let streak = 0;
        for (const att of allAttendance) {
            const record = att.records.find(r => r.student_id.toString() === studentId);
            if (record && (record.status === 'Present' || record.status === 'Late')) {
                streak++;
            } else if (record && record.status === 'Absent') {
                break;
            }
            // Ignore classes that haven't been marked yet for this student
        }

        // 3. Predicted Eligibility
        const eligibility = student.attendance_percentage >= 75 ? 'Safe' : 'Critical';

        res.json({
            rank,
            totalStudentsInSection: sectionStudents.length,
            streak,
            eligibility,
            attendanceTrend: student.attendance_percentage
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { 
    getAdvancedAnalytics,
    getSubjectWiseAnalytics,
    getDepartmentWiseAnalytics,
    getMonthlyAttendanceTrends,
    getFacultyPerformanceMetrics,
    getRiskReport,
    getStudentProgressSummary
};
