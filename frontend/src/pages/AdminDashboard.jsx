import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import ExportReportButton from '../components/ExportReportButton';
import AdminTimetablesTab from '../components/admin/AdminTimetablesTab';
import AdminShuffleStudentsTab from '../components/admin/AdminShuffleStudentsTab';
import AdminRiskAnalysisTab from '../components/admin/AdminRiskAnalysisTab';
import AdminQuestionPapersTab from '../components/admin/AdminQuestionPapersTab';
import AdminExamMarksTab from '../components/admin/AdminExamMarksTab';
import StudentHistoryModal from '../components/shared/StudentHistoryModal';


const AdminDashboard = () => {
    const [stats, setStats] = useState({ studentCount: 0, facultyCount: 0, departmentCount: 0 });
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [sections, setSections] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [timetables, setTimetables] = useState([]);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [showDefaulters, setShowDefaulters] = useState(false);
    const [defaulterFilters, setDefaulterFilters] = useState({ department: 'All', semester: 'All' });
    const [facultyUsers, setFacultyUsers] = useState([]);

    // Faculty Assignment Modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedFaculty, setSelectedFaculty] = useState(null);
    const [selectedSections, setSelectedSections] = useState([]);

    // Section Details are handled in AdminSectionDetails page

    // Timetable Filtering
    const [ttFilterType, setTtFilterType] = useState('All'); // 'All', 'Faculty', 'Class'
    const [ttFilterValue, setTtFilterValue] = useState('');
    const [searchRegdNo, setSearchRegdNo] = useState('');
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historySearchTerm, setHistorySearchTerm] = useState('');

    // Tab State: 'home', 'users', 'departments', 'sections', 'subjects', 'classrooms', 'timetables', 'analytics', 'faculty', 'bulk'
    const [activeTab, setActiveTab] = useState('home');

    const { logout, user } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        fetchStats();
        fetchData('department', setDepartments);

        // Setup Socket.IO listener for real-time attendance updates
        const socket = io('http://localhost:5000');
        
        socket.on('attendance_marked', (data) => {
            console.log('Real-time attendance update:', data);
            // Update stats when new attendance is marked
            fetchStats();
            
            // Show toast notification for admin
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('apiError', { 
                    detail: { 
                        message: `📊 New Attendance: ${data.presentCount} present, ${data.absentCount} absent in ${data.subject?.name || 'class'}`, 
                        type: 'info' 
                    } 
                }));
            }
        });

        socket.on('connect', () => {
            console.log('Admin connected to real-time updates');
        });

        socket.on('disconnect', () => {
            console.log('Admin disconnected from real-time updates');
        });

        // Fetch data based on active tab
        if (activeTab === 'users') fetchData('users', setUsers);
        else if (activeTab === 'departments') fetchData('department', setDepartments);
        else if (activeTab === 'sections') fetchData('section', setSections);
        else if (activeTab === 'subjects') fetchData('subject', setSubjects);
        else if (activeTab === 'classrooms') fetchData('classroom', setClassrooms);
        else if (activeTab === 'timetables') fetchData('timetable', setTimetables);
        else if (activeTab === 'calendar') fetchData('academic-calendar', setCalendarEvents);
        else if (activeTab === 'analytics') {
            fetchData('analytics/attendance', setAnalytics);
        }
        else if (activeTab === 'faculty') {
            fetchData('users?role=Faculty', setFacultyUsers);
            if (sections.length === 0) fetchData('section', setSections);
        }

        return () => socket.disconnect();
    }, [activeTab]);

    const fetchStats = async () => {
        try {
            const res = await api.get('/admin/stats');
            setStats(res.data);
        } catch (error) { console.error("Error fetching stats:", error); }
    };

    const fetchData = async (endpoint, setter) => {
        try {
            const res = await api.get(`/admin/${endpoint}`);
            setter(res.data);
        } catch (error) { console.error(`Error fetching ${endpoint}:`, error); }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'users') fetchData('users', setUsers);
        if (tab === 'departments') fetchData('department', setDepartments);
        if (tab === 'sections') fetchData('section', setSections);
        if (tab === 'subjects') fetchData('subject', setSubjects);
        if (tab === 'classrooms') fetchData('classroom', setClassrooms);
        if (tab === 'timetables') {
            fetchData('timetable', setTimetables);
            if (users.length === 0) fetchData('users', setUsers);
            if (sections.length === 0) fetchData('section', setSections);
        }
        if (tab === 'calendar') fetchData('academic-calendar', setCalendarEvents);
        if (tab === 'analytics') {
            fetchData('analytics/attendance', setAnalytics);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const generateTimetable = async (facultyId) => {
        try {
            await api.post('/admin/generate-timetable', { facultyId });
            alert('Timetable generated successfully!');
            fetchData('timetable', setTimetables); // Refresh timetables
        } catch (error) {
            alert('Error generating timetable: ' + (error.response?.data?.message || error.message));
        }
    };

    const assignSections = async (faculty) => {
        setSelectedFaculty(faculty);
        setSelectedSections(faculty.assignedSections?.map(s => s._id) || []);
        setShowAssignModal(true);
    };

    const submitAssignSections = async () => {
        try {
            await api.post('/admin/assign-sections', { facultyId: selectedFaculty._id, sectionIds: selectedSections });
            alert('Sections assigned successfully!');
            setShowAssignModal(false);
            fetchData('users?role=Faculty', setFacultyUsers); // Refresh faculty
        } catch (error) {
            alert('Error assigning sections: ' + (error.response?.data?.message || error.message));
        }
    };

    // Handle section click to navigate to details page
    const handleSectionClick = (section) => {
        navigate(`/admin/section/${section._id}`);
    };

    // Very basic create function for generic entities
    const handleCreate = async (endpoint, payload, refreshHandler) => {
        try {
            await api.post(`/admin/${endpoint}`, payload);
            refreshHandler();
            alert('Created successfully!');
        } catch (error) {
            alert('Error creating: ' + (error.response?.data?.message || error.message));
        }
    };

    const renderNavButton = (label, tabValue, icon) => (
        <button
            onClick={() => handleTabChange(tabValue)}
            className={`flex items-center space-x-3 w-full text-left px-5 py-3.5 rounded-xl transition-all duration-200 ${activeTab === tabValue ? 'bg-brand-50 text-brand-700 font-bold shadow-sm ring-1 ring-brand-500/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
        >
            <span className="text-lg">{icon}</span>
            <span className="font-medium">{label}</span>
        </button>
    );

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            <>
                {/* Sidebar */}
                <aside className="w-68 glass-sidebar flex flex-col z-20">
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md flex items-center justify-center">
                                <span className="text-white font-bold text-xl">S</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">SCAAMS</h2>
                                <p className="text-xs text-slate-500 font-medium">Admin Portal</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                        {renderNavButton('Dashboard Overview', 'home', '📊')}
                        {renderNavButton('User Management', 'users', '👥')}
                        {renderNavButton('Departments', 'departments', '🏢')}
                        {renderNavButton('Sections', 'sections', '🏷️')}
                        {renderNavButton('Subjects', 'subjects', '📚')}
                        {renderNavButton('Classrooms', 'classrooms', '🏫')}
                        {renderNavButton('Timetable Builder', 'timetables', '📅')}
                        {renderNavButton('Academic Calendar', 'calendar', '📆')}
                        {renderNavButton('Faculty Management', 'faculty', '👨‍🏫')}
                        {renderNavButton('Bulk Operations', 'bulk', '⚡')}
                        {renderNavButton('Shuffle Students', 'shuffle', '🔀')}
                        {renderNavButton('Risk Analysis', 'risk', '⚠️')}
                        {renderNavButton('Question Papers', 'papers', '📄')}
                        {renderNavButton('Exam Marks', 'marks', '📊')}
                        {renderNavButton('System Analytics', 'analytics', '📈')}
                    </div>
                    <div className="p-4 border-t border-slate-100">
                        <div className="flex items-center mb-4 px-2">
                            <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-slate-600 font-bold overflow-hidden shadow-sm">
                                {(user?.name || 'A')[0]}
                            </div>
                            <div className="ml-3 truncate">
                                <p className="text-sm font-semibold text-slate-700">{user?.name}</p>
                                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="w-full flex justify-center items-center px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors font-medium">
                            Log out
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                    {/* Decorative background gradients */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 pointer-events-none animate-blob"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 pointer-events-none animate-blob animation-delay-2000"></div>

                    <header className="glass-navbar p-6 z-10 flex justify-between items-center">
                        <h1 className="text-2xl font-extrabold text-slate-800 capitalize tracking-tight flex items-center gap-2">
                            {activeTab.replace(/([A-Z])/g, ' $1').trim()} Hub
                        </h1>
                    </header>

                    <div className="flex-1 overflow-y-auto p-8 z-10 custom-scrollbar">
                        {activeTab === 'home' && (
                            <div className="animate-fade-in space-y-8">
                                <div className="glass-card p-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-200">
                                    <h2 className="text-3xl font-bold mb-2">Welcome Back, {user?.name}</h2>
                                    <p className="text-indigo-100 max-w-2xl">Here's what's happening on campus today. Keep everything running smoothly from your command center.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="glass-card p-6 rounded-2xl flex items-center space-x-4">
                                        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl">👨‍🎓</div>
                                        <div>
                                            <p className="text-slate-500 font-medium text-sm">Total Students</p>
                                            <p className="text-3xl font-bold text-slate-800">{stats.studentCount}</p>
                                        </div>
                                    </div>
                                    <div className="glass-card p-6 rounded-2xl flex items-center space-x-4">
                                        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-2xl">👨‍🏫</div>
                                        <div>
                                            <p className="text-slate-500 font-medium text-sm">Total Faculty</p>
                                            <p className="text-3xl font-bold text-slate-800">{stats.facultyCount}</p>
                                        </div>
                                    </div>
                                    <div className="glass-card p-6 rounded-2xl flex items-center space-x-4">
                                        <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-2xl">🏢</div>
                                        <div>
                                            <p className="text-slate-500 font-medium text-sm">Departments</p>
                                            <p className="text-3xl font-bold text-slate-800">{stats.departmentCount}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="animate-fade-in space-y-6">
                                {/* Admin Student History Search */}
                                <div className="glass-card p-6 rounded-[32px] bg-white/70 border border-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-50">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-indigo-200">🔍</div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Student History Vault</h3>
                                            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Access comprehensive marks, attendance & profile data</p>
                                        </div>
                                    </div>
                                    <div className="flex w-full md:w-auto gap-3">
                                        <input 
                                            type="text" 
                                            placeholder="Enter Student Regd. No..."
                                            value={searchRegdNo}
                                            onChange={(e) => setSearchRegdNo(e.target.value)}
                                            className="flex-1 md:w-72 px-6 py-4 rounded-2xl border-2 border-slate-100 outline-none font-bold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 transition-all bg-white"
                                        />
                                        <button 
                                            onClick={() => { if(searchRegdNo) { setHistorySearchTerm(searchRegdNo); setShowHistoryModal(true); } }}
                                            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-xl"
                                        >
                                            Inspect Student
                                        </button>
                                    </div>
                                </div>

                                <div className="animate-fade-in glass-card rounded-2xl overflow-hidden bg-white/60">
                                    <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100/50 text-slate-600 text-sm font-semibold uppercase tracking-wider backdrop-blur-sm">
                                                <th className="p-4 border-b border-slate-200">Name</th>
                                                <th className="p-4 border-b border-slate-200">Email</th>
                                                <th className="p-4 border-b border-slate-200">Role</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {users.map(u => (
                                                <tr key={u._id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="p-4 font-medium text-slate-800">{u.name}</td>
                                                    <td className="p-4 text-slate-500">{u.email}</td>
                                                    <td className="p-4">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${u.role === 'Admin' ? 'bg-indigo-100 text-indigo-700' : u.role === 'Faculty' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        )}

                        {activeTab === 'departments' && (
                            <div className="animate-fade-in space-y-6">
                                <form className="glass-card p-6 rounded-2xl flex gap-4 bg-white/60" onSubmit={(e) => {
                                    e.preventDefault();
                                    handleCreate('department', { name: e.target.name.value }, () => fetchData('department', setDepartments));
                                    e.target.reset();
                                }}>
                                    <input name="name" placeholder="New Department Name" className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
                                    <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-indigo-700 transition">Add Department</button>
                                </form>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {departments.map(d => (
                                        <div key={d._id} className="glass-card p-6 rounded-2xl border-l-4 border-indigo-500 bg-white/60">
                                            <h3 className="font-bold text-lg text-slate-800">{d.name}</h3>
                                            <p className="text-sm text-slate-500 mt-1">HOD: {d.hod?.name || 'Unassigned'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'sections' && (
                            <div className="animate-fade-in space-y-6">
                                <form className="glass-card p-6 rounded-2xl flex gap-4 bg-white/60" onSubmit={(e) => {
                                    e.preventDefault();
                                    handleCreate('section', { name: e.target.name.value, semester: e.target.sem.value, department_id: e.target.dep.value }, () => fetchData('section', setSections));
                                    e.target.reset();
                                }}>
                                    <input name="name" placeholder="Section Name (e.g., A)" className="w-1/4 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
                                    <input name="sem" type="number" placeholder="Semester" className="w-1/4 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
                                    <select name="dep" className="flex-1 px-4 py-2 border border-slate-200 rounded-xl outline-none" required onClick={() => { if (departments.length === 0) fetchData('department', setDepartments) }}>
                                        <option value="">Select Department...</option>
                                        {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                    </select>
                                    <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-indigo-700 transition">Add</button>
                                </form>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {sections.map(s => (
                                        <div 
                                            key={s._id} 
                                            onClick={() => handleSectionClick(s)}
                                            className="glass-card p-6 rounded-2xl bg-white/60 cursor-pointer hover:shadow-lg hover:scale-105 transition-transform duration-200"
                                        >
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-xl text-slate-800">Section {s.name}</h3>
                                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold">Sem {s.semester}</span>
                                            </div>
                                            <p className="text-sm text-slate-500 mt-2">{s.department_id?.name || 'Unknown Dept'}</p>
                                            <p className="text-sm text-slate-600 mt-2">Students: <span className="font-bold text-indigo-600">{s.strength || 0}</span></p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'subjects' && (
                            <div className="animate-fade-in space-y-6">
                                <form className="glass-card p-6 rounded-2xl flex gap-4 flex-wrap bg-white/60" onSubmit={(e) => {
                                    e.preventDefault();
                                    handleCreate('subject', { name: e.target.name.value, code: e.target.code.value, department_id: e.target.dep.value }, () => fetchData('subject', setSubjects));
                                    e.target.reset();
                                }}>
                                    <input name="name" placeholder="Subject Name" className="flex-1 px-4 py-2 border border-slate-200 rounded-xl outline-none" required />
                                    <input name="code" placeholder="Subject Code" className="w-1/4 px-4 py-2 border border-slate-200 rounded-xl outline-none" required />
                                    <select name="dep" className="w-1/3 px-4 py-2 border border-slate-200 rounded-xl outline-none" required onClick={() => { if (departments.length === 0) fetchData('department', setDepartments) }}>
                                        <option value="">Select Department...</option>
                                        {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                    </select>
                                    <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium">Add Subject</button>
                                </form>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    {subjects.map(s => (
                                        <div key={s._id} className="glass-card p-5 rounded-2xl border-t-4 border-indigo-400 bg-white/60">
                                            <h3 className="font-bold text-slate-800 line-clamp-1">{s.name}</h3>
                                            <p className="font-mono text-sm text-indigo-600 mt-1 bg-indigo-50 inline-block px-2 py-0.5 rounded">{s.code}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'classrooms' && (
                            <div className="animate-fade-in space-y-6">
                                <form className="glass-card p-6 rounded-2xl flex gap-4 bg-white/60" onSubmit={(e) => {
                                    e.preventDefault();
                                    handleCreate('classroom', { room_number: e.target.room.value, capacity: e.target.cap.value, features: e.target.features.value.split(',') }, () => fetchData('classroom', setClassrooms));
                                    e.target.reset();
                                }}>
                                    <input name="room" placeholder="Room Number" className="w-1/4 px-4 py-2 border border-slate-200 rounded-xl outline-none" required />
                                    <input name="cap" type="number" placeholder="Capacity" className="w-1/4 px-4 py-2 border border-slate-200 rounded-xl outline-none" required />
                                    <input name="features" placeholder="Features (comma separated)" className="flex-1 px-4 py-2 border border-slate-200 rounded-xl outline-none" />
                                    <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium">Add</button>
                                </form>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    {classrooms.map(c => (
                                        <div key={c._id} className="glass-card p-5 rounded-2xl bg-white/60">
                                            <h3 className="font-bold text-slate-800 text-xl">Room {c.room_number}</h3>
                                            <p className="text-sm text-slate-500 mt-1">Capacity: {c.capacity}</p>
                                            <div className="mt-3 flex flex-wrap gap-1">
                                                {c.features?.map((f, i) => <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-sm uppercase tracking-wider">{f}</span>)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'timetables' && (
                            <AdminTimetablesTab 
                                timetables={timetables} setTimetables={setTimetables}
                                users={users} setUsers={setUsers}
                                sections={sections} setSections={setSections}
                                subjects={subjects} setSubjects={setSubjects}
                                classrooms={classrooms} setClassrooms={setClassrooms}
                                fetchData={fetchData} handleCreate={handleCreate}
                                ttFilterType={ttFilterType} setTtFilterType={setTtFilterType}
                                ttFilterValue={ttFilterValue} setTtFilterValue={setTtFilterValue}
                            />
                        )}

                        {activeTab === 'calendar' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="glass-card p-6 rounded-3xl bg-white/70">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-extrabold text-slate-800">Academic Calendar</h2>
                                        <button 
                                            onClick={() => {
                                                const title = prompt('Event Title:');
                                                const description = prompt('Description:');
                                                const date = prompt('Date (YYYY-MM-DD):');
                                                const type = prompt('Type (Holiday/Exam/Event/Deadline/Other):') || 'Other';
                                                
                                                if (title && description && date) {
                                                    handleCreate('academic-calendar', {
                                                        title, description, date: new Date(date), type, target_audience: 'Global'
                                                    }, () => fetchData('academic-calendar', setCalendarEvents));
                                                }
                                            }}
                                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition"
                                        >
                                            + Add Event
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {calendarEvents.map(event => (
                                            <div key={event._id} className={`p-5 rounded-2xl border-l-4 bg-white/60 ${
                                                event.type === 'Holiday' ? 'border-green-500' :
                                                event.type === 'Exam' ? 'border-red-500' :
                                                event.type === 'Event' ? 'border-blue-500' :
                                                event.type === 'Deadline' ? 'border-orange-500' :
                                                'border-slate-500'
                                            }`}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <h3 className="font-bold text-lg text-slate-800">{event.title}</h3>
                                                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                                        event.type === 'Holiday' ? 'bg-green-100 text-green-700' :
                                                        event.type === 'Exam' ? 'bg-red-100 text-red-700' :
                                                        event.type === 'Event' ? 'bg-blue-100 text-blue-700' :
                                                        event.type === 'Deadline' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {event.type}
                                                    </span>
                                                </div>
                                                <p className="text-slate-600 text-sm mb-3">{event.description}</p>
                                                <div className="flex justify-between items-center text-xs text-slate-500">
                                                    <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                                                    <span>{event.target_audience}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {calendarEvents.length === 0 && (
                                        <div className="text-center py-12 text-slate-500">
                                            <span className="text-6xl block mb-4">📅</span>
                                            <p className="text-lg font-medium">No calendar events</p>
                                            <p className="text-sm mt-2">Add holidays, exams, and important dates</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'faculty' && (
                            <div className="animate-fade-in glass-card rounded-2xl overflow-hidden bg-white/60">
                                <h3 className="text-xl font-bold p-6 bg-slate-100/50">Faculty Management</h3>
                                <div className="p-6">
                                    {facultyUsers.map(faculty => (
                                        <div key={faculty._id} className="border border-slate-200 rounded-xl p-4 mb-4 flex justify-between items-center">
                                            <div>
                                                <h4 className="font-semibold">{faculty.name}</h4>
                                                <p className="text-slate-500">{faculty.email}</p>
                                                <p>Assigned Sections: {faculty.assignedSections?.length || 0}</p>
                                            </div>
                                            <div>
                                                <button onClick={() => assignSections(faculty)} className="bg-blue-500 text-white px-4 py-2 rounded mr-2 hover:bg-blue-600">Assign Sections</button>
                                                <button onClick={() => generateTimetable(faculty._id)} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Generate Timetable</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'bulk' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="glass-card p-8 rounded-3xl bg-white/70">
                                    <h2 className="text-2xl font-extrabold text-slate-800 mb-6">Bulk Operations</h2>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Bulk Create Users */}
                                        <div className="p-6 border-2 border-dashed border-blue-200 rounded-2xl">
                                            <h3 className="font-bold text-lg text-blue-800 mb-4">📥 Bulk Create Users</h3>
                                            <p className="text-sm text-slate-600 mb-4">Create multiple users at once</p>
                                            <button 
                                                onClick={() => {
                                                    const csvData = prompt('Paste CSV data (name,email,password,role,department):');
                                                    if (csvData) {
                                                        const lines = csvData.split('\n');
                                                        const users = lines.map(line => {
                                                            const [name, email, password, role, department] = line.split(',');
                                                            return { name: name?.trim(), email: email?.trim(), password: password?.trim(), role: role?.trim(), department: department?.trim() };
                                                        }).filter(u => u.name && u.email);
                                                        
                                                        api.post('/admin/users/bulk-create', { users })
                                                            .then(response => {
                                                                alert(`Successfully created ${response.data.users.length} users`);
                                                                fetchData('users', setUsers);
                                                            })
                                                            .catch(error => {
                                                                alert('Failed to create users: ' + error.message);
                                                            });
                                                    }
                                                }}
                                                className="w-full bg-blue-600 text-white py-2 rounded-xl font-medium hover:bg-blue-700 transition"
                                            >
                                                Import from CSV
                                            </button>
                                        </div>

                                        {/* Bulk Delete Users */}
                                        <div className="p-6 border-2 border-dashed border-red-200 rounded-2xl">
                                            <h3 className="font-bold text-lg text-red-800 mb-4">🗑️ Bulk Delete Users</h3>
                                            <p className="text-sm text-slate-600 mb-4">Delete multiple users at once</p>
                                            <button 
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to delete selected users? This action cannot be undone.')) {
                                                        // For demo, delete last 2 users
                                                        const selectedUserIds = users.slice(-2).map(u => u._id);
                                                        
                                                        api.delete('/admin/users/bulk-delete', { userIds: selectedUserIds })
                                                            .then(response => {
                                                                alert(`Successfully deleted ${response.data.deletedCount} users`);
                                                                fetchData('users', setUsers);
                                                            })
                                                            .catch(error => {
                                                                alert('Failed to delete users: ' + error.message);
                                                            });
                                                    }
                                                }}
                                                className="w-full bg-red-600 text-white py-2 rounded-xl font-medium hover:bg-red-700 transition"
                                            >
                                                Delete Selected
                                            </button>
                                        </div>

                                        {/* Bulk Update Users */}
                                        <div className="p-6 border-2 border-dashed border-green-200 rounded-2xl">
                                            <h3 className="font-bold text-lg text-green-800 mb-4">✏️ Bulk Update Users</h3>
                                            <p className="text-sm text-slate-600 mb-4">Update multiple users at once</p>
                                            <button 
                                                onClick={() => {
                                                    const role = prompt('Enter new role for all users (Student/Faculty/Admin):');
                                                    if (role) {
                                                        const updates = users.slice(0, 3).map(u => ({
                                                            id: u._id,
                                                            updateData: { role: role.trim() }
                                                        }));
                                                        
                                                        api.put('/admin/users/bulk-update', { updates })
                                                            .then(response => {
                                                                alert(`Successfully updated ${response.data.users.length} users`);
                                                                fetchData('users', setUsers);
                                                            })
                                                            .catch(error => {
                                                                alert('Failed to update users: ' + error.message);
                                                            });
                                                    }
                                                }}
                                                className="w-full bg-green-600 text-white py-2 rounded-xl font-medium hover:bg-green-700 transition"
                                            >
                                                Update Role
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                        <h4 className="font-bold text-blue-800 mb-2">📋 CSV Format Example:</h4>
                                        <code className="text-sm bg-white p-2 rounded block">
                                            John Doe,john@example.com,password123,Student,Computer Science<br/>
                                            Jane Smith,jane@example.com,password456,Faculty,Information Technology
                                        </code>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'shuffle' && (
                            <AdminShuffleStudentsTab 
                                departments={departments} 
                                fetchData={fetchData} 
                                setDepartments={setDepartments} 
                            />
                        )}

                        {activeTab === 'risk' && (
                            <AdminRiskAnalysisTab />
                        )}

                        {activeTab === 'papers' && (
                            <AdminQuestionPapersTab />
                        )}

                        {activeTab === 'marks' && (
                            <AdminExamMarksTab />
                        )}

                        {activeTab === 'analytics' && analytics && (
                            <div className="animate-fade-in space-y-8 relative">
                                <div className="glass-card p-10 rounded-3xl text-center bg-white/80 border-t-8 border-indigo-500 shadow-2xl">
                                    <h2 className="text-3xl font-black mb-4 text-gradient">Real-Time System Analytics</h2>
                                    <p className="text-slate-600 max-w-lg mx-auto mb-8 text-lg flex items-center justify-center gap-2">
                                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse block shadow-[0_0_10px_rgba(239,68,68,0.7)]"></span>
                                        Live tracking attendance algorithms
                                        <button 
                                            onClick={fetchStats}
                                            className="ml-4 p-2 bg-white/50 hover:bg-white rounded-xl border border-slate-200 transition-all text-sm"
                                            title="Refresh Analytics"
                                        >
                                            🔄
                                        </button>
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex flex-col items-center justify-center">
                                            <div className="text-5xl font-black text-indigo-500 mb-2">{analytics.averageAttendance}%</div>
                                            <h3 className="font-bold text-indigo-900">Campus Average Attendance</h3>
                                            <p className="text-xs text-indigo-600 mt-2 font-medium">Across {analytics.totalStudents} total students</p>
                                        </div>

                                        <div className="p-6 rounded-2xl bg-orange-50/50 border border-orange-100 flex flex-col items-center justify-center relative overflow-hidden">
                                            {analytics.defaulters.length > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-red-500 rotate-45 transform translate-x-8 -translate-y-8 flex items-end justify-center pb-2 text-white font-bold shadow-lg text-xs">Alert</div>}
                                            <div className="text-5xl font-black text-orange-500 mb-2">{analytics.defaulters.length}</div>
                                            <h3 className="font-bold text-orange-900">Students &lt; 75% Attendance</h3>
                                            <button onClick={() => setShowDefaulters(true)} className="text-xs text-orange-600 mt-2 cursor-pointer font-bold hover:underline bg-white/50 px-3 py-1 rounded-full border border-orange-200">View Defaulters List</button>
                                        </div>

                                        <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex flex-col items-center justify-center">
                                            <div className="flex gap-4">
                                                <div className="text-center">
                                                    <div className="text-4xl font-black text-emerald-500 mb-2">{analytics.today.present}</div>
                                                    <p className="text-xs font-bold text-emerald-700 uppercase">Present</p>
                                                </div>
                                                <div className="w-px h-12 bg-emerald-200 self-center"></div>
                                                <div className="text-center">
                                                    <div className="text-4xl font-black text-slate-400 mb-2">{analytics.today.absent}</div>
                                                    <p className="text-xs font-bold text-slate-500 uppercase">Absent</p>
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-emerald-900 mt-4">Today's Marking Summary</h3>
                                            <p className="text-xs text-emerald-600 mt-1 font-medium">{analytics.today.totalMarked} records logged today</p>
                                        </div>
                                    </div>

                                    {/* Recharts Weekly Trend */}
                                    {analytics.weeklyTrend && (
                                        <div className="mt-10 p-8 rounded-3xl bg-white/70 backdrop-blur-md border border-slate-200 shadow-xl shadow-indigo-100/50 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-bl-[100px] -z-1"></div>
                                            <h3 className="text-2xl font-black text-slate-800 mb-2">Weekly Attendance Trend</h3>
                                            <p className="text-slate-500 mb-8 font-medium">Tracking daily present vs. absent ratios over the last 7 days.</p>
                                            <div className="h-80 w-full mt-4 z-10 relative">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={analytics.weeklyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                                        <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} tick={{fill: '#64748B', fontSize: 13, fontWeight: 700}} />
                                                        <YAxis axisLine={false} tickLine={false} dx={-10} tick={{fill: '#64748B', fontSize: 13, fontWeight: 700}} />
                                                        <RechartsTooltip 
                                                            contentStyle={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                                                            labelStyle={{ fontWeight: '900', color: '#1E293B', marginBottom: '8px', fontSize: '16px' }}
                                                        />
                                                        <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="circle" />
                                                        <Line type="monotone" dataKey="present" name="Present" stroke="#10B981" strokeWidth={5} dot={{r: 6, strokeWidth: 3, fill: '#fff'}} activeDot={{r: 10, stroke: '#10B981', strokeWidth: 3, fill: '#fff'}} />
                                                        <Line type="monotone" dataKey="absent" name="Absent" stroke="#F43F5E" strokeWidth={5} dot={{r: 6, strokeWidth: 3, fill: '#fff'}} activeDot={{r: 10, stroke: '#F43F5E', strokeWidth: 3, fill: '#fff'}} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Defaulters Modal */}
                                {showDefaulters && (
                                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                                        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative">
                                            <button onClick={() => setShowDefaulters(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 font-bold bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
                                            <div className="text-4xl mb-4">⚠️</div>
                                            <h2 className="text-2xl font-black text-slate-800 mb-2">Defaulters List</h2>
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                                <div className="flex flex-wrap gap-2">
                                                    <select 
                                                        value={defaulterFilters.department}
                                                        onChange={(e) => setDefaulterFilters(prev => ({ ...prev, department: e.target.value }))}
                                                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 outline-none focus:border-indigo-500"
                                                    >
                                                        <option value="All">All Departments</option>
                                                        {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                                                    </select>
                                                    <select 
                                                        value={defaulterFilters.semester}
                                                        onChange={(e) => setDefaulterFilters(prev => ({ ...prev, semester: e.target.value }))}
                                                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 outline-none focus:border-indigo-500"
                                                    >
                                                        <option value="All">All Semesters</option>
                                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s.toString()}>Semester {s}</option>)}
                                                    </select>
                                                </div>
                                                <ExportReportButton 
                                                    title="Defaulters List (<75%)" 
                                                    filename="SCAAMS_Defaulters" 
                                                    columns={['Regd No', 'Name', 'Department', 'Semester', 'Attendance %']} 
                                                    data={analytics.defaulters
                                                        .filter(d => (defaulterFilters.department === 'All' || d.department?.name === defaulterFilters.department))
                                                        .filter(d => (defaulterFilters.semester === 'All' || d.section_id?.semester?.toString() === defaulterFilters.semester))
                                                        .map(d => [d.regd_no || d.student_id || 'N/A', d.name, d.department?.name || 'Unassigned', d.section_id?.semester || 'N/A', `${d.attendance_percentage}%`])}
                                                />
                                            </div>

                                            <div className="max-h-96 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl">
                                                {analytics.defaulters.length === 0 ? (
                                                    <div className="p-8 text-center text-emerald-600 font-bold bg-emerald-50">No students are currently below 75%. Great!</div>
                                                ) : (
                                                    <table className="w-full text-left">
                                                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                                                            <tr>
                                                                <th className="p-4 font-semibold text-slate-600 text-xs">Regd No</th>
                                                                <th className="p-4 font-semibold text-slate-600 text-xs">Student Name</th>
                                                                <th className="p-4 font-semibold text-slate-600 text-xs">Department</th>
                                                                <th className="p-4 font-semibold text-slate-600 text-xs">Sem</th>
                                                                <th className="p-4 font-semibold text-slate-600 text-right text-xs">Attendance</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {analytics.defaulters
                                                                .filter(d => (defaulterFilters.department === 'All' || d.department?.name === defaulterFilters.department))
                                                                .filter(d => (defaulterFilters.semester === 'All' || d.section_id?.semester?.toString() === defaulterFilters.semester))
                                                                .map(d => (
                                                                    <tr key={d._id} className="hover:bg-red-50/50">
                                                                        <td className="p-4 text-xs font-black text-indigo-600 tracking-tighter">{d.regd_no || d.student_id || 'N/A'}</td>
                                                                        <td className="p-4 font-bold text-slate-800 text-xs">{d.name}</td>
                                                                        <td className="p-4 text-slate-500 text-xs">{d.department?.name || 'Unassigned'}</td>
                                                                        <td className="p-4 text-slate-500 text-xs font-bold text-center">{d.section_id?.semester || 'N/A'}</td>
                                                                        <td className="p-4 text-right">
                                                                            <span className="bg-red-100 text-red-700 font-bold px-3 py-1 rounded-full text-[10px]">{d.attendance_percentage}%</span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Assign Sections Modal */}
                        {showAssignModal && (
                            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                                <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative">
                                    <button onClick={() => setShowAssignModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 font-bold bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
                                    <div className="text-4xl mb-4">📚</div>
                                    <h2 className="text-2xl font-black text-slate-800 mb-2">Assign Sections to {selectedFaculty?.name}</h2>
                                    <p className="text-slate-500 mb-6">Select the sections this faculty will be responsible for.</p>

                                    <div className="max-h-96 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl p-4">
                                        {sections.map(section => (
                                            <label key={section._id} className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSections.includes(section._id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedSections([...selectedSections, section._id]);
                                                        } else {
                                                            setSelectedSections(selectedSections.filter(id => id !== section._id));
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500"
                                                />
                                                <div>
                                                    <span className="font-medium text-slate-800">{section.name}</span>
                                                    <span className="text-slate-500 text-sm ml-2">Semester {section.semester}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>

                                    <div className="flex justify-end space-x-4 mt-6">
                                        <button onClick={() => setShowAssignModal(false)} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 font-medium">Cancel</button>
                                        <button onClick={submitAssignSections} className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">Assign Sections</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showHistoryModal && (
                            <StudentHistoryModal 
                                regdNo={historySearchTerm} 
                                onClose={() => setShowHistoryModal(false)} 
                            />
                        )}

                    </div>
                </main>
            </>
        </div>
    );
};

export default AdminDashboard;
