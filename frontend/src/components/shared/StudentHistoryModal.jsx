import React, { useState, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const StudentHistoryModal = ({ regdNo, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useContext(AuthContext);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                // Determine if we should use admin or faculty endpoint based on current user role
                const role = user?.role || localStorage.getItem('role');
                const endpoint = role === 'Admin' ? `/admin/student/history/${regdNo}` : `/faculty/student/history/${regdNo}`;
                
                const res = await api.get(endpoint);
                setData(res.data);
                setLoading(false);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch student history');
                setLoading(false);
            }
        };
        fetchData();
    }, [regdNo, user]);

    if (loading) return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl shadow-2xl animate-pulse">
                <p className="text-slate-600 font-bold">Searching records for {regdNo}...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full">
                <h3 className="text-xl font-bold text-red-600 mb-4">Error</h3>
                <p className="text-slate-600 mb-6">{error}</p>
                <button onClick={onClose} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold">Close</button>
            </div>
        </div>
    );

    const { profile, marksHistory, attendanceHistory } = data;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-slate-50 w-full max-w-5xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white">
                {/* Header */}
                <div className="p-8 bg-white border-b flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-lg">
                            {profile.name?.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">{profile.name}</h2>
                            <p className="text-indigo-600 font-bold tracking-widest uppercase text-xs">{profile.regd_no} • {profile.department?.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
                    {/* Professional Profile */}
                    <section>
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Institutional Profile</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Email Address</p>
                                <p className="font-bold text-slate-700">{profile.email}</p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Current Section</p>
                                <p className="font-bold text-slate-700">{profile.section_id?.name || 'Unassigned'}</p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Semester</p>
                                <p className="font-bold text-slate-700">Semester {profile.section_id?.semester || 'N/A'}</p>
                            </div>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Marks History */}
                        <section>
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Academic Performance</h3>
                            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase">
                                            <tr>
                                                <th className="px-6 py-4">Subject</th>
                                                <th className="px-6 py-4">Exam</th>
                                                <th className="px-6 py-4 text-center">Score</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {marksHistory.length === 0 ? (
                                                <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-400 italic">No marks recorded yet.</td></tr>
                                            ) : marksHistory.map((m, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 transition">
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-slate-700">{m.subject_id?.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold">{m.subject_id?.code}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-[10px]">{m.exam_type}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl font-black text-xs">
                                                            {m.marks_obtained}/{m.total_marks}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        {/* Attendance History */}
                        <section>
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Attendance Logs</h3>
                            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase">
                                            <tr>
                                                <th className="px-6 py-4">Date</th>
                                                <th className="px-6 py-4">Subject</th>
                                                <th className="px-6 py-4 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {attendanceHistory.length === 0 ? (
                                                <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-400 italic">No attendance records found.</td></tr>
                                            ) : attendanceHistory.map((a, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 transition">
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-slate-700">{new Date(a.date).toLocaleDateString()}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold">Period {a.period}</p>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-600 text-xs">{a.subject?.name}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-wider ${
                                                            a.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 
                                                            a.status === 'Absent' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {a.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
                
                <div className="p-6 bg-white border-t flex justify-end">
                    <button onClick={onClose} className="px-8 py-3 bg-slate-800 text-white rounded-2xl font-black shadow-lg hover:bg-slate-900 transition">Close Report</button>
                </div>
            </div>
        </div>
    );
};

export default StudentHistoryModal;
