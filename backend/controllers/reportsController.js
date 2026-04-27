const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Timetable = require('../models/Timetable');
const Subject = require('../models/Subject');
const Section = require('../models/Section');
const Department = require('../models/Department');

// Admin Reports: Department-wise attendance
const getDepartmentWiseAttendance = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = end_date ? new Date(end_date) : new Date();

        // Get all departments
        const departments = await Department.find().populate({
            path: 'sections',
            populate: {
                path: 'students',
                select: 'attendance_percentage'
            }
        });

        const departmentReports = [];

        for (const department of departments) {
            let totalStudents = 0;
            let totalAttendanceSum = 0;
            let lowAttendanceCount = 0;
            let criticalAttendanceCount = 0;

            for (const section of department.sections) {
                for (const student of section.students) {
                    totalStudents++;
                    totalAttendanceSum += student.attendance_percentage || 0;
                    
                    if (student.attendance_percentage < 75) lowAttendanceCount++;
                    if (student.attendance_percentage < 60) criticalAttendanceCount++;
                }
            }

            const averageAttendance = totalStudents > 0 ? Math.round(totalAttendanceSum / totalStudents) : 0;
            const lowAttendanceRate = totalStudents > 0 ? Math.round((lowAttendanceCount / totalStudents) * 100) : 0;
            const criticalAttendanceRate = totalStudents > 0 ? Math.round((criticalAttendanceCount / totalStudents) * 100) : 0;

            departmentReports.push({
                department_id: department._id,
                department_name: department.name,
                total_students: totalStudents,
                average_attendance: averageAttendance,
                low_attendance_count: lowAttendanceCount,
                critical_attendance_count: criticalAttendanceCount,
                low_attendance_rate: lowAttendanceRate,
                critical_attendance_rate: criticalAttendanceRate,
                sections: department.sections.map(section => ({
                    section_id: section._id,
                    section_name: section.name,
                    student_count: section.students.length
                }))
            });
        }

        res.json({
            period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
            department_reports: departmentReports.sort((a, b) => b.average_attendance - a.average_attendance),
            summary: {
                total_departments: departmentReports.length,
                overall_average_attendance: departmentReports.length > 0 ? 
                    Math.round(departmentReports.reduce((sum, dept) => sum + dept.average_attendance, 0) / departmentReports.length) : 0,
                total_students: departmentReports.reduce((sum, dept) => sum + dept.total_students, 0)
            }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// Admin Reports: Course-wise attendance
const getCourseWiseAttendance = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = end_date ? new Date(end_date) : new Date();

        const subjects = await Subject.find().populate({
            path: 'department_id',
            select: 'name'
        });

        const courseReports = [];

        for (const subject of subjects) {
            // Get all timetables for this subject
            const timetables = await Timetable.find({ subject_id: subject._id })
                .populate('section_id', 'name')
                .populate('faculty_id', 'name');

            // Get attendance records for this subject's timetables
            const attendanceRecords = await Attendance.find({
                timetable_id: { $in: timetables.map(t => t._id) },
                date: { $gte: startDate, $lte: endDate }
            });

            let totalClasses = attendanceRecords.length;
            let totalStudents = 0;
            let totalPresent = 0;
            let totalAbsent = 0;

            attendanceRecords.forEach(record => {
                totalStudents += record.records.length;
                totalPresent += record.records.filter(r => r.status === 'Present' || r.status === 'Late').length;
                totalAbsent += record.records.filter(r => r.status === 'Absent').length;
            });

            const averageAttendanceRate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

            courseReports.push({
                subject_id: subject._id,
                subject_name: subject.name,
                subject_code: subject.code,
                department: subject.department_id?.name || 'Unknown',
                total_classes: totalClasses,
                total_students: totalStudents,
                total_present: totalPresent,
                total_absent: totalAbsent,
                average_attendance_rate: averageAttendanceRate,
                sections: timetables.map(t => ({
                    section_name: t.section_id.name,
                    faculty_name: t.faculty_id.name
                }))
            });
        }

        res.json({
            period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
            course_reports: courseReports.sort((a, b) => b.average_attendance_rate - a.average_attendance_rate),
            summary: {
                total_courses: courseReports.length,
                overall_average_attendance: courseReports.length > 0 ? 
                    Math.round(courseReports.reduce((sum, course) => sum + course.average_attendance_rate, 0) / courseReports.length) : 0,
                total_classes_conducted: courseReports.reduce((sum, course) => sum + course.total_classes, 0)
            }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// Admin Reports: Faculty-wise attendance
const getFacultyWiseAttendance = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = end_date ? new Date(end_date) : new Date();

        const faculties = await User.find({ role: 'Faculty' })
            .populate('assignedSections', 'name')
            .populate('assignedSubjects', 'name code');

        const facultyReports = [];

        for (const faculty of faculties) {
            // Get all timetables for this faculty
            const timetables = await Timetable.find({ faculty_id: faculty._id })
                .populate('subject_id', 'name code')
                .populate('section_id', 'name');

            // Get attendance records for this faculty's timetables
            const attendanceRecords = await Attendance.find({
                timetable_id: { $in: timetables.map(t => t._id) },
                date: { $gte: startDate, $lte: endDate }
            });

            let totalClasses = attendanceRecords.length;
            let totalStudents = 0;
            let totalPresent = 0;
            let totalAbsent = 0;

            attendanceRecords.forEach(record => {
                totalStudents += record.records.length;
                totalPresent += record.records.filter(r => r.status === 'Present' || r.status === 'Late').length;
                totalAbsent += record.records.filter(r => r.status === 'Absent').length;
            });

            const averageAttendanceRate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

            facultyReports.push({
                faculty_id: faculty._id,
                faculty_name: faculty.name,
                faculty_email: faculty.email,
                total_classes: totalClasses,
                total_students: totalStudents,
                total_present: totalPresent,
                total_absent: totalAbsent,
                average_attendance_rate: averageAttendanceRate,
                assigned_sections: faculty.assignedSections.length,
                assigned_subjects: faculty.assignedSubjects.length,
                subjects: timetables.map(t => ({
                    subject_name: t.subject_id.name,
                    subject_code: t.subject_id.code,
                    section_name: t.section_id.name
                }))
            });
        }

        res.json({
            period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
            faculty_reports: facultyReports.sort((a, b) => b.average_attendance_rate - a.average_attendance_rate),
            summary: {
                total_faculties: facultyReports.length,
                overall_average_attendance: facultyReports.length > 0 ? 
                    Math.round(facultyReports.reduce((sum, faculty) => sum + faculty.average_attendance_rate, 0) / facultyReports.length) : 0,
                total_classes_conducted: facultyReports.reduce((sum, faculty) => sum + faculty.total_classes, 0)
            }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// Admin Reports: Top 10 students with low attendance
const getLowAttendanceStudents = async (req, res) => {
    try {
        const { limit = 10, threshold = 75 } = req.query;

        const lowAttendanceStudents = await User.find({
            role: 'Student',
            attendance_percentage: { $lt: parseInt(threshold) }
        })
        .populate({
            path: 'section_id',
            select: 'name semester department_id',
            populate: {
                path: 'department_id',
                select: 'name'
            }
        })
        .select('name email attendance_percentage attendance_notifications')
        .sort({ attendance_percentage: 1 })
        .limit(parseInt(limit));

        const studentReports = lowAttendanceStudents.map(student => {
            const recentAlerts = student.attendance_notifications
                .filter(notification => new Date(notification.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            return {
                student_id: student._id,
                student_name: student.name,
                student_email: student.email,
                attendance_percentage: student.attendance_percentage,
                section_name: student.section_id?.name || 'Unknown',
                department_name: student.section_id?.department_id?.name || 'Unknown',
                semester: student.section_id?.semester || 'Unknown',
                recent_alerts: recentAlerts.length,
                last_alert: recentAlerts[0] || null,
                alert_types: {
                    low_attendance: recentAlerts.filter(n => n.type === 'low_attendance').length,
                    critical_attendance: recentAlerts.filter(n => n.type === 'critical_attendance').length
                }
            };
        });

        res.json({
            threshold: parseInt(threshold),
            limit: parseInt(limit),
            students: studentReports,
            summary: {
                total_students_below_threshold: studentReports.length,
                average_attendance: studentReports.length > 0 ? 
                    Math.round(studentReports.reduce((sum, student) => sum + student.attendance_percentage, 0) / studentReports.length) : 0,
                critical_students: studentReports.filter(s => s.attendance_percentage < 60).length
            }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// Admin Reports: Period-wise class utilization statistics
const getClassUtilizationStats = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = end_date ? new Date(end_date) : new Date();

        // Get all timetables
        const timetables = await Timetable.find()
            .populate('classroom_id', 'room_number capacity')
            .populate('subject_id', 'name code')
            .populate('faculty_id', 'name')
            .populate('section_id', 'name');

        // Get attendance records for the period
        const attendanceRecords = await Attendance.find({
            date: { $gte: startDate, $lte: endDate }
        })
        .populate('timetable_id', 'start_time end_time day_of_week classroom_id');

        // Group by time periods
        const timeSlots = ['08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00'];
        const utilizationStats = {};

        timeSlots.forEach(slot => {
            utilizationStats[slot] = {
                slot: slot,
                total_scheduled_classes: 0,
                total_classes_held: 0,
                total_capacity: 0,
                total_attended: 0,
                average_utilization_rate: 0,
                classes: []
            };
        });

        // Process timetables by time slots
        timetables.forEach(timetable => {
            const startTime = timetable.start_time;
            const endTime = timetable.end_time;
            const timeSlot = `${startTime}-${endTime}`;

            if (utilizationStats[timeSlot]) {
                utilizationStats[timeSlot].total_scheduled_classes++;
                utilizationStats[timeSlot].total_capacity += timetable.classroom_id?.capacity || 0;
            }
        });

        // Process attendance records
        attendanceRecords.forEach(record => {
            const timetable = record.timetable_id;
            if (timetable) {
                const timeSlot = `${timetable.start_time}-${timetable.end_time}`;
                
                if (utilizationStats[timeSlot]) {
                    utilizationStats[timeSlot].total_classes_held++;
                    utilizationStats[timeSlot].total_attended += record.records.filter(r => r.status === 'Present' || r.status === 'Late').length;
                    
                    utilizationStats[timeSlot].classes.push({
                        date: record.date,
                        subject: timetable.subject_id?.name || 'Unknown',
                        faculty: timetable.faculty_id?.name || 'Unknown',
                        classroom: timetable.classroom_id?.room_number || 'Unknown',
                        attended: record.records.filter(r => r.status === 'Present' || r.status === 'Late').length,
                        capacity: timetable.classroom_id?.capacity || 0
                    });
                }
            }
        });

        // Calculate utilization rates
        Object.keys(utilizationStats).forEach(slot => {
            const stats = utilizationStats[slot];
            stats.average_utilization_rate = stats.total_capacity > 0 ? 
                Math.round((stats.total_attended / stats.total_capacity) * 100) : 0;
        });

        res.json({
            period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
            utilization_stats: Object.values(utilizationStats),
            summary: {
                total_time_slots: Object.keys(utilizationStats).length,
                overall_utilization_rate: Object.values(utilizationStats).reduce((sum, slot) => sum + slot.average_utilization_rate, 0) / Object.keys(utilizationStats).length,
                peak_utilization_slot: Object.values(utilizationStats).reduce((max, slot) => slot.average_utilization_rate > max.average_utilization_rate ? slot : max),
                lowest_utilization_slot: Object.values(utilizationStats).reduce((min, slot) => slot.average_utilization_rate < min.average_utilization_rate ? slot : min)
            }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// Faculty Reports: Attendance history for each class/subject
const getFacultyAttendanceHistory = async (req, res) => {
    try {
        const facultyId = req.user.id;
        const { start_date, end_date, subject_id } = req.query;
        const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = end_date ? new Date(end_date) : new Date();

        // Get faculty's timetables
        let timetablesQuery = { faculty_id: facultyId };
        if (subject_id) timetablesQuery.subject_id = subject_id;

        const timetables = await Timetable.find(timetablesQuery)
            .populate('subject_id', 'name code')
            .populate('section_id', 'name')
            .populate('classroom_id', 'room_number');

        // Get attendance records
        const attendanceRecords = await Attendance.find({
            timetable_id: { $in: timetables.map(t => t._id) },
            date: { $gte: startDate, $lte: endDate }
        })
        .populate('timetable_id', 'subject_id section_id classroom_id start_time end_time day_of_week')
        .sort({ date: -1 });

        // Group by subject
        const subjectHistory = {};

        timetables.forEach(timetable => {
            const subjectName = timetable.subject_id.name;
            if (!subjectHistory[subjectName]) {
                subjectHistory[subjectName] = {
                    subject_id: timetable.subject_id._id,
                    subject_name: subjectName,
                    subject_code: timetable.subject_id.code,
                    total_classes: 0,
                    total_students: 0,
                    total_present: 0,
                    total_absent: 0,
                    average_attendance_rate: 0,
                    attendance_records: [],
                    sections: []
                };
            }
            subjectHistory[subjectName].total_classes++;
            subjectHistory[subjectName].sections.push({
                section_name: timetable.section_id.name,
                classroom: timetable.classroom_id.room_number
            });
        });

        attendanceRecords.forEach(record => {
            const subjectName = record.timetable_id.subject_id.name;
            if (subjectHistory[subjectName]) {
                const presentCount = record.records.filter(r => r.status === 'Present' || r.status === 'Late').length;
                const absentCount = record.records.filter(r => r.status === 'Absent').length;
                
                subjectHistory[subjectName].total_students += record.records.length;
                subjectHistory[subjectName].total_present += presentCount;
                subjectHistory[subjectName].total_absent += absentCount;
                
                subjectHistory[subjectName].attendance_records.push({
                    date: record.date,
                    day_of_week: record.timetable_id.day_of_week,
                    start_time: record.timetable_id.start_time,
                    end_time: record.timetable_id.end_time,
                    section_name: record.timetable_id.section_id.name,
                    classroom: record.timetable_id.classroom_id.room_number,
                    total_students: record.records.length,
                    present_count: presentCount,
                    absent_count: absentCount,
                    attendance_rate: record.records.length > 0 ? Math.round((presentCount / record.records.length) * 100) : 0
                });
            }
        });

        // Calculate averages
        Object.keys(subjectHistory).forEach(subject => {
            const history = subjectHistory[subject];
            history.average_attendance_rate = history.total_students > 0 ? 
                Math.round((history.total_present / history.total_students) * 100) : 0;
        });

        res.json({
            faculty_id: facultyId,
            period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
            subject_history: Object.values(subjectHistory),
            summary: {
                total_subjects: Object.keys(subjectHistory).length,
                total_classes_conducted: Object.values(subjectHistory).reduce((sum, subject) => sum + subject.total_classes, 0),
                overall_average_attendance: Object.values(subjectHistory).reduce((sum, subject) => sum + subject.average_attendance_rate, 0) / Object.keys(subjectHistory).length
            }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// Faculty Reports: Average attendance trends
const getFacultyAttendanceTrends = async (req, res) => {
    try {
        const facultyId = req.user.id;
        const { period = 'weekly', start_date, end_date } = req.query;
        
        const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = end_date ? new Date(end_date) : new Date();

        const timetables = await Timetable.find({ faculty_id: facultyId })
            .populate('subject_id', 'name code');

        const attendanceRecords = await Attendance.find({
            timetable_id: { $in: timetables.map(t => t._id) },
            date: { $gte: startDate, $lte: endDate }
        })
        .populate('timetable_id', 'subject_id')
        .sort({ date: 1 });

        // Group by period
        const trends = {};
        
        if (period === 'daily') {
            attendanceRecords.forEach(record => {
                const date = record.date.toISOString().split('T')[0];
                if (!trends[date]) {
                    trends[date] = {
                        date,
                        total_classes: 0,
                        total_students: 0,
                        total_present: 0,
                        attendance_rate: 0,
                        subjects: {}
                    };
                }
                
                const subjectName = record.timetable_id.subject_id.name;
                if (!trends[date].subjects[subjectName]) {
                    trends[date].subjects[subjectName] = {
                        total_students: 0,
                        total_present: 0
                    };
                }
                
                const presentCount = record.records.filter(r => r.status === 'Present' || r.status === 'Late').length;
                
                trends[date].total_classes++;
                trends[date].total_students += record.records.length;
                trends[date].total_present += presentCount;
                trends[date].subjects[subjectName].total_students += record.records.length;
                trends[date].subjects[subjectName].total_present += presentCount;
            });
        } else if (period === 'weekly') {
            // Group by week
            attendanceRecords.forEach(record => {
                const date = new Date(record.date);
                const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
                const weekKey = weekStart.toISOString().split('T')[0];
                
                if (!trends[weekKey]) {
                    trends[weekKey] = {
                        week_start: weekKey,
                        total_classes: 0,
                        total_students: 0,
                        total_present: 0,
                        attendance_rate: 0,
                        subjects: {}
                    };
                }
                
                const subjectName = record.timetable_id.subject_id.name;
                if (!trends[weekKey].subjects[subjectName]) {
                    trends[weekKey].subjects[subjectName] = {
                        total_students: 0,
                        total_present: 0
                    };
                }
                
                const presentCount = record.records.filter(r => r.status === 'Present' || r.status === 'Late').length;
                
                trends[weekKey].total_classes++;
                trends[weekKey].total_students += record.records.length;
                trends[weekKey].total_present += presentCount;
                trends[weekKey].subjects[subjectName].total_students += record.records.length;
                trends[weekKey].subjects[subjectName].total_present += presentCount;
            });
        }

        // Calculate attendance rates
        Object.keys(trends).forEach(key => {
            const trend = trends[key];
            trend.attendance_rate = trend.total_students > 0 ? 
                Math.round((trend.total_present / trend.total_students) * 100) : 0;
            
            // Calculate subject-wise rates
            Object.keys(trend.subjects).forEach(subject => {
                const subjectData = trend.subjects[subject];
                subjectData.attendance_rate = subjectData.total_students > 0 ? 
                    Math.round((subjectData.total_present / subjectData.total_students) * 100) : 0;
            });
        });

        res.json({
            faculty_id: facultyId,
            period,
            date_range: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
            trends: Object.values(trends),
            summary: {
                total_periods: Object.keys(trends).length,
                average_attendance_rate: Object.values(trends).reduce((sum, trend) => sum + trend.attendance_rate, 0) / Object.keys(trends).length,
                peak_attendance_period: Object.values(trends).reduce((max, trend) => trend.attendance_rate > max.attendance_rate ? trend : max),
                lowest_attendance_period: Object.values(trends).reduce((min, trend) => trend.attendance_rate < min.attendance_rate ? trend : min)
            }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// Student Dashboard: Graphical view of attendance % by subject
const getStudentAttendanceBySubject = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { start_date, end_date } = req.query;
        const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = end_date ? new Date(end_date) : new Date();

        const student = await User.findById(studentId)
            .populate('section_id', 'name')
            .populate({
                path: 'section_id',
                populate: {
                    path: 'department_id',
                    select: 'name'
                }
            });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Get student's section timetables
        const timetables = await Timetable.find({ section_id: student.section_id._id })
            .populate('subject_id', 'name code')
            .populate('faculty_id', 'name');

        // Get attendance records for the student
        const attendanceRecords = await Attendance.find({
            timetable_id: { $in: timetables.map(t => t._id) },
            date: { $gte: startDate, $lte: endDate },
            'records.student_id': studentId
        })
        .populate('timetable_id', 'subject_id start_time end_time day_of_week')
        .sort({ date: 1 });

        // Group by subject
        const subjectAttendance = {};

        timetables.forEach(timetable => {
            const subjectName = timetable.subject_id.name;
            if (!subjectAttendance[subjectName]) {
                subjectAttendance[subjectName] = {
                    subject_id: timetable.subject_id._id,
                    subject_name: subjectName,
                    subject_code: timetable.subject_id.code,
                    faculty_name: timetable.faculty_id.name,
                    total_classes: 0,
                    present_classes: 0,
                    absent_classes: 0,
                    late_classes: 0,
                    attendance_percentage: 0,
                    attendance_history: []
                };
            }
            subjectAttendance[subjectName].total_classes++;
        });

        attendanceRecords.forEach(record => {
            const subjectName = record.timetable_id.subject_id.name;
            if (subjectAttendance[subjectName]) {
                const studentRecord = record.records.find(r => r.student_id.toString() === studentId);
                
                if (studentRecord) {
                    if (studentRecord.status === 'Present' || studentRecord.status === 'Late') {
                        subjectAttendance[subjectName].present_classes++;
                    } else if (studentRecord.status === 'Absent') {
                        subjectAttendance[subjectName].absent_classes++;
                    }
                    
                    if (studentRecord.status === 'Late') {
                        subjectAttendance[subjectName].late_classes++;
                    }
                    
                    subjectAttendance[subjectName].attendance_history.push({
                        date: record.date,
                        day_of_week: record.timetable_id.day_of_week,
                        start_time: record.timetable_id.start_time,
                        end_time: record.timetable_id.end_time,
                        status: studentRecord.status
                    });
                }
            }
        });

        // Calculate attendance percentages
        Object.keys(subjectAttendance).forEach(subject => {
            const attendance = subjectAttendance[subject];
            attendance.attendance_percentage = attendance.total_classes > 0 ? 
                Math.round((attendance.present_classes / attendance.total_classes) * 100) : 0;
        });

        // Generate chart data
        const chartData = Object.values(subjectAttendance).map(subject => ({
            subject: subject.subject_name,
            attendance: subject.attendance_percentage,
            present: subject.present_classes,
            absent: subject.absent_classes,
            late: subject.late_classes,
            total: subject.total_classes
        }));

        res.json({
            student_id: studentId,
            student_name: student.name,
            section_name: student.section_id.name,
            department_name: student.section_id.department_id?.name || 'Unknown',
            overall_attendance_percentage: student.attendance_percentage || 0,
            period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
            subject_attendance: Object.values(subjectAttendance),
            chart_data: chartData,
            summary: {
                total_subjects: Object.keys(subjectAttendance).length,
                average_attendance: chartData.length > 0 ? 
                    Math.round(chartData.reduce((sum, subject) => sum + subject.attendance, 0) / chartData.length) : 0,
                best_performing_subject: chartData.reduce((best, subject) => subject.attendance > best.attendance ? subject : best, { attendance: 0 }),
                worst_performing_subject: chartData.reduce((worst, subject) => subject.attendance < worst.attendance ? subject : worst, { attendance: 100 })
            }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = {
    getDepartmentWiseAttendance,
    getCourseWiseAttendance,
    getFacultyWiseAttendance,
    getLowAttendanceStudents,
    getClassUtilizationStats,
    getFacultyAttendanceHistory,
    getFacultyAttendanceTrends,
    getStudentAttendanceBySubject
};
