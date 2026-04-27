const Timetable = require('../models/Timetable');
const Attendance = require('../models/Attendance');
const Notice = require('../models/Notice');
const User = require('../models/User');
const QuestionPaper = require('../models/QuestionPaper');
const ExamMark = require('../models/ExamMark');
const SectionAssignment = require('../models/SectionAssignment');
const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const Section = require('../models/Section');

const getSchedule = async (req, res) => {
    try {
        // Return all faculty's timetables, they can filter on UI by day or just see all
        const schedule = await Timetable.find({ faculty_id: req.user.id })
            .populate('section_id')
            .populate('subject_id')
            .populate('classroom_id');
        res.json(schedule);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getStudentsForSection = async (req, res) => {
    try {
        const { sectionId } = req.params;
        const Section = require('../models/Section');

        // Find the section and populate its students
        const section = await Section.findById(sectionId).populate({
            path: 'students',
            match: { role: 'Student' } // Just to be extra safe
        });

        if (!section) {
            return res.status(404).json({ message: 'Section not found' });
        }

        res.json(section.students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const markAttendance = async (req, res) => {
    try {
        const { timetable_id, date, records, marked_method, is_substitute, period, section_id, subject_id } = req.body;

        // Validate timetable exists
        const Timetable = require('../models/Timetable');
        const timetable = await Timetable.findById(timetable_id);
        if (!timetable) {
            return res.status(404).json({ message: 'Timetable not found' });
        }

        // Check if faculty can mark attendance for this class
        const isOwnClass = timetable.faculty_id.toString() === req.user.id;
        let canSubstitute = false;

        if (!isOwnClass) {
            // Check if faculty is assigned to this section
            const SectionAssignment = require('../models/SectionAssignment');
            const assignment = await SectionAssignment.findOne({
                faculty_id: req.user.id,
                section_id: timetable.section_id,
                role: 'Teacher'
            });
            canSubstitute = !!assignment;
        }

        if (!isOwnClass && !canSubstitute) {
            return res.status(403).json({ message: 'You are not authorized to mark attendance for this class' });
        }

        // Normalize date to start of day
        const requestDate = new Date(date);
        requestDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(requestDate);
        nextDay.setDate(requestDate.getDate() + 1);

        // Check if attendance already exists for this timetable, date AND period
        const Attendance = require('../models/Attendance');
        let attendance = await Attendance.findOne({
            timetable_id,
            date: { $gte: requestDate, $lt: nextDay },
            period: period || '1'
        });

        if (attendance) {
            return res.status(400).json({ message: `Attendance has already been marked for Period ${period || '1'} today.` });
        }

        // Create new attendance record
        attendance = await Attendance.create({
            timetable_id,
            section_id: section_id || timetable.section_id,
            subject_id: subject_id || timetable.subject_id,
            date: requestDate,
            period: period || '1',
            records,
            marked_by: req.user.id,
            marked_method: marked_method || 'Manual',
            is_substitute: !isOwnClass,
            original_faculty_id: isOwnClass ? null : timetable.faculty_id
        });

        // Enhanced attendance calculation with automatic alerts
        await updateAttendancePercentages(records);

        // Emit real-time update to admin dashboard
        const io = req.app.get('socketio');
        if (io) {
            io.emit('attendance_marked', {
                message: 'New attendance recorded',
                timetable_id,
                date: requestDate,
                faculty_id: req.user.id,
                substitute_faculty: !isOwnClass ? req.user.name : null,
                original_faculty: !isOwnClass ? timetable.faculty_id : null,
                subject: timetable.subject_id,
                section: timetable.section_id,
                totalStudents: records.length,
                presentCount: records.filter(r => r.status === 'Present' || r.status === 'Late').length,
                absentCount: records.filter(r => r.status === 'Absent').length,
                is_substitute: !isOwnClass
            });
        }

        res.status(200).json({
            ...attendance.toObject(),
            is_substitute: !isOwnClass,
            substitute_faculty: !isOwnClass ? req.user.name : null
        });
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ message: error.message });
    }
};

const validateFacultySectionSubject = async (facultyId, sectionId, subjectId) => {
    const assignment = await SectionAssignment.findOne({
        faculty_id: facultyId,
        section_id: sectionId,
        subject_id: subjectId,
        role: 'Teacher'
    });
    return !!assignment;
};

const uploadQuestionPaper = async (req, res) => {
    try {
        const { section_id, subject_id, filename, file_url, exam_type, questions_data } = req.body;

        if (!section_id || !subject_id) {
            return res.status(400).json({ message: 'section_id and subject_id are required' });
        }

        const isAssigned = await validateFacultySectionSubject(req.user.id, section_id, subject_id);
        if (!isAssigned) {
            return res.status(403).json({ message: 'Unauthorized to upload question paper for this section or subject' });
        }

        const questionPaper = await QuestionPaper.create({
            section_id,
            subject_id,
            faculty_id: req.user.id,
            filename: filename || 'Generated Paper',
            file_url: file_url || '',
            questions_data,
            exam_type: exam_type || 'T1',
            locked: req.body.locked === true
        });

        res.status(201).json(questionPaper);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const submitExamMarksBulk = async (req, res) => {
    try {
        const { section_id, subject_id, exam_type, total_marks, marks } = req.body;

        if (!section_id || !subject_id || !exam_type || !total_marks || !Array.isArray(marks)) {
            return res.status(400).json({ message: 'section_id, subject_id, exam_type, total_marks and marks array are required' });
        }

        const isAssigned = await validateFacultySectionSubject(req.user.id, section_id, subject_id);
        if (!isAssigned) {
            return res.status(403).json({ message: 'Unauthorized to enter marks for this section or subject' });
        }

        const results = [];
        for (const item of marks) {
            const { student_id, marks_obtained, breakdown_marks, remarks } = item;
            if (!student_id || marks_obtained === undefined || marks_obtained === null) {
                continue;
            }

            let scaled_marks = null;
            if (exam_type === 'T1') {
                scaled_marks = (parseFloat(marks_obtained) / 30) * 10;
            }

            const update = {
                section_id,
                subject_id,
                faculty_id: req.user.id,
                student_id,
                exam_type,
                marks_obtained,
                total_marks,
                breakdown_marks: breakdown_marks || {},
                remarks: remarks || ''
            };
            
            if (scaled_marks !== null) {
                update.scaled_marks = Number(scaled_marks.toFixed(2));
            }
            if (req.body.is_locking === true) {
                update.locked = true;
            }

            const record = await ExamMark.findOneAndUpdate(
                { section_id, subject_id, student_id, exam_type },
                update,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            results.push(record);
        }

        res.status(200).json({ message: 'Marks entered successfully', records: results });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getFacultyQuestionPapers = async (req, res) => {
    try {
        const papers = await QuestionPaper.find({ faculty_id: req.user.id })
            .populate('section_id', 'name semester')
            .populate('subject_id', 'name code');
        res.json(papers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getFacultyExamMarks = async (req, res) => {
    try {
        const marks = await ExamMark.find({ faculty_id: req.user.id })
            .populate('section_id', 'name semester')
            .populate('subject_id', 'name code')
            .populate('student_id', 'name email regd_no');
        res.json(marks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAssignmentValidationContext = async (req, res) => {
    try {
        const assignments = await SectionAssignment.find({ faculty_id: req.user.id, role: 'Teacher' })
            .populate('section_id', 'name semester')
            .populate('subject_id', 'name code');
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateAttendancePercentages = async (records) => {
    const User = require('../models/User');
    
    for (const record of records) {
        const student = await User.findById(record.student_id);
        if (!student) continue;

        // Calculate accurate attendance percentage
        const allAttendance = await Attendance.find({ "records.student_id": student._id });
        let totalClasses = 0;
        let presentClasses = 0;

        allAttendance.forEach(att => {
            const studentRecord = att.records.find(r => r.student_id.toString() === student._id.toString());
            if (studentRecord) {
                totalClasses++;
                if (studentRecord.status === 'Present' || studentRecord.status === 'Late') {
                    presentClasses++;
                }
            }
        });

        const percentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 100;
        const oldPercentage = student.attendance_percentage || 100;
        
        student.attendance_percentage = percentage;

        // Auto-alert for low attendance
        if (percentage < 75 && oldPercentage >= 75) {
            // Student crossed below 75% threshold
            student.attendance_notifications.push({
                title: ' Low Attendance Alert',
                message: `Your attendance has dropped to ${percentage}%. You must maintain at least 75% to be eligible for exams.`,
                type: 'low_attendance',
                priority: 'high'
            });
        } else if (percentage < 60) {
            // Critical attendance level
            student.attendance_notifications.push({
                title: ' Critical Attendance Alert',
                message: `Your attendance is critically low at ${percentage}%. Immediate action required to avoid academic penalties.`,
                type: 'critical_attendance',
                priority: 'urgent'
            });
        }

        await student.save();
    }
};

const createNotice = async (req, res) => {
    try {
        const { title, content, target_audience, department_id, section_id } = req.body;
        
        // Validate targeting based on audience
        if (target_audience === 'Department' && !department_id) {
            return res.status(400).json({ message: 'Department ID is required for department-level notices' });
        }
        
        if (target_audience === 'Section' && !section_id) {
            return res.status(400).json({ message: 'Section ID is required for section-level notices' });
        }
        
        const notice = await Notice.create({
            title, content, target_audience, department_id, section_id, author_id: req.user.id
        });
        
        const populatedNotice = await Notice.findById(notice._id)
            .populate('department_id', 'name')
            .populate('section_id', 'name')
            .populate('author_id', 'name');
            
        res.status(201).json(populatedNotice);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getAssignedSections = async (req, res) => {
    try {
        // Combine all three sources to ensure we get all assigned sections
        const uniqueSectionMap = new Map();

        // Source 1: User.assignedSections (primary source)
        const user = await User.findById(req.user.id).populate('assignedSections');
        if (user.assignedSections && user.assignedSections.length > 0) {
            user.assignedSections.forEach(section => {
                if (section && section._id) {
                    uniqueSectionMap.set(section._id.toString(), section);
                }
            });
        }

        // Source 2: Timetable entries (fallback/supplementary)
        const timetableSections = await Timetable.find({ faculty_id: req.user.id }).populate('section_id');
        timetableSections.forEach(item => {
            if (item.section_id && item.section_id._id) {
                uniqueSectionMap.set(item.section_id._id.toString(), item.section_id);
            }
        });

        // Source 3: SectionAssignment entries (fallback/supplementary)
        const assignments = await SectionAssignment.find({ faculty_id: req.user.id, role: 'Teacher' })
            .populate('section_id', 'name semester');
        assignments.forEach(a => {
            if (a.section_id && a.section_id._id) {
                uniqueSectionMap.set(a.section_id._id.toString(), a.section_id);
            }
        });

        const sections = Array.from(uniqueSectionMap.values());
        res.json(sections);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getTargetingOptions = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('assignedSections');
        const Section = require('../models/Section');
        const Department = require('../models/Department');
        
        // Get unique departments from assigned sections
        const sectionIds = user.assignedSections.map(s => s._id);
        const sectionsWithDepartments = await Section.find({ _id: { $in: sectionIds } })
            .populate('department_id');
        
        const uniqueDepartments = [...new Map(
            sectionsWithDepartments.map(s => [s.department_id._id.toString(), s.department_id])
        )].map(([_, dept]) => dept);
        
        res.json({
            sections: user.assignedSections,
            departments: uniqueDepartments
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getCurrentClassForAttendance = async (req, res) => {
    try {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        // Find current or upcoming class based on timetable
        const Timetable = require('../models/Timetable');
        const currentClasses = await Timetable.find({
            faculty_id: req.user.id,
            day_of_week: today
        })
        .populate('subject_id', 'name code')
        .populate('section_id', 'name semester')
        .populate('classroom_id', 'room_number')
        .sort({ start_time: 1 });

        // Find the class that should be attended now
        let currentClass = null;
        let nextClass = null;
        let status = 'upcoming';

        for (const classItem of currentClasses) {
            const [startHour, startMin] = classItem.start_time.split(':').map(Number);
            const [endHour, endMin] = classItem.end_time.split(':').map(Number);
            
            const classStartTime = new Date();
            classStartTime.setHours(startHour, startMin, 0, 0);
            
            const classEndTime = new Date();
            classEndTime.setHours(endHour, endMin, 0, 0);

            if (now >= classStartTime && now <= classEndTime) {
                currentClass = classItem;
                status = 'live';
                break;
            } else if (now < classStartTime && !nextClass) {
                nextClass = classItem;
            }
        }

        res.json({
            currentClass,
            nextClass,
            status, // 'live', 'completed', 'upcoming'
            currentTime,
            today,
            message: status === 'live' ? 'Class is in progress - Mark attendance now!' :
                   status === 'upcoming' ? 'Next class is coming up' :
                   'No more classes today'
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateClassStatus = async (req, res) => {
    try {
        const { timetable_id, status, status_reason, new_classroom_id, new_time } = req.body;

        // Validate timetable exists and belongs to faculty
        const Timetable = require('../models/Timetable');
        const timetable = await Timetable.findById(timetable_id);
        if (!timetable || timetable.faculty_id.toString() !== req.user.id) {
            return res.status(404).json({ message: 'Timetable not found or unauthorized' });
        }

        // Update timetable status
        const updateData = {
            status,
            status_reason,
            status_updated_by: req.user.id,
            status_updated_at: new Date()
        };

        // Handle classroom change for shifted classes
        if (status === 'Shifted' && new_classroom_id) {
            updateData.classroom_id = new_classroom_id;
        }

        // Handle time change for shifted classes
        if (status === 'Shifted' && new_time) {
            updateData.start_time = new_time.start_time;
            updateData.end_time = new_time.end_time;
        }

        const updatedTimetable = await Timetable.findByIdAndUpdate(
            timetable_id,
            updateData,
            { new: true, runValidators: true }
        )
        .populate('section_id', 'name')
        .populate('subject_id', 'name code')
        .populate('faculty_id', 'name')
        .populate('classroom_id', 'room_number')
        .populate('status_updated_by', 'name');

        // Emit real-time update to all connected clients
        const io = req.app.get('socketio');
        if (io) {
            // Update student dashboards
            io.emit('class_status_updated', {
                timetable_id,
                status,
                status_reason,
                updated_by: req.user.name,
                timestamp: new Date(),
                section: updatedTimetable.section_id,
                subject: updatedTimetable.subject_id,
                faculty: updatedTimetable.faculty_id,
                classroom: updatedTimetable.classroom_id,
                new_time: new_time
            });

            // Update admin live class view
            io.emit('admin_live_class_update', {
                type: 'status_change',
                timetable_id,
                status,
                updated_by: req.user.name,
                timestamp: new Date(),
                timetable: updatedTimetable
            });
        }

        res.json(updatedTimetable);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getFacultyClassesForToday = async (req, res) => {
    try {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];
        const now = new Date();

        const Timetable = require('../models/Timetable');
        const todayClasses = await Timetable.find({
            faculty_id: req.user.id,
            day_of_week: today
        })
        .populate('subject_id', 'name code')
        .populate('section_id', 'name semester')
        .populate('classroom_id', 'room_number')
        .sort({ start_time: 1 });

        const classStatuses = [];
        const nowTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        for (const classItem of todayClasses) {
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
                timeRemaining = Math.floor((classEndTime - now) / 1000 / 60); // minutes remaining
            } else if (now > classEndTime) {
                classStatus = 'Completed';
            } else if (now < classStartTime) {
                timeUntilStart = Math.floor((classStartTime - now) / 1000 / 60); // minutes until start
            }

            classStatuses.push({
                id: classItem._id,
                subject: classItem.subject_id,
                section: classItem.section_id,
                classroom: classItem.classroom_id,
                start_time: classItem.start_time,
                end_time: classItem.end_time,
                status: classItem.status || 'Scheduled',
                class_status: classStatus,
                time_remaining: timeRemaining,
                time_until_start: timeUntilStart,
                current_time: nowTime,
                is_own_class: true,
                original_faculty: null
            });
        }

        res.json({
            date: now.toISOString().split('T')[0],
            day: today,
            current_time: nowTime,
            classes: classStatuses,
            summary: {
                total_classes: classStatuses.length,
                upcoming_classes: classStatuses.filter(c => c.class_status === 'Upcoming').length,
                in_progress_classes: classStatuses.filter(c => c.class_status === 'In Progress').length,
                completed_classes: classStatuses.filter(c => c.class_status === 'Completed').length
            }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getSubstituteClassesForToday = async (req, res) => {
    try {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];
        const now = new Date();

        // Get sections this faculty is assigned to
        const assignedSections = await SectionAssignment.find({
            faculty_id: req.user.id,
            role: 'Teacher'
        }).distinct('section_id');

        if (assignedSections.length === 0) {
            return res.json({
                date: now.toISOString().split('T')[0],
                day: today,
                current_time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
                classes: [],
                summary: { total_classes: 0, upcoming_classes: 0, in_progress_classes: 0, completed_classes: 0 }
            });
        }

        const Timetable = require('../models/Timetable');
        const User = require('../models/User');

        // Get all classes today for sections this faculty is assigned to, but not their own classes
        const substituteClasses = await Timetable.find({
            section_id: { $in: assignedSections },
            day_of_week: today,
            faculty_id: { $ne: req.user.id } // Exclude their own classes
        })
        .populate('subject_id', 'name code')
        .populate('section_id', 'name semester')
        .populate('classroom_id', 'room_number')
        .populate('faculty_id', 'name') // Get original faculty name
        .sort({ start_time: 1 });

        const classStatuses = [];
        const nowTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        for (const classItem of substituteClasses) {
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

            classStatuses.push({
                id: classItem._id,
                subject: classItem.subject_id,
                section: classItem.section_id,
                classroom: classItem.classroom_id,
                start_time: classItem.start_time,
                end_time: classItem.end_time,
                status: classItem.status || 'Scheduled',
                class_status: classStatus,
                time_remaining: timeRemaining,
                time_until_start: timeUntilStart,
                current_time: nowTime,
                is_own_class: false,
                original_faculty: classItem.faculty_id?.name || 'Unknown',
                can_substitute: true
            });
        }

        res.json({
            date: now.toISOString().split('T')[0],
            day: today,
            current_time: nowTime,
            classes: classStatuses,
            summary: {
                total_classes: classStatuses.length,
                upcoming_classes: classStatuses.filter(c => c.class_status === 'Upcoming').length,
                in_progress_classes: classStatuses.filter(c => c.class_status === 'In Progress').length,
                completed_classes: classStatuses.filter(c => c.class_status === 'Completed').length
            }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getFacultyTimetable = async (req, res) => {
    try {
        const timetable = await Timetable.find({ 
            faculty_id: req.user.id
        })
        .populate('subject_id', 'name code')
        .populate('section_id', 'name')
        .populate('classroom_id', 'room_number')
        .sort({ day_of_week: 1, start_time: 1 });

        if (timetable.length === 0) {
            const assignments = await SectionAssignment.find({ faculty_id: req.user.id, role: 'Teacher' })
                .populate('section_id', 'name semester')
                .populate('subject_id', 'name code');

            const sectionAssignments = assignments.map(a => ({
                section_id: a.section_id,
                subject_id: a.subject_id,
                assignment_id: a._id
            }));

            return res.json({ timetable: [], sectionAssignments });
        }

        res.json({ timetable, sectionAssignments: [] });
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

// NEW: CO-PO Mapping Functions
const updateCODefinitions = async (req, res) => {
    try {
        const { subject_id, co_definitions } = req.body;
        const subject = await Subject.findById(subject_id);
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        subject.co_definitions = co_definitions;
        await subject.save();
        res.json({ message: 'CO Definitions updated successfully', subject });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAttainmentReport = async (req, res) => {
    try {
        const { section_id, subject_id, exam_type } = req.query;

        const subject = await Subject.findById(subject_id);
        if (!subject || !subject.co_definitions) {
            return res.status(404).json({ message: 'Subject or CO definitions not found' });
        }

        const paper = await QuestionPaper.findOne({ section_id, subject_id, exam_type });
        const allMarks = await ExamMark.find({ section_id, subject_id, exam_type });
        
        const attainment = {}; 
        subject.co_definitions.forEach(co => {
            attainment[co.code] = { totalStudents: allMarks.length, attainedCount: 0, percentage: 0, description: co.description };
        });

        if (paper && paper.question_to_co_map) {
            allMarks.forEach(mark => {
                const breakdown = mark.breakdown_marks || {};
                const coScores = {}; // CO -> { obtained, count }

                for (const [qNum, coCode] of Object.entries(paper.question_to_co_map)) {
                    if (!coScores[coCode]) coScores[coCode] = { obtained: 0, count: 0 };
                    coScores[coCode].obtained += (breakdown[qNum] || 0);
                    coScores[coCode].count++;
                }

                // Check if student attained this CO (placeholder threshold: > 50% of possible marks for that CO)
                // In a real system, we'd compare against max marks for each question.
                for (const coCode in coScores) {
                    if (attainment[coCode]) {
                        // Assuming 10 marks per question for placeholder
                        if (coScores[coCode].obtained >= (coScores[coCode].count * 5)) {
                            attainment[coCode].attainedCount++;
                        }
                    }
                }
            });

            for (const coCode in attainment) {
                attainment[coCode].percentage = attainment[coCode].totalStudents > 0 
                    ? Math.round((attainment[coCode].attainedCount / attainment[coCode].totalStudents) * 100) 
                    : 0;
            }
        }

        res.json({ attainment });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// NEW: Smart Substitution Suggestions
const getSubstitutionSuggestions = async (req, res) => {
    try {
        const { timetable_id } = req.params;
        const Timetable = require('../models/Timetable');
        const timetable = await Timetable.findById(timetable_id);
        if (!timetable) return res.status(404).json({ message: 'Timetable entry not found' });

        // Find all faculty in the same department
        const facultyInDept = await User.find({ 
            role: 'Faculty', 
            department: req.user.department 
        }).select('name email');

        const suggestions = [];
        for (const faculty of facultyInDept) {
            if (faculty._id.toString() === req.user.id) continue;

            const isBusy = await Timetable.findOne({
                faculty_id: faculty._id,
                day_of_week: timetable.day_of_week,
                $or: [
                    { start_time: { $lte: timetable.start_time }, end_time: { $gt: timetable.start_time } },
                    { start_time: { $lt: timetable.end_time }, end_time: { $gte: timetable.end_time } }
                ]
            });

            if (!isBusy) {
                suggestions.push(faculty);
            }
        }

        res.json(suggestions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getStudentHistoryByRegdNo = async (req, res) => {
    try {
        const { regdNo } = req.params;
        const student = await User.findOne({ regd_no: regdNo, role: 'Student' })
            .populate('department', 'name code')
            .populate('section_id', 'name semester')
            .select('-password');

        if (!student) {
            return res.status(404).json({ message: 'Student not found with this Registration Number' });
        }

        const marks = await ExamMark.find({ student_id: student._id })
            .populate('subject_id', 'name code')
            .populate('section_id', 'name semester')
            .sort({ recorded_at: -1 });

        const attendanceDocs = await Attendance.find({ 
            'records.student_id': student._id 
        })
        .populate('subject_id', 'name code')
        .populate('section_id', 'name semester')
        .sort({ date: -1 });

        const attendanceHistory = attendanceDocs.map(doc => {
            const studentRecord = doc.records.find(r => r.student_id.toString() === student._id.toString());
            return {
                date: doc.date,
                period: doc.period,
                subject: doc.subject_id,
                section: doc.section_id,
                status: studentRecord ? studentRecord.status : 'N/A'
            };
        });

        res.json({
            profile: student,
            marksHistory: marks,
            attendanceHistory: attendanceHistory
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getSchedule,
    getStudentsForSection,
    markAttendance,
    createNotice,
    getAssignedSections,
    getTargetingOptions,
    getCurrentClassForAttendance,
    updateClassStatus,
    getFacultyClassesForToday,
    getSubstituteClassesForToday,
    getFacultyTimetable,
    uploadQuestionPaper,
    submitExamMarksBulk,
    getFacultyQuestionPapers,
    getFacultyExamMarks,
    getAssignmentValidationContext,
    updateCODefinitions,
    getAttainmentReport,
    getSubstitutionSuggestions,
    getStudentHistoryByRegdNo
};
