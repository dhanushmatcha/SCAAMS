import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import TimetableGrid from '../components/TimetableGrid';
import ProfileTab from '../components/ProfileTab';
import FeesTab from '../components/FeesTab';
import ResultsTab from '../components/ResultsTab';


const StudentDashboard = () => {
    const { logout, user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [stats, setStats] = useState({ overallPercentage: 100, subjectStats: {} });
    const [progressSummary, setProgressSummary] = useState({ rank: 1, totalStudentsInSection: 1, streak: 0, eligibility: 'Safe' });
    const [schedule, setSchedule] = useState([]);
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNoticeBoard, setShowNoticeBoard] = useState(false);
    const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'profile', 'fees', or 'results'

    // Notifications State
    const [showNotifications, setShowNotifications] = useState(false);
    const notifications = user?.attendance_notifications || [];
    const unreadCount = notifications.filter(n => !n.read).length;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [attRes, schedRes, noticesRes, progressRes] = await Promise.all([
                api.get('/student/attendance'),
                api.get('/student/schedule'),
                api.get('/student/notices'),
                api.get('/student/progress-summary')
            ]);
            setStats(attRes.data);
            setSchedule(schedRes.data);
            setNotices(noticesRes.data);
            setProgressSummary(progressRes.data);
            setLoading(false);
        } catch (error) { console.error("Error fetching student data", error); setLoading(false); }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading Portal...</div>;

    const att = stats.overallPercentage;
    const isAtRisk = att < 75;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans relative overflow-hidden">
            {/* Background Decorators */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-orange-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 pointer-events-none animate-blob"></div>
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-pink-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 pointer-events-none animate-blob animation-delay-2000"></div>

            <header className="glass-navbar p-5 flex justify-between items-center border-b-[3px] border-orange-500 z-10 sticky top-0">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-rose-500 rounded-lg shadow-md flex items-center justify-center">
                        <span className="text-white font-bold text-xl">🎓</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-orange-900 tracking-tight">Student Portal</h1>
                        <p className="text-xs text-slate-500 font-medium">Welcome back, {user?.name}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    {/* Notice Board Button */}
                    <button onClick={() => setShowNoticeBoard(!showNoticeBoard)} className="p-2 rounded-full hover:bg-orange-100 transition relative text-orange-800">
                        <span className="text-xl">📋</span>
                        {notices.length > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">{notices.length}</span>}
                    </button>

                    {/* Notification Bell */}
                    <div className="relative">
                        <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-full hover:bg-orange-100 transition relative text-orange-800">
                            <span className="text-xl">🔔</span>
                            {unreadCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse">{unreadCount}</span>}
                        </button>

                        {/* Dropdown */}
                        {showNotifications && (
                            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-orange-100 overflow-hidden z-50 animate-fade-in">
                                <div className="bg-orange-50 p-4 border-b border-orange-100 flex justify-between items-center">
                                    <h3 className="font-bold text-orange-900">Notifications</h3>
                                    <span className="text-xs font-semibold bg-orange-200 text-orange-800 px-2 py-1 rounded-full">{unreadCount} New</span>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center text-slate-500 text-sm">You are all caught up!</div>
                                    ) : (
                                        <ul className="divide-y divide-slate-50">
                                            {notifications.map((n, i) => (
                                                <li key={i} className={`p-4 hover:bg-slate-50 transition ${!n.read ? 'bg-orange-50/30' : ''}`}>
                                                    <p className="font-bold text-slate-800 text-sm mb-1">{n.title}</p>
                                                    <p className="text-xs text-slate-600 line-clamp-3">{n.message}</p>
                                                    <p className="text-[10px] text-slate-400 mt-2 font-medium">{new Date(n.date).toLocaleDateString()}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notice Board Modal */}
                    {showNoticeBoard && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden animate-fade-in">
                                <div className="bg-blue-50 p-6 border-b border-blue-100 flex justify-between items-center">
                                    <h3 className="font-bold text-blue-900 text-xl">📋 Notice Board</h3>
                                    <button onClick={() => setShowNoticeBoard(false)} className="text-blue-600 hover:text-blue-800 font-bold text-2xl">✕</button>
                                </div>
                                <div className="p-6 overflow-y-auto max-h-[60vh]">
                                    {notices.length === 0 ? (
                                        <div className="text-center py-12 text-slate-500">
                                            <span className="text-6xl block mb-4">📭</span>
                                            <p className="text-lg font-medium">No notices available</p>
                                            <p className="text-sm mt-2">Check back later for updates</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {notices.map((notice, index) => (
                                                <div key={index} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all bg-white">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h4 className="font-bold text-lg text-slate-800">{notice.title}</h4>
                                                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                                            notice.target_audience === 'Global' ? 'bg-purple-100 text-purple-700' :
                                                            notice.target_audience === 'Department' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-green-100 text-green-700'
                                                        }`}>
                                                            {notice.target_audience}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-600 mb-3 leading-relaxed">{notice.content}</p>
                                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                                        <span>By: {notice.author_id?.name || 'System'}</span>
                                                        <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <button onClick={() => setActiveView('dashboard')} className={`px-4 py-2 rounded-xl font-bold text-sm transition ${activeView === 'dashboard' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-600 hover:bg-orange-50'}`}>Dashboard</button>
                    <button onClick={() => setActiveView('fees')} className={`px-4 py-2 rounded-xl font-bold text-sm transition ${activeView === 'fees' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-600 hover:bg-orange-50'}`}>Fees</button>
                    <button onClick={() => setActiveView('results')} className={`px-4 py-2 rounded-xl font-bold text-sm transition ${activeView === 'results' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-600 hover:bg-orange-50'}`}>Results</button>
                    <button onClick={() => setActiveView('profile')} className={`px-4 py-2 rounded-xl font-bold text-sm transition ${activeView === 'profile' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-600 hover:bg-orange-50'}`}>My Profile</button>
                    <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-4 shadow-sm text-slate-700 hover:bg-slate-100">Sign Out</button>
                </div>
            </header>

            <main className="flex-1 p-6 flex flex-col items-center z-10 overflow-y-auto custom-scrollbar">
                {activeView === 'profile' ? (
                    <div className="w-full max-w-5xl animate-fade-in">
                        <ProfileTab />
                    </div>
                ) : activeView === 'fees' ? (
                    <div className="w-full max-w-5xl animate-fade-in">
                        <FeesTab />
                    </div>
                ) : activeView === 'results' ? (
                    <div className="w-full max-w-5xl animate-fade-in">
                        <ResultsTab />
                    </div>
                ) : (
                    <>
                {/* Global Risk Alert */}
                {isAtRisk && (
                    <div className="bg-red-50/90 border border-red-200 text-red-800 p-5 mb-8 w-full max-w-5xl rounded-2xl shadow-sm text-center animate-fade-in backdrop-blur-sm" role="alert">
                        <p className="font-bold flex items-center justify-center text-lg">
                            <svg className="w-6 h-6 mr-2 animate-bounce" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                            Academic Action Required
                        </p>
                        <p className="mt-2 text-red-600 font-medium tracking-wide">Your overall attendance is {att}%. You must maintain at least 75% to sit for exams.</p>
                    </div>
                )}

                {/* Achievements / Gamification Section */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full max-w-5xl mb-8 animate-fade-in">
                    {/* Rank Card */}
                    <div className="glass-card p-5 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg flex items-center justify-between overflow-hidden relative group">
                        <div className="absolute -right-2 -bottom-2 text-5xl opacity-10 group-hover:scale-110 transition-transform">🏆</div>
                        <div>
                            <p className="text-indigo-100 font-bold text-[10px] uppercase tracking-widest mb-1">Rank</p>
                            <h3 className="text-2xl font-black italic">#{progressSummary.rank}</h3>
                        </div>
                    </div>

                    {/* Streak Card */}
                    <div className="glass-card p-5 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg flex items-center justify-between overflow-hidden relative group">
                        <div className="absolute -right-2 -bottom-2 text-5xl opacity-10 group-hover:scale-110 transition-transform">🔥</div>
                        <div>
                            <p className="text-orange-100 font-bold text-[10px] uppercase tracking-widest mb-1">Streak</p>
                            <h3 className="text-2xl font-black italic">{progressSummary.streak}D</h3>
                        </div>
                    </div>

                    {/* Eligibility Card */}
                    <div className={`glass-card p-5 rounded-2xl ${progressSummary.eligibility === 'Safe' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-red-500 to-rose-600'} text-white shadow-lg flex items-center justify-between overflow-hidden relative group`}>
                        <div className="absolute -right-2 -bottom-2 text-5xl opacity-10 group-hover:scale-110 transition-transform">🎓</div>
                        <div>
                            <p className="text-white/80 font-bold text-[10px] uppercase tracking-widest mb-1">Exam</p>
                            <h3 className="text-2xl font-black uppercase tracking-tighter">{progressSummary.eligibility}</h3>
                        </div>
                    </div>

                    {/* Fees Card */}
                    <div 
                        onClick={() => setActiveView('fees')}
                        className="glass-card p-5 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg flex items-center justify-between overflow-hidden relative group cursor-pointer hover:scale-105 transition-transform"
                    >
                        <div className="absolute -right-2 -bottom-2 text-5xl opacity-10 group-hover:scale-110 transition-transform">💳</div>
                        <div>
                            <p className="text-slate-300 font-bold text-[10px] uppercase tracking-widest mb-1">Fees</p>
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic">Status</h3>
                        </div>
                    </div>

                    {/* Results Card */}
                    <div 
                        onClick={() => setActiveView('results')}
                        className="glass-card p-5 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 text-white shadow-lg flex items-center justify-between overflow-hidden relative group cursor-pointer hover:scale-105 transition-transform"
                    >
                        <div className="absolute -right-2 -bottom-2 text-5xl opacity-10 group-hover:scale-110 transition-transform">📈</div>
                        <div>
                            <p className="text-violet-200 font-bold text-[10px] uppercase tracking-widest mb-1">Results</p>
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic">GPA</h3>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-5xl animate-fade-in">

                    {/* Schedule Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass-card p-8 rounded-3xl bg-white/70">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Weekly Timetable</h2>
                                <span className="text-sm font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                                    {user?.section_id?.name || 'Section'}
                                </span>
                            </div>

                            <TimetableGrid 
                                userRole="Student"
                            />
                        </div>
                    </div>

                    {/* Analytics Column */}
                    <div className="space-y-6">
                        <div className="glass-card p-8 rounded-3xl bg-white/70 flex flex-col items-center relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-full h-2 ${isAtRisk ? 'bg-red-500' : 'bg-green-500'}`}></div>
                            <h2 className="text-xl font-bold mb-6 text-slate-700 w-full text-left">Your Attendance</h2>

                            <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                                {/* SVG Ring */}
                                <svg className="absolute w-full h-full transform -rotate-90">
                                    <circle cx="80" cy="80" r="72" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                                    <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="12" fill="transparent"
                                        className={`${isAtRisk ? 'text-red-500' : 'text-emerald-500'} transition-all duration-1000 ease-out`}
                                        strokeDasharray={`${(att / 100) * 452} 452`}
                                        strokeLinecap="round" />
                                </svg>
                                <div className="text-center">
                                    <span className={`text-4xl font-black ${isAtRisk ? 'text-red-600' : 'text-emerald-600'}`}>{att}%</span>
                                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">Total Met</span>
                                </div>
                            </div>

                            <div className="w-full text-left space-y-4">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">Subject Breakdown</h3>
                                {Object.keys(stats.subjectStats).length === 0 ? (
                                    <p className="text-xs text-slate-400">No attendance data yet.</p>
                                ) : (
                                    Object.keys(stats.subjectStats).map(subName => {
                                        const subP = stats.subjectStats[subName].percentage;
                                        return (
                                            <div key={subName} className="mb-2">
                                                <div className="flex justify-between text-xs font-semibold mb-1">
                                                    <span className="text-slate-700 truncate max-w-[120px]" title={subName}>{subName}</span>
                                                    <span className={subP < 75 ? 'text-red-500' : 'text-emerald-500'}>{subP}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                    <div className={`h-1.5 rounded-full ${subP < 75 ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${subP}%` }}></div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                </>
                )}
            </main>
        </div>
    );
};

export default StudentDashboard;
