const User = require('../models/User');
const Department = require('../models/Department');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const Timetable = require('../models/Timetable');
const AcademicCalendar = require('../models/AcademicCalendar');
const SectionAssignment = require('../models/SectionAssignment');
const QuestionPaper = require('../models/QuestionPaper');
const ExamMark = require('../models/ExamMark');
const Attendance = require('../models/Attendance');

const getUsers = async (req, res) => {
    try {
        const role = req.query.role;
        const query = role ? { role } : {};
        const users = await User.find(query).select('-password');
        res.json(users);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getDepartments = async (req, res) => {
    try {
        const deps = await Department.find();
        res.json(deps);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getSections = async (req, res) => {
    try {
        const sections = await Section.find().populate('department_id');
        res.json(sections);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find();
        res.json(subjects);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getClassrooms = async (req, res) => {
    try {
        const rooms = await Classroom.find();
        res.json(rooms);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getTimetables = async (req, res) => {
    try {
        const timetables = await Timetable.find()
            .populate('section_id')
            .populate('subject_id')
            .populate('faculty_id')
            .populate('classroom_id');
        res.json(timetables);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const createDepartment = async (req, res) => {
    try {
        const dep = await Department.create(req.body);
        res.status(201).json(dep);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const createSection = async (req, res) => {
    try {
        const space = await Section.create(req.body);
        res.status(201).json(space);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const createSubject = async (req, res) => {
    try {
        const subject = await Subject.create(req.body);
        res.status(201).json(subject);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const createClassroom = async (req, res) => {
    try {
        const room = await Classroom.create(req.body);
        res.status(201).json(room);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const createTimetable = async (req, res) => {
    try {
        const timetable = await Timetable.create(req.body);
        res.status(201).json(timetable);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getDashboardStats = async (req, res) => {
    try {
        const studentCount = await User.countDocuments({ role: 'Student' });
        const facultyCount = await User.countDocuments({ role: 'Faculty' });
        const departmentCount = await Department.countDocuments();

        res.json({ studentCount, facultyCount, departmentCount });
    } catch (error) { res.status(500).json({ message: error.message }); }
}

const assignSectionsToFaculty = async (req, res) => {
    try {
        const { facultyId, sectionIds } = req.body;
        const faculty = await User.findById(facultyId);
        if (!faculty || faculty.role !== 'Faculty') {
            return res.status(404).json({ message: 'Faculty not found' });
        }
        faculty.assignedSections = sectionIds;
        await faculty.save();
        res.json({ message: 'Sections assigned successfully', faculty });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const assignSectionTeacher = async (req, res) => {
    try {
        const { facultyId, sectionId, subjectId, role } = req.body;
        const faculty = await User.findById(facultyId);
        if (!faculty || faculty.role !== 'Faculty') {
            return res.status(404).json({ message: 'Faculty not found' });
        }
        const section = await Section.findById(sectionId);
        const subject = await Subject.findById(subjectId);
        if (!section || !subject) {
            return res.status(404).json({ message: 'Section or subject not found' });
        }

        // Check if faculty already has 2 or more assignments for this section
        const existingAssignmentsCount = await SectionAssignment.countDocuments({ faculty_id: facultyId, section_id: sectionId });
        if (existingAssignmentsCount >= 2) {
            return res.status(400).json({ message: 'Faculty is already assigned to the maximum of 2 subjects for this section' });
        }

        // Check if this subject is already assigned to another faculty in this section
        const existingSubjectAssignment = await SectionAssignment.findOne({ section_id: sectionId, subject_id: subjectId });
        if (existingSubjectAssignment && existingSubjectAssignment.faculty_id.toString() !== facultyId) {
            return res.status(400).json({ message: 'This subject is already assigned to another faculty in this section' });
        }

        // If faculty already has this subject assigned, update it
        let assignment = await SectionAssignment.findOne({ faculty_id: facultyId, section_id: sectionId, subject_id: subjectId });
        if (assignment) {
            assignment.role = role || 'Teacher';
            await assignment.save();
        } else {
            // Create new assignment
            assignment = await SectionAssignment.create({
                faculty_id: facultyId,
                section_id: sectionId,
                subject_id: subjectId,
                role: role || 'Teacher'
            });
        }

        if (role === 'Teacher') {
            section.main_faculty_id = facultyId;
            await section.save();

            faculty.assignedSections = faculty.assignedSections || [];
            if (!faculty.assignedSections.some(id => id.toString() === sectionId.toString())) {
                faculty.assignedSections.push(sectionId);
                await faculty.save();
            }
        } else if (role === 'TA') {
            section.ta_faculty_ids = section.ta_faculty_ids || [];
            if (!section.ta_faculty_ids.includes(facultyId)) {
                section.ta_faculty_ids.push(facultyId);
                await section.save();
            }
        }
        res.json({ message: 'Section assignment saved', assignment });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Assignment already exists or violates uniqueness constraints' });
        }
        res.status(500).json({ message: error.message });
    }
};

const getSectionAssignments = async (req, res) => {
    try {
        const assignments = await SectionAssignment.find()
            .populate('section_id', 'name semester')
            .populate('subject_id', 'name code')
            .populate('faculty_id', 'name email');
        res.json(assignments);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getAllQuestionPapers = async (req, res) => {
    try {
        const papers = await QuestionPaper.find()
            .populate('section_id', 'name semester')
            .populate('subject_id', 'name code')
            .populate('faculty_id', 'name email');
        res.json(papers);
    } catch (error) { res.status(500).json({ message: error.message }); }
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

        // Fetch Marks history
        const marks = await ExamMark.find({ student_id: student._id })
            .populate('subject_id', 'name code')
            .populate('section_id', 'name semester')
            .sort({ recorded_at: -1 });

        // Fetch Attendance history
        // Since attendance records are embedded in the Attendance model, we search for docs where records contains the student_id
        const attendanceDocs = await Attendance.find({ 
            'records.student_id': student._id 
        })
        .populate('subject_id', 'name code')
        .populate('section_id', 'name semester')
        .sort({ date: -1 });

        // Transform attendance to show only this student's status per session
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

const getAllExamMarks = async (req, res) => {
    try {
        const marks = await ExamMark.find()
            .populate('section_id', 'name semester')
            .populate('subject_id', 'name code')
            .populate('student_id', 'name email regd_no')
            .populate('faculty_id', 'name email');
        res.json(marks);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const generateTimetableForFaculty = async (req, res) => {
    try {
        const { facultyId, regenerateAll } = req.body;
        let assignments;

        if (regenerateAll) {
            await Timetable.deleteMany({});
        }

        if (facultyId) {
            const faculty = await User.findById(facultyId);
            if (!faculty || faculty.role !== 'Faculty') {
                return res.status(404).json({ message: 'Faculty not found' });
            }
            assignments = await SectionAssignment.find({ faculty_id: facultyId, role: 'Teacher' })
                .populate('section_id', 'name semester')
                .populate('subject_id', 'name code')
                .populate('faculty_id', 'name email');
        } else {
            assignments = await SectionAssignment.find({ role: 'Teacher' })
                .populate('section_id', 'name semester')
                .populate('subject_id', 'name code')
                .populate('faculty_id', 'name email');
        }

        if (!assignments.length) {
            return res.status(404).json({ message: 'No teacher assignments found to generate timetable' });
        }

        const classrooms = await Classroom.find();
        if (!classrooms.length) {
            return res.status(400).json({ message: 'No classrooms available to generate timetable' });
        }

        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const timeSlots = [
            { start: '09:00', end: '09:50' },
            { start: '10:00', end: '10:50' },
            { start: '11:00', end: '11:50' },
            { start: '13:00', end: '13:50' },
            { start: '14:00', end: '14:50' },
            { start: '15:00', end: '15:50' }
        ];

        const usedSlots = new Map(); // key: day-time, value: { classroomId, sectionId, facultyId }
        const facultySlots = new Map();
        const sectionSlots = new Map();
        const timetableEntries = [];

        const getSlotKey = (day, start) => `${day}-${start}`;

        const tryFindSlot = (sectionId, facultyId) => {
            for (const day of daysOfWeek) {
                for (const slot of timeSlots) {
                    const key = getSlotKey(day, slot.start);
                    const sectionKey = `${sectionId}-${key}`;
                    const facultyKey = `${facultyId}-${key}`;

                    if (sectionSlots.has(sectionKey) || facultySlots.has(facultyKey)) {
                        continue;
                    }

                    for (const classroom of classrooms) {
                        const roomKey = `${classroom._id.toString()}-${key}`;
                        if (!usedSlots.has(roomKey)) {
                            usedSlots.set(roomKey, true);
                            sectionSlots.set(sectionKey, true);
                            facultySlots.set(facultyKey, true);
                            return { day, slot, classroom };
                        }
                    }
                }
            }
            return null;
        };

        for (const assignment of assignments) {
            const section = assignment.section_id;
            const faculty = assignment.faculty_id;
            const subject = assignment.subject_id;

            if (!section || !faculty || !subject) continue;

            const classCount = 2;
            let scheduled = 0;
            const pickedDays = new Set();

            while (scheduled < classCount) {
                const slotOffer = tryFindSlot(section._id.toString(), faculty._id.toString());
                if (!slotOffer) break;

                const entry = {
                    section_id: section._id,
                    subject_id: subject._id,
                    faculty_id: faculty._id,
                    classroom_id: slotOffer.classroom._id,
                    day_of_week: slotOffer.day,
                    start_time: slotOffer.slot.start,
                    end_time: slotOffer.slot.end,
                    semester: section.semester,
                    academic_year: '2024-2025',
                    status: 'Scheduled'
                };

                timetableEntries.push(entry);
                scheduled += 1;
                pickedDays.add(slotOffer.day);

                if (pickedDays.size >= daysOfWeek.length) break;
            }
        }

        if (!timetableEntries.length) {
            return res.status(400).json({ message: 'Unable to generate timetable with current constraints' });
        }

        await Timetable.insertMany(timetableEntries);

        // CRITICAL: Update faculty.assignedSections to match timetable entries
        const facultyAssignments = new Map(); // facultyId -> Set of sectionIds
        for (const entry of timetableEntries) {
            const fId = entry.faculty_id.toString();
            if (!facultyAssignments.has(fId)) {
                facultyAssignments.set(fId, new Set());
            }
            facultyAssignments.get(fId).add(entry.section_id.toString());
        }

        // Update each faculty's assignedSections
        for (const [fId, sectionIds] of facultyAssignments.entries()) {
            await User.findByIdAndUpdate(
                fId,
                { assignedSections: Array.from(sectionIds) },
                { new: true }
            );
        }

        res.status(201).json({
            message: 'Dynamic timetable generated successfully and faculty assignments synchronized',
            generatedEntries: timetableEntries.length,
            facultiesUpdated: facultyAssignments.size,
            details: timetableEntries.slice(0, 20)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Academic Calendar Functions
const getAcademicCalendar = async (req, res) => {
    try {
        const { month, year, department_id } = req.query;
        let query = {};
        
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            query.date = { $gte: startDate, $lte: endDate };
        }
        
        if (department_id) {
            query.$or = [
                { target_audience: 'Global' },
                { target_audience: 'Department', department_id }
            ];
        } else {
            query.target_audience = 'Global';
        }

        const events = await AcademicCalendar.find(query)
            .populate('department_id', 'name')
            .populate('created_by', 'name')
            .sort({ date: 1 });
            
        res.json(events);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const createAcademicCalendar = async (req, res) => {
    try {
        const calendarEvent = await AcademicCalendar.create({
            ...req.body,
            created_by: req.user.id
        });
        
        const populatedEvent = await AcademicCalendar.findById(calendarEvent._id)
            .populate('department_id', 'name')
            .populate('created_by', 'name');
            
        res.status(201).json(populatedEvent);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateAcademicCalendar = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await AcademicCalendar.findByIdAndUpdate(
            id, 
            req.body, 
            { new: true, runValidators: true }
        )
        .populate('department_id', 'name')
        .populate('created_by', 'name');
        
        if (!event) {
            return res.status(404).json({ message: 'Calendar event not found' });
        }
        
        res.json(event);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const deleteAcademicCalendar = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await AcademicCalendar.findByIdAndDelete(id);
        
        if (!event) {
            return res.status(404).json({ message: 'Calendar event not found' });
        }
        
        res.json({ message: 'Calendar event deleted successfully' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// Bulk User Operations
const bulkCreateUsers = async (req, res) => {
    try {
        const { users } = req.body; // Array of user objects
        
        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ message: 'Users array is required' });
        }

        const bcrypt = require('bcrypt');
        const salt = await bcrypt.genSalt(10);
        
        const usersWithHashedPasswords = await Promise.all(
            users.map(async (user) => ({
                ...user,
                password: await bcrypt.hash(user.password, salt)
            }))
        );

        const createdUsers = await User.insertMany(usersWithHashedPasswords);
        
        // Remove passwords from response
        const usersWithoutPasswords = createdUsers.map(user => ({
            ...user.toObject(),
            password: undefined
        }));

        res.status(201).json({
            message: `Successfully created ${usersWithoutPasswords.length} users`,
            users: usersWithoutPasswords
        });
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

const bulkDeleteUsers = async (req, res) => {
    try {
        const { userIds } = req.body; // Array of user IDs
        
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'User IDs array is required' });
        }

        const result = await User.deleteMany({ _id: { $in: userIds } });
        
        res.json({
            message: `Successfully deleted ${result.deletedCount} users`,
            deletedCount: result.deletedCount
        });
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

const bulkUpdateUsers = async (req, res) => {
    try {
        const { updates } = req.body; // Array of { id, updateData }
        
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ message: 'Updates array is required' });
        }

        const updatePromises = updates.map(({ id, updateData }) => 
            User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
        );

        const updatedUsers = await Promise.all(updatePromises);
        
        // Remove passwords from response
        const usersWithoutPasswords = updatedUsers.map(user => ({
            ...user?.toObject(),
            password: undefined
        }));

        res.json({
            message: `Successfully updated ${usersWithoutPasswords.length} users`,
            users: usersWithoutPasswords
        });
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

// SYNCHRONIZATION: Fix mismatch between assignedSections and timetable entries
const synchronizeAssignedSections = async (req, res) => {
    try {
        const { facultyId } = req.body; // Optional - sync specific faculty or all if not provided

        let query = {};
        if (facultyId) {
            query.faculty_id = facultyId;
        }

        // Get all timetable entries
        const timetables = await Timetable.find(query).distinct('faculty_id');
        const sectionMap = new Map(); // facultyId -> Set of sectionIds

        // Build the correct sections from timetable
        const allTimetables = facultyId 
            ? await Timetable.find({ faculty_id: facultyId })
            : await Timetable.find();

        for (const tt of allTimetables) {
            const fId = tt.faculty_id.toString();
            const sId = tt.section_id.toString();
            if (!sectionMap.has(fId)) {
                sectionMap.set(fId, new Set());
            }
            sectionMap.get(fId).add(sId);
        }

        // Also check SectionAssignment for Teacher role
        const assignments = facultyId
            ? await SectionAssignment.find({ faculty_id: facultyId, role: 'Teacher' })
            : await SectionAssignment.find({ role: 'Teacher' });

        for (const sa of assignments) {
            const fId = sa.faculty_id.toString();
            const sId = sa.section_id.toString();
            if (!sectionMap.has(fId)) {
                sectionMap.set(fId, new Set());
            }
            sectionMap.get(fId).add(sId);
        }

        // Now update all faculty with the correct sections
        const updateResults = [];
        for (const [fId, sectionIds] of sectionMap.entries()) {
            const updatedUser = await User.findByIdAndUpdate(
                fId,
                { assignedSections: Array.from(sectionIds) },
                { new: true }
            ).select('name email assignedSections');

            updateResults.push({
                facultyId: fId,
                name: updatedUser?.name,
                email: updatedUser?.email,
                assignedSectionsCount: Array.from(sectionIds).length
            });
        }

        res.json({
            message: 'Faculty assigned sections synchronized successfully',
            syncedFaculty: updateResults.length,
            details: updateResults
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DIAGNOSTIC: Check for mismatches between assignedSections and timetable
const checkSectionMismatch = async (req, res) => {
    try {
        const { facultyId } = req.body; // Optional

        let facultyQuery = { role: 'Faculty' };
        if (facultyId) {
            facultyQuery._id = facultyId;
        }

        const faculties = await User.find(facultyQuery).populate('assignedSections', 'name');
        const mismatches = [];

        for (const faculty of faculties) {
            const assignedSectionIds = new Set(faculty.assignedSections?.map(s => s._id?.toString() || s.toString()) || []);

            // Get sections from timetable
            const timetableSections = await Timetable.find({ faculty_id: faculty._id }).distinct('section_id');
            const timetableSectionIds = new Set(timetableSections.map(s => s.toString()));

            // Get sections from SectionAssignment (Teacher role)
            const assignmentSections = await SectionAssignment.find({ 
                faculty_id: faculty._id, 
                role: 'Teacher' 
            }).distinct('section_id');
            const assignmentSectionIds = new Set(assignmentSections.map(s => s.toString()));

            // Compare
            const mismatch = {
                facultyId: faculty._id,
                name: faculty.name,
                email: faculty.email,
                assignedSectionsCount: assignedSectionIds.size,
                timetableSectionsCount: timetableSectionIds.size,
                assignmentSectionsCount: assignmentSectionIds.size,
                hasMatch: assignedSectionIds.size === timetableSectionIds.size && assignedSectionIds.size === assignmentSectionIds.size,
                details: {
                    inAssigned: Array.from(assignedSectionIds),
                    inTimetable: Array.from(timetableSectionIds),
                    inAssignment: Array.from(assignmentSectionIds)
                }
            };

            if (!mismatch.hasMatch) {
                mismatches.push(mismatch);
            }
        }

        res.json({
            totalFaculty: faculties.length,
            mismatchCount: mismatches.length,
            mismatches: mismatches
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// SYNCHRONIZATION: Comprehensive sync of all faculty sections from all sources
const syncAllFacultySections = async (req, res) => {
    try {
        const faculties = await User.find({ role: 'Faculty' });
        const syncResults = [];

        for (const faculty of faculties) {
            const sectionMap = new Map();

            // Source 1: Current assignedSections
            if (faculty.assignedSections && faculty.assignedSections.length > 0) {
                for (const sectionId of faculty.assignedSections) {
                    sectionMap.set(sectionId.toString(), true);
                }
            }

            // Source 2: Timetable sections
            const timetableSections = await Timetable.find({ faculty_id: faculty._id }).distinct('section_id');
            for (const sectionId of timetableSections) {
                sectionMap.set(sectionId.toString(), true);
            }

            // Source 3: SectionAssignment sections (Teacher role)
            const assignmentSections = await SectionAssignment.find({ 
                faculty_id: faculty._id, 
                role: 'Teacher' 
            }).distinct('section_id');
            for (const sectionId of assignmentSections) {
                sectionMap.set(sectionId.toString(), true);
            }

            const mergedSectionIds = Array.from(sectionMap.keys());
            const previousCount = faculty.assignedSections?.length || 0;

            // Update if changed
            if (previousCount !== mergedSectionIds.length) {
                await User.findByIdAndUpdate(
                    faculty._id,
                    { assignedSections: mergedSectionIds },
                    { new: true }
                );

                syncResults.push({
                    name: faculty.name,
                    previousCount,
                    newCount: mergedSectionIds.length,
                    updated: true
                });
            } else {
                syncResults.push({
                    name: faculty.name,
                    previousCount,
                    newCount: mergedSectionIds.length,
                    updated: false
                });
            }
        }

        const updatedCount = syncResults.filter(r => r.updated).length;

        res.json({
            message: `Synchronization completed. ${updatedCount} faculty updated.`,
            totalFaculty: faculties.length,
            updated: updatedCount,
            results: syncResults
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// NEW: Get section details with students, faculties, and timetable
const getSectionDetails = async (req, res) => {
    try {
        const { sectionId } = req.params;
        
        // Get section with populated references
        const section = await Section.findById(sectionId)
            .populate('department_id', 'name')
            .populate('main_faculty_id', 'name email faculty_id')
            .populate({
                path: 'students',
                select: 'name email regd_no section_id'
            })
            .populate({
                path: 'ta_faculty_ids',
                select: 'name email faculty_id'
            });

        if (!section) {
            return res.status(404).json({ message: 'Section not found' });
        }

        // Get timetable for this section
        const timetable = await Timetable.find({ section_id: sectionId })
            .populate('faculty_id', 'name email faculty_id')
            .populate('subject_id', 'name code')
            .populate('classroom_id', 'room_number');

        // Get all faculties assigned to this section via SectionAssignment
        const sectionAssignments = await SectionAssignment.find({ section_id: sectionId })
            .populate('faculty_id', 'name email faculty_id')
            .populate('subject_id', 'name code');

        res.json({
            section,
            students: section.students,
            faculties: {
                mainFaculty: section.main_faculty_id,
                taFaculties: section.ta_faculty_ids,
                allAssignments: sectionAssignments
            },
            timetable,
            studentCount: section.students.length,
            facultyCount: section.ta_faculty_ids.length + (section.main_faculty_id ? 1 : 0)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// NEW: Assign students to a section
const assignStudentsToSection = async (req, res) => {
    try {
        const { sectionId } = req.params;
        const { studentIds } = req.body;

        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ message: 'Student IDs array is required' });
        }

        const section = await Section.findById(sectionId);
        if (!section) {
            return res.status(404).json({ message: 'Section not found' });
        }

        // Verify all students exist
        const students = await User.find({ _id: { $in: studentIds }, role: 'Student' });
        if (students.length !== studentIds.length) {
            return res.status(400).json({ message: 'Some student IDs are invalid' });
        }

        // Update section with new students
        const previousStudentCount = section.students.length;
        section.students = studentIds;
        section.strength = studentIds.length;
        await section.save();

        // Update each student's section_id
        await User.updateMany(
            { _id: { $in: studentIds } },
            { section_id: sectionId }
        );

        res.json({
            message: 'Students assigned to section successfully',
            section,
            previousStudentCount,
            newStudentCount: studentIds.length,
            addedStudents: studentIds.length - previousStudentCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// NEW: Get available students (not assigned to any section or can be reassigned)
const getAvailableStudents = async (req, res) => {
    try {
        const { departmentId } = req.query;

        let query = { role: 'Student' };
        if (departmentId) {
            query.department = departmentId;
        }

        const students = await User.find(query)
            .select('name email regd_no department section_id')
            .populate('section_id', 'name');

        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// NEW: Shuffle students within a department across sections
const shuffleStudentsInDepartment = async (req, res) => {
    try {
        const { department_id, semester } = req.body;

        if (!department_id || !semester) {
            return res.status(400).json({ message: 'department_id and semester are required' });
        }

        // 1. Get all students in this department
        const students = await User.find({ 
            role: 'Student', 
            department: department_id 
        });

        if (students.length === 0) {
            return res.status(404).json({ message: 'No students found in this department' });
        }

        // 2. Get all target sections for this department and semester
        const sections = await Section.find({ 
            department_id, 
            semester 
        });

        if (sections.length === 0) {
            return res.status(404).json({ message: 'No sections found for this department and semester' });
        }

        // 3. Shuffle students array (Fisher-Yates shuffle)
        const shuffledStudents = [...students];
        for (let i = shuffledStudents.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledStudents[i], shuffledStudents[j]] = [shuffledStudents[j], shuffledStudents[i]];
        }

        // 4. Distribute students across sections
        const sectionCount = sections.length;
        const studentGroups = Array.from({ length: sectionCount }, () => []);

        shuffledStudents.forEach((student, index) => {
            studentGroups[index % sectionCount].push(student._id);
        });

        // 5. Update Sections and Users in bulk where possible
        // First, clear old section references for these students
        // (Actually, the updateMany below will overwrite them)

        const updatePromises = [];

        for (let i = 0; i < sectionCount; i++) {
            const section = sections[i];
            const studentIds = studentGroups[i];

            // Update Section document
            updatePromises.push(Section.findByIdAndUpdate(section._id, {
                students: studentIds,
                strength: studentIds.length
            }));

            // Update all students in this group to point to the section
            updatePromises.push(User.updateMany(
                { _id: { $in: studentIds } },
                { section_id: section._id }
            ));
        }

        // Also, we should probably clear these students from ANY OTHER section they might have been in
        // if those sections are in different semesters. But updateMany on User handles the primary link.
        // For the Section.students array, we already updated the target sections.
        
        await Promise.all(updatePromises);

        res.json({
            message: `Successfully shuffled ${students.length} students into ${sectionCount} sections for semester ${semester}`,
            results: sections.map((s, i) => ({
                sectionName: s.name,
                studentCount: studentGroups[i].length
            }))
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getUsers, getDashboardStats,
    getDepartments, getSections, getSubjects, getClassrooms, getTimetables,
    createDepartment, createSection, createSubject, createClassroom, createTimetable,
    assignSectionsToFaculty, assignSectionTeacher, 
    getSectionAssignments,
    generateTimetableForFaculty, getAllQuestionPapers, getAllExamMarks,
    getAcademicCalendar, createAcademicCalendar, updateAcademicCalendar, deleteAcademicCalendar,
    bulkCreateUsers, bulkDeleteUsers, bulkUpdateUsers,
    synchronizeAssignedSections, checkSectionMismatch, syncAllFacultySections,
    getSectionDetails, assignStudentsToSection, getAvailableStudents,
    shuffleStudentsInDepartment, getStudentHistoryByRegdNo
};
