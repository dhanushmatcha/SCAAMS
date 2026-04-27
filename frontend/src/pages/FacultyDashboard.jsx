import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import TimetableGrid from '../components/TimetableGrid';
import { io } from 'socket.io-client';
import FacultyAssignmentsTab from '../components/faculty/FacultyAssignmentsTab';
import FacultyQuestionPapersTab from '../components/faculty/FacultyQuestionPapersTab';
import FacultyMarksTab from '../components/faculty/FacultyMarksTab';
import FacultyAttainmentTab from '../components/faculty/FacultyAttainmentTab';

import ProfileTab from '../components/ProfileTab';
import { useError } from '../context/ErrorContext';
import StudentHistoryModal from '../components/shared/StudentHistoryModal';

const FacultyDashboard = () => {
    const { logout, user } = useContext(AuthContext);
    const navigate = useNavigate();

    // activeTab: schedule, attendance, sections, formatNotice, assignments
    const [activeTab, setActiveTab] = useState('schedule');
    const [schedule, setSchedule] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [students, setStudents] = useState([]);
    const [attendanceData, setAttendanceData] = useState({});
    const [assignedSections, setAssignedSections] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [targetingOptions, setTargetingOptions] = useState({ sections: [], departments: [] });
    const [scanMode, setScanMode] = useState('Manual'); // Manual, Facial, RFID
    const [isScanning, setIsScanning] = useState(false);
    const [activeSlotId, setActiveSlotId] = useState(null);
    const [assignmentContext, setAssignmentContext] = useState([]);
    const [questionPapers, setQuestionPapers] = useState([]);
    const [examMarks, setExamMarks] = useState([]);
    const [newAssignmentForm, setNewAssignmentForm] = useState({ contextId: '', title: '', description: '', total_marks: '', due_date: '', type: 'Assignment' });
    const [newPaperForm, setNewPaperForm] = useState({ contextId: '', filename: '', file_url: '', exam_type: 'T1', questions_data: {} });
    const [marksContextId, setMarksContextId] = useState('');
    const [marksExamType, setMarksExamType] = useState('T1');
    const [sectionStudents, setSectionStudents] = useState([]);
    const [studentMarks, setStudentMarks] = useState({});
    const [todayClasses, setTodayClasses] = useState([]);
    const [substituteClasses, setSubstituteClasses] = useState([]);
    const [todaySummary, setTodaySummary] = useState(null);
    const [substituteSummary, setSubstituteSummary] = useState(null);
    const [todayDate, setTodayDate] = useState('');
    const [loadingTodayClasses, setLoadingTodayClasses] = useState(false);
    const [loadingSubstituteClasses, setLoadingSubstituteClasses] = useState(false);
    const [showSubstituteClasses, setShowSubstituteClasses] = useState(false);
    const [showDirectClasses, setShowDirectClasses] = useState(true);
    const [selectedDirectSlotId, setSelectedDirectSlotId] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState('1');
    const [selectedMarkingSubjectId, setSelectedMarkingSubjectId] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    
    // Substitution State
    const [substitutionSuggestions, setSubstitutionSuggestions] = useState([]);
    const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
    const [activeSubstitutionSlotId, setActiveSubstitutionSlotId] = useState(null);
    const [searchRegdNo, setSearchRegdNo] = useState('');
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historySearchTerm, setHistorySearchTerm] = useState('');

    const fetchSubstitutionSuggestions = async (slotId) => {
        try {
            const res = await api.get(`/faculty/substitution-suggestions/${slotId}`);
            setSubstitutionSuggestions(res.data);
            setActiveSubstitutionSlotId(slotId);
            setShowSubstitutionModal(true);
        } catch (error) {
            showToast('Failed to find available faculty', 'error');
        }
    };

    const selectedDirectSlot = schedule.find(slot => slot._id === selectedDirectSlotId);

    // Toast Notification Hook
    const { addError } = useError();

    const showToast = (message, type = 'success') => {
        // Only trigger generic local toasts for non-API-errors because 
        // the api.js interceptor automatically broadcasts all API errors.
        if (type !== 'error') {
            addError(message, type);
        }
    };

    useEffect(() => {
        let newSocket;
        if (scanMode !== 'Manual' && isScanning) {
            newSocket = io(api.defaults?.baseURL?.replace('/api', '') || 'http://localhost:5000');
            
            newSocket.on('student_scanned', (data) => {
                if (data.student_id) {
                    setAttendanceData(prev => ({ ...prev, [data.student_id]: 'Present' }));
                    showToast(`Scanned: ${data.student_id.slice(-4)} (${data.scan_type})`, 'success');
                }
            });
        }
        return () => {
            if (newSocket) newSocket.disconnect();
        };
    }, [scanMode, isScanning]);

    useEffect(() => {
        fetchSchedule();
        fetchAssignedSections();
        fetchAssignments();
        fetchTargetingOptions();
        fetchAssignmentContext();
        fetchQuestionPapers();
        fetchExamMarks();
        fetchTodayClasses();
    }, []);

    const fetchSchedule = async () => {
        try {
            const res = await api.get('/faculty/schedule');
            setSchedule(res.data);

            // Auto-sync: Find currently active class based on day and time
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];
            const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

            const active = res.data.find(slot => {
                return slot.day_of_week === today &&
                    currentTime >= slot.start_time &&
                    currentTime <= slot.end_time;
            });
            if (active) setActiveSlotId(active._id);

        } catch (error) { console.error("Error fetching schedule", error); }
    };

    const fetchAssignedSections = async () => {
        try {
            const res = await api.get('/faculty/assigned-sections');
            setAssignedSections(res.data);
        } catch (error) { console.error("Error fetching assigned sections", error); }
    };

    const fetchAssignments = async () => {
        try {
            const res = await api.get('/assignments/faculty');
            setAssignments(res.data);
        } catch (error) { console.error("Error fetching assignments", error); }
    };

    const fetchTargetingOptions = async () => {
        try {
            const res = await api.get('/faculty/targeting-options');
            setTargetingOptions(res.data);
        } catch (error) { console.error("Error fetching targeting options", error); }
    };

    const fetchAssignmentContext = async () => {
        try {
            const res = await api.get('/faculty/assignments/context');
            setAssignmentContext(res.data);
            // Initial context is left empty so the user has to select it manually (Step 1, 2 flow)
            setNewAssignmentForm(prev => ({ ...prev, contextId: '' }));
            setNewPaperForm(prev => ({ ...prev, contextId: '' }));
            setMarksContextId('');
        } catch (error) {
            console.error('Error fetching assignment context', error);
        }
    };

    const fetchQuestionPapers = async () => {
        try {
            const res = await api.get('/faculty/question-papers');
            setQuestionPapers(res.data);
        } catch (error) {
            console.error('Error fetching question papers', error);
        }
    };

    const fetchExamMarks = async () => {
        try {
            const res = await api.get('/faculty/marks');
            setExamMarks(res.data);
        } catch (error) {
            console.error('Error fetching exam marks', error);
        }
    };

    const fetchTodayClasses = async () => {
        try {
            setLoadingTodayClasses(true);
            const res = await api.get('/faculty/today-classes');
            setTodayClasses(res.data.classes || []);
            setTodaySummary(res.data.summary || null);
            setTodayDate(res.data.date || '');
        } catch (error) {
            console.error('Error fetching today classes', error);
        } finally {
            setLoadingTodayClasses(false);
        }
    };

    const fetchSubstituteClasses = async () => {
        try {
            setLoadingSubstituteClasses(true);
            const res = await api.get('/faculty/substitute-classes');
            setSubstituteClasses(res.data.classes || []);
            setSubstituteSummary(res.data.summary || null);
        } catch (error) {
            console.error('Error fetching substitute classes', error);
        } finally {
            setLoadingSubstituteClasses(false);
        }
    };

    const getContextLabel = (context) => {
        if (!context) return 'Select a valid section / subject';
        const section = context.section_id?.name || 'Section';
        const subject = context.subject_id?.name || 'Subject';
        return `${section} — ${subject}`;
    };

    const getContextById = (id) => assignmentContext.find(item => item._id === id);

    const loadSectionStudents = async (sectionId) => {
        try {
            const res = await api.get(`/faculty/students/${sectionId}`);
            setSectionStudents(res.data);
            const marksMap = {};
            res.data.forEach(student => {
                marksMap[student._id] = { marks_obtained: '', remarks: '' };
            });
            setStudentMarks(marksMap);
        } catch (error) {
            console.error('Error loading section students', error);
            setSectionStudents([]);
        }
    };

    useEffect(() => {
        if (marksContextId) {
            const context = getContextById(marksContextId);
            if (context?.section_id?._id) {
                loadSectionStudents(context.section_id._id);
            }
        } else {
            setSectionStudents([]);
        }
    }, [marksContextId, assignmentContext]);

    const createAssignment = async () => {
        try {
            const context = getContextById(newAssignmentForm.contextId);
            if (!context) {
                showToast('Please select a valid section and subject context', 'error');
                return;
            }

            await api.post('/assignments', {
                title: newAssignmentForm.title,
                description: newAssignmentForm.description,
                total_marks: parseInt(newAssignmentForm.total_marks, 10),
                due_date: newAssignmentForm.due_date,
                type: newAssignmentForm.type,
                subject_id: context.subject_id._id,
                section_id: context.section_id._id,
                status: 'Published'
            });
            showToast('Assignment created successfully!', 'success');
            setNewAssignmentForm({ contextId: newAssignmentForm.contextId, title: '', description: '', total_marks: '', due_date: '', type: 'Assignment' });
            fetchAssignments();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to create assignment', 'error');
        }
    };

    const uploadQuestionPaper = async (isLocking = false) => {
        try {
            const context = getContextById(newPaperForm.contextId);
            if (!context) {
                showToast('Please select a valid section and subject context', 'error');
                return;
            }

            // Validation: Ensure questions_data has keys filled.
            const typedVals = Object.values(newPaperForm.questions_data || {}).filter(v => v.trim() !== '');
            if (typedVals.length === 0 && !newPaperForm.file_url) {
                showToast('Please either type out the questions or upload a combined PDF!', 'error');
                return;
            }
            if ((newPaperForm.exam_type === 'T1' || newPaperForm.exam_type === 'T4') && typedVals.length === 0) {
                 showToast(`You must fill in the question definitions for ${newPaperForm.exam_type}!`, 'error');
                 return;
            }

            await api.post('/faculty/question-paper', {
                section_id: context.section_id._id,
                subject_id: context.subject_id._id,
                filename: newPaperForm.filename,
                file_url: newPaperForm.file_url,
                exam_type: newPaperForm.exam_type,
                questions_data: newPaperForm.questions_data,
                locked: isLocking
            });
            showToast(isLocking ? 'Question paper permanently locked!' : 'Question paper uploaded successfully!', 'success');
            setNewPaperForm({ contextId: newPaperForm.contextId, filename: '', file_url: '', exam_type: 'T1', questions_data: {} });
            fetchQuestionPapers();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to upload question paper', 'error');
        }
    };

    const submitMarks = async (isLocking = false) => {
        try {
            const context = getContextById(marksContextId);
            if (!context) {
                showToast('Please select a valid section and subject context', 'error');
                return;
            }

            const marks = sectionStudents.map(student => {
                const bd = studentMarks[student._id]?.breakdown || {};
                const total = Object.values(bd).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
                return {
                    student_id: student._id,
                    marks_obtained: total,
                    breakdown_marks: bd,
                    remarks: studentMarks[student._id]?.remarks || ''
                };
            }).filter(entry => entry.marks_obtained > 0 || Object.keys(entry.breakdown_marks).length > 0);

            if (marks.length === 0) {
                showToast('Please enter marks for at least one student', 'error');
                return;
            }

            let maxMarks = 0;
            switch(marksExamType) {
                case 'T1': maxMarks = 30; break;
                case 'T2': maxMarks = 5; break;
                case 'T3': maxMarks = 5; break;
                case 'T4': maxMarks = 20; break;
                case 'T5': maxMarks = 20; break;
                case 'External Lab': maxMarks = 40; break;
            }

            await api.post('/faculty/marks/bulk', {
                section_id: context.section_id._id,
                subject_id: context.subject_id._id,
                exam_type: marksExamType,
                total_marks: maxMarks,
                marks,
                is_locking: isLocking
            });
            showToast(isLocking ? 'Marks permanently locked!' : 'Marks saved successfully!', 'success');
            fetchExamMarks();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to save marks', 'error');
        }
    };

    const handleMarksContextChange = (contextId) => {
        setMarksContextId(contextId);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleStartAttendance = async (slot) => {
        setSelectedSlot(slot);
        setScanMode('Manual'); // Reset to manual
        try {
            const sid = slot.section_id?._id || slot.section?._id || slot.section_id || slot.section;
            const res = await api.get(`/faculty/students/${sid}`);
            setStudents(res.data);

            // Initialize default attendance as 'Present' for quick UX
            const initialData = {};
            res.data.forEach(s => initialData[s._id] = 'Present'); // Default to Present (mark only absentees)
            setAttendanceData(initialData);
            setActiveTab('attendancePicker');
        } catch (error) { console.error("Error fetching students", error); }
    };

    const toggleScanner = () => {
        if (students.length === 0) return alert("No students to scan.");
        setIsScanning(!isScanning);
    };

    const submitAttendance = async () => {
        try {
            const records = students.map(s => ({
                student_id: s._id,
                status: attendanceData[s._id]
            }));

            // Check if this is a substitute class (has original_faculty field)
            const isSubstitute = selectedSlot.original_faculty ? true : false;

            await api.post('/faculty/attendance', {
                timetable_id: selectedSlot._id || selectedSlot.id,
                date: new Date().toISOString(),
                period: selectedPeriod,
                subject_id: selectedMarkingSubjectId,
                section_id: selectedSlot.section_id?._id || selectedSlot.section?._id || selectedSlot.section_id || selectedSlot.section,
                records,
                marked_method: scanMode,
                is_substitute: isSubstitute
            });
            
            // Optimistically update the local schedule state to show as Completed
            setSchedule(prev => prev.map(s => 
                s._id === (selectedSlot._id || selectedSlot.id) ? { ...s, class_status: 'Completed' } : s
            ));

            // Also update today's classes
            setTodayClasses(prev => prev.map(s => 
                (s.id || s._id) === (selectedSlot._id || selectedSlot.id) ? { ...s, class_status: 'Completed' } : s
            ));
            
            // Show new centered success modal instead of native alert/toast
            setShowSuccessModal(true);
            
            setAttendanceData({}); // Clear absentees
            setActiveTab('schedule');
            setSelectedSlot(null);
            setSelectedDirectSlotId('');
        } catch (error) {
            showToast(error.response?.data?.message || 'Error marking attendance', 'error');
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans relative overflow-hidden">
            <>
                {/* Centered Success Modal for Attendance */}
                {showSuccessModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center text-center transform transition-all">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
                                ✅
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">Success</h3>
                            <p className="text-slate-600 mb-6 text-lg tracking-wide">Att marked successfully</p>
                            <button onClick={() => setShowSuccessModal(false)} className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-500 hover:shadow-lg transition">
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* Substitution Suggestions Modal */}
                {showSubstitutionModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl animate-scale-up">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-slate-800">Available Faculty</h3>
                                <button onClick={() => setShowSubstitutionModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
                            </div>
                            <p className="text-slate-500 text-sm mb-6">Colleagues in your department who are free during this slot and can cover your class.</p>
                            
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {substitutionSuggestions.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 italic">No faculty members are currently free.</div>
                                ) : (
                                    substitutionSuggestions.map((faculty, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all group">
                                            <div>
                                                <div className="font-bold text-slate-800 group-hover:text-emerald-700">{faculty.name}</div>
                                                <div className="text-[10px] text-slate-500 font-medium">{faculty.email}</div>
                                            </div>
                                            <button className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-500 transition shadow-sm">
                                                Send Request
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                                <button onClick={() => setShowSubstitutionModal(false)} className="px-6 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                {/* Decorative background gradients */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 pointer-events-none animate-blob"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 pointer-events-none animate-blob animation-delay-2000"></div>

                <header className="glass-navbar p-5 flex justify-between items-center border-b-[3px] border-emerald-500 z-10">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-md flex items-center justify-center">
                            <span className="text-white font-bold text-xl">👨‍🏫</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-emerald-900 tracking-tight">Faculty Portal</h1>
                            <p className="text-xs text-slate-500 font-medium">Welcome, {user?.name}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-4 shadow-sm border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200">Sign Out</button>
                </header>

                <main className="flex-1 p-6 flex justify-center overflow-y-auto relative custom-scrollbar z-10">
                    <div className="w-full max-w-5xl mt-4 animate-fade-in">

                        {/* Navigation Pills - Single Line Compact Version */}
                        <div className="flex flex-nowrap gap-2 mb-8 bg-white/50 p-2 rounded-3xl backdrop-blur-sm border border-white/50 shadow-sm overflow-x-auto custom-scrollbar-hide">
                            <button onClick={() => setActiveTab('schedule')} className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === 'schedule' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-slate-600 hover:bg-white'}`}>
                                <span>📅</span> My Schedule
                            </button>
                            <button onClick={() => setActiveTab('sections')} className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === 'sections' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-slate-600 hover:bg-white'}`}>
                                <span>👥</span> Sections
                            </button>
                            <button onClick={() => setActiveTab('assignments')} className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === 'assignments' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-slate-600 hover:bg-white'}`}>
                                <span>📝</span> Assignments
                            </button>
                            <button onClick={() => setActiveTab('attendance')} className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === 'attendance' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-slate-600 hover:bg-white'}`}>
                                <span>✅</span> Attendance
                            </button>
                            <button onClick={() => setActiveTab('questionPapers')} className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === 'questionPapers' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-slate-600 hover:bg-white'}`}>
                                <span>📄</span> Papers
                            </button>
                            <button onClick={() => setActiveTab('examMarks')} className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === 'examMarks' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-slate-600 hover:bg-white'}`}>
                                <span>📊</span> Marks
                            </button>
                            <button onClick={() => setActiveTab('attainment')} className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === 'attainment' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-slate-600 hover:bg-white'}`}>
                                <span>📈</span> Attainment
                            </button>
                            <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === 'profile' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-slate-600 hover:bg-white'}`}>
                                <span>👤</span> Profile
                            </button>
                            <button onClick={() => setActiveTab('notice')} className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === 'notice' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-slate-600 hover:bg-white'}`}>
                                <span>📢</span> Notice
                            </button>
                        </div>

                        {activeTab === 'schedule' && (
                            <div className="space-y-6">
                                <div className="glass-card p-6 rounded-3xl bg-white/70">
                                    <h2 className="text-2xl font-extrabold text-slate-800 mb-6">Weekly Schedule</h2>
                                    
                                    <TimetableGrid 
                                     userRole="Faculty"
                                     assignedSections={assignedSections}
                                     onFindReplacement={fetchSubstitutionSuggestions}
                                     isCompact={true}
                                 />
                                </div>
                            </div>
                        )}

                        {activeTab === 'attendance' && (
                            <div className="space-y-4">
                                {/* Student History Search Bar */}
                                <div className="glass-card p-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-100 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🔍</div>
                                        <div>
                                            <h3 className="text-white font-black">Student History Lookup</h3>
                                            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-wider">Search marks & attendance by Regd. No</p>
                                        </div>
                                    </div>
                                    <div className="flex w-full md:w-auto gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="Enter Regd. No (e.g. 2100030001)"
                                            value={searchRegdNo}
                                            onChange={(e) => setSearchRegdNo(e.target.value)}
                                            className="flex-1 md:w-64 px-4 py-2 rounded-xl border-none outline-none font-bold text-slate-800 placeholder:text-slate-400 text-sm shadow-inner bg-white/90 focus:bg-white transition-all"
                                        />
                                        <button 
                                            onClick={() => { if(searchRegdNo) { setHistorySearchTerm(searchRegdNo); setShowHistoryModal(true); } }}
                                            className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg"
                                        >
                                            Search
                                        </button>
                                    </div>
                                </div>

                                {/* My Classes Section - Compact Version */}
                                <div className="glass-card p-4 rounded-2xl bg-white/80">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 mb-4">
                                        <div>
                                            <h2 className="text-xl font-black text-slate-800">My Today's Classes</h2>
                                            <p className="text-[10px] text-slate-500 font-medium">Scheduled for today.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-[10px] text-slate-600">
                                                <div className="font-bold">{todayDate || new Date().toISOString().slice(0, 10)}</div>
                                                <div className="opacity-75">{todaySummary?.total_classes ?? 0} classes · {todaySummary?.in_progress_classes ?? 0} in progress</div>
                                            </div>
                                            <button onClick={fetchTodayClasses} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition">Refresh</button>
                                        </div>
                                    </div>

                                    {loadingTodayClasses ? (
                                        <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-500">Loading...</div>
                                    ) : todayClasses.length === 0 ? (
                                        <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-500">No classes today.</div>
                                    ) : (
                                        <div className="grid gap-2">
                                            {todayClasses.map(slot => (
                                                <div key={slot.id || slot._id} className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-white transition-colors shadow-sm">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-indigo-500">{slot.start_time} - {slot.end_time}</p>
                                                        <h3 className="text-sm font-black text-slate-900">{slot.subject?.name || slot.subject_id?.name || 'Unknown Subject'}</h3>
                                                        <div className="flex gap-3 mt-1">
                                                            <p className="text-[10px] text-slate-500 font-bold">Sec: {slot.section?.name || slot.section_id?.name || '?'}</p>
                                                            <p className="text-[10px] text-slate-500 font-bold">Rm: {slot.classroom?.room_number || slot.classroom_id?.room_number || '?'}</p>
                                                            <p className={`text-[10px] font-bold ${slot.class_status === 'In Progress' ? 'text-emerald-600' : slot.class_status === 'Completed' ? 'text-slate-400' : 'text-indigo-600'}`}>{slot.class_status || 'Scheduled'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleStartAttendance(slot)} className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-500 transition shadow-md hover:shadow-lg transform active:scale-95">
                                                            {slot.class_status === 'In Progress' ? 'Resume' : 'Mark'}
                                                        </button>
                                                        <button onClick={() => fetchSubstitutionSuggestions(slot.id || slot._id)} disabled={slot.class_status === 'Completed'} className="px-4 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-300 transition disabled:opacity-30">
                                                            Substitute
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Direct Attendance & Substitute Sections - Compact */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="glass-card p-4 rounded-2xl bg-white/80 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-black text-slate-800">Direct Attendance</h2>
                                            <p className="text-[10px] text-slate-500">Pick any period to mark.</p>
                                        </div>
                                        <button onClick={() => setShowDirectClasses(prev => !prev)} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition">
                                            {showDirectClasses ? 'Hide' : 'Selector'}
                                        </button>
                                    </div>

                                    <div className="glass-card p-4 rounded-2xl bg-white/80 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-black text-slate-800">Substitute Classes</h2>
                                            <p className="text-[10px] text-slate-500">Cover for absent faculty.</p>
                                        </div>
                                        <button onClick={() => setShowSubstituteClasses(prev => !prev)} className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 transition">
                                            {showSubstituteClasses ? 'Hide' : 'Substitute'}
                                        </button>
                                    </div>
                                </div>

                                {showDirectClasses && (
                                    schedule.length === 0 ? (
                                        <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-500">No assigned classes found.</div>
                                    ) : (
                                        <div className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                            <div className="grid gap-3 md:grid-cols-[1fr_auto] items-center">
                                                <select 
                                                    value={selectedDirectSlotId} 
                                                    onChange={(e) => {
                                                        const slotId = e.target.value;
                                                        setSelectedDirectSlotId(slotId);
                                                        const slot = schedule.find(s => s._id === slotId);
                                                        if (slot) handleStartAttendance(slot);
                                                    }} 
                                                    className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none shadow-sm focus:ring-2 focus:ring-emerald-500 transition-all"
                                                >
                                                    <option value="">Select a Section to mark attendance</option>
                                                    {Array.from(new Set(schedule.map(s => (s.section_id?._id || s.section_id)).filter(Boolean))).map(id => {
                                                        const slot = schedule.find(s => (s.section_id?._id || s.section_id) === id);
                                                        return (
                                                            <option key={id} value={slot._id}>
                                                                {slot.section_id?.name || 'Unknown Section'}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                                <button onClick={() => selectedDirectSlot ? handleStartAttendance(selectedDirectSlot) : showToast('Please select a period first', 'error')} className="px-4 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition">
                                                    Load Selected Period
                                                </button>
                                            </div>

                                            {selectedDirectSlot && (
                                                <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-sm">
                                                    <p className="text-[10px] text-slate-500 font-bold">{selectedDirectSlot.day_of_week || 'Day'} • {selectedDirectSlot.start_time} - {selectedDirectSlot.end_time}</p>
                                                    <h3 className="text-sm font-black text-slate-900">{selectedDirectSlot.subject_id?.name || 'Unknown Subject'}</h3>
                                                    <p className="text-[10px] text-slate-600 font-bold">Section: {selectedDirectSlot.section_id?.name || 'Unknown Section'} • Room: {selectedDirectSlot.classroom_id?.room_number || 'TBA'}</p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                )}

                                {showSubstituteClasses && (
                                    loadingSubstituteClasses ? (
                                        <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-500">Loading substitute classes...</div>
                                    ) : substituteClasses.length === 0 ? (
                                        <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-500">No substitute classes available today.</div>
                                    ) : (
                                        <div className="grid gap-2">
                                            <h3 className="text-xs font-bold text-orange-600 uppercase tracking-widest px-1">Available Substitute Slots</h3>
                                            {substituteClasses.map(slot => (
                                                <div key={slot.id || slot._id} className="p-3 rounded-2xl border border-orange-100 bg-orange-50/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
                                                    <div>
                                                        <p className="text-[10px] text-orange-600 font-bold">{slot.start_time} - {slot.end_time}</p>
                                                        <h3 className="text-sm font-black text-slate-900">{slot.subject?.name || slot.subject_id?.name || 'Unknown Subject'}</h3>
                                                        <p className="text-[10px] text-slate-600 font-bold">Sec: {slot.section?.name || slot.section_id?.name || '?'} • Fac: {slot.original_faculty || '?'}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleStartAttendance(slot)} disabled={slot.class_status === 'Completed'} className="px-4 py-1.5 rounded-xl bg-orange-600 text-white text-[11px] font-bold hover:bg-orange-500 transition disabled:opacity-30">
                                                            {slot.class_status === 'In Progress' ? 'Resume' : 'Mark'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                )}
                            </div>
                        )}

                        {activeTab === 'attendancePicker' && selectedSlot && (
                            <div className="glass-card p-8 rounded-3xl bg-white/80 border-t-8 border-emerald-500 shadow-xl animate-fade-in relative">
                                <div className="absolute top-6 right-6 flex items-center gap-4">
                                    <select value={selectedMarkingSubjectId} onChange={(e) => setSelectedMarkingSubjectId(e.target.value)} className="p-2 rounded-lg border border-slate-200 outline-none shadow-sm text-sm font-semibold text-slate-700 bg-white">
                                        <option value="">Select Subject</option>
                                        {Array.from(new Set(
                                            schedule
                                                .filter(s => {
                                                    const sectionId = selectedSlot?.section_id?._id || selectedSlot?.section_id;
                                                    const sSectionId = s.section_id?._id || s.section_id;
                                                    return sSectionId === sectionId;
                                                })
                                                .map(s => s.subject_id?._id)
                                                .filter(Boolean)
                                        )).map(id => {
                                            const sub = schedule.find(s => s.subject_id?._id === id).subject_id;
                                            return <option key={id} value={id}>{sub.name}</option>;
                                        })}
                                    </select>
                                    <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="p-2 rounded-lg border border-slate-200 outline-none shadow-sm text-sm font-semibold text-slate-700 bg-white">
                                        <option value="1">Period 1</option>
                                        <option value="2">Period 2</option>
                                        <option value="3">Period 3</option>
                                        <option value="4">Period 4</option>
                                        <option value="5">Period 5</option>
                                        <option value="6">Period 6</option>
                                        <option value="7">Period 7</option>
                                    </select>
                                    <button onClick={() => setActiveTab('attendance')} className="text-slate-400 hover:text-slate-600 font-bold">✕ Close</button>
                                </div>
                                <h2 className="text-3xl font-black text-slate-800 mb-2">Marking Attendance</h2>
                                <p className="text-emerald-700 font-medium mb-6 bg-emerald-50 p-3 rounded-lg inline-block">{selectedSlot.subject?.name || selectedSlot.subject_id?.name} • Sec {selectedSlot.section?.name || selectedSlot.section_id?.name}</p>

                                {/* Smart Scanner Controls */}
                                <div className="mb-8 p-5 rounded-2xl border-2 border-slate-100 bg-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
                                    <div className="flex gap-2">
                                        {['Manual', 'Facial', 'RFID'].map(mode => (
                                            <button key={mode} onClick={() => setScanMode(mode)} className={`px-4 py-2 rounded-lg font-bold text-sm transition ${scanMode === mode ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                                                {mode === 'Manual' ? '✏️' : mode === 'Facial' ? '📸' : '💳'} {mode} Mode
                                            </button>
                                        ))}
                                    </div>

                                    {scanMode !== 'Manual' && (
                                        <button onClick={toggleScanner} className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-md transition flex items-center gap-2 ${isScanning ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-500 hover:shadow-lg transform hover:-translate-y-0.5'}`}>
                                            {isScanning ? (
                                                <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block"></span> Stop {scanMode} Scanning</>
                                            ) : (
                                                <><span className="text-lg">{scanMode === 'Facial' ? '📸' : '📡'}</span> Start {scanMode} Scan</>
                                            )}
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-4 mb-4">
                                    <button onClick={() => setAttendanceData(Object.fromEntries(students.map(s => [s._id, 'Present'])))} className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 font-bold transition text-sm shadow-sm ring-1 ring-emerald-300">
                                        ✅ Mark All Present
                                    </button>
                                    <button onClick={() => setAttendanceData(Object.fromEntries(students.map(s => [s._id, 'Absent'])))} className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 font-bold transition text-sm shadow-sm ring-1 ring-red-300">
                                        ❌ Mark All Absent
                                    </button>
                                </div>
                                <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-8 ${isScanning ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {students.map(s => (
                                        <div key={s._id} className={`p-2 px-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${attendanceData[s._id] === 'Absent' ? 'border-red-400 bg-red-50 shadow-sm ring-1 ring-red-400' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`} onClick={() => {
                                            setAttendanceData(prev => ({
                                                ...prev, [s._id]: prev[s._id] === 'Present' ? 'Absent' : 'Present'
                                            }))
                                        }}>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    {/* Absentee Checkbox */}
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${attendanceData[s._id] === 'Absent' ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300 bg-white'}`}>
                                                        {attendanceData[s._id] === 'Absent' && <span className="text-[10px] font-bold">✓</span>}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-xs tracking-tight">{s.regd_no || s.student_id || 'Unknown'}</div>
                                                        {s.name && <div className="text-[10px] text-slate-500 leading-none truncate max-w-[100px]">{s.name}</div>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${attendanceData[s._id] === 'Absent' ? 'text-red-700 bg-red-100' : 'text-slate-400 bg-slate-100'}`}>
                                                {attendanceData[s._id] === 'Absent' ? 'ABS' : 'PRE'}
                                            </div>
                                        </div>
                                    ))}
                                    {students.length === 0 && <p className="text-slate-500 col-span-full">No students found in this section.</p>}
                                </div>

                                <button onClick={submitAttendance} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-1 transform transition-all duration-300">
                                    Submit Official Attendance Record
                                </button>
                            </div>
                        )}

                        {activeTab === 'sections' && (
                            <div className="glass-card p-6 rounded-3xl bg-white/70 animate-fade-in">
                                <h2 className="text-2xl font-extrabold text-slate-800 mb-6">My Assigned Sections</h2>
                                {assignedSections.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                        No sections assigned yet. Contact admin for assignments.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {assignedSections.map(section => (
                                            <div key={section._id} className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl">
                                                <h3 className="font-bold text-blue-900">{section.name}</h3>
                                                <p className="text-blue-700">Semester: {section.semester}</p>
                                                <p className="text-blue-600">Students: {section.students?.length || 0}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'assignments' && (
                            <FacultyAssignmentsTab
                                newAssignmentForm={newAssignmentForm}
                                setNewAssignmentForm={setNewAssignmentForm}
                                assignmentContext={assignmentContext}
                                getContextLabel={getContextLabel}
                                createAssignment={createAssignment}
                                assignments={assignments}
                            />
                        )}

                        {activeTab === 'questionPapers' && (
                            <FacultyQuestionPapersTab
                                newPaperForm={newPaperForm}
                                setNewPaperForm={setNewPaperForm}
                                assignmentContext={assignmentContext}
                                getContextLabel={getContextLabel}
                                uploadQuestionPaper={uploadQuestionPaper}
                                questionPapers={questionPapers}
                            />
                        )}

                        {activeTab === 'examMarks' && (
                            <FacultyMarksTab
                                marksContextId={marksContextId}
                                handleMarksContextChange={handleMarksContextChange}
                                assignmentContext={assignmentContext}
                                getContextLabel={getContextLabel}
                                marksExamType={marksExamType}
                                setMarksExamType={setMarksExamType}
                                submitMarks={submitMarks}
                                sectionStudents={sectionStudents}
                                studentMarks={studentMarks}
                                setStudentMarks={setStudentMarks}
                                examMarks={examMarks}
                                lockMarks={() => submitMarks(true)}
                            />
                        )}

                        {activeTab === 'attainment' && (
                            <FacultyAttainmentTab 
                                assignmentContext={assignmentContext}
                                getContextLabel={getContextLabel}
                            />
                        )}

                        {activeTab === 'profile' && (
                            <ProfileTab />
                        )}

                        {activeTab === 'notice' && (
                            <div className="glass-card p-8 rounded-3xl bg-white/80 animate-fade-in max-w-2xl">
                                <h2 className="text-2xl font-bold text-slate-800 mb-6">Broadcast Official Notice</h2>
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    try {
                                        const formData = {
                                            title: e.target.title.value,
                                            content: e.target.content.value,
                                            target_audience: e.target.audience.value,
                                            department_id: e.target.audience.value === 'Department' ? e.target.department.value : null,
                                            section_id: e.target.audience.value === 'Section' ? e.target.section.value : null
                                        };
                                        
                                        await api.post('/faculty/notice', formData);
                                        showToast('Notice Broadcasted Successfully!', 'success');
                                        e.target.reset();
                                    } catch (error) { 
                                        showToast("Failed to send notice: " + error.message, 'error');
                                    }
                                }} className="space-y-4">
                                    <input name="title" placeholder="Notice Heading" className="w-full px-5 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white/50" required />
                                    <textarea name="content" placeholder="Type your full message here..." rows="5" className="w-full px-5 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white/50" required></textarea>
                                    
                                    <div className="space-y-3">
                                        <label className="block text-sm font-semibold text-slate-700">Target Audience</label>
                                        <select name="audience" className="w-full px-5 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white/50" required onChange={(e) => {
                                            // Show/hide relevant targeting fields
                                            const deptField = e.target.form.department;
                                            const secField = e.target.form.section;
                                            deptField.style.display = e.target.value === 'Department' ? 'block' : 'none';
                                            secField.style.display = e.target.value === 'Section' ? 'block' : 'none';
                                        }}>
                                            <option value="Global">Global - All Students</option>
                                            <option value="Department">Department Specific</option>
                                            <option value="Section">Section Specific</option>
                                        </select>
                                        
                                        <select name="department" className="w-full px-5 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white/50" style={{display: 'none'}}>
                                            <option value="">Select Department...</option>
                                            {targetingOptions.departments.map(dept => (
                                                <option key={dept._id} value={dept._id}>{dept.name}</option>
                                            ))}
                                        </select>
                                        
                                        <select name="section" className="w-full px-5 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white/50" style={{display: 'none'}}>
                                            <option value="">Select Section...</option>
                                            {targetingOptions.sections.map(section => (
                                                <option key={section._id} value={section._id}>{section.name} (Sem {section.semester})</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <button type="submit" className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold shadow-md hover:bg-slate-900 transition">Broadcast Notice</button>
                                </form>
                            </div>
                        )}

                    </div>

                    {showHistoryModal && (
                        <StudentHistoryModal 
                            regdNo={historySearchTerm} 
                            onClose={() => setShowHistoryModal(false)} 
                        />
                    )}

                </main>
            </>
        </div>
    );
};

export default FacultyDashboard;
