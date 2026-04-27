import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AdminExamMarksTab = () => {
    const [marks, setMarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterExamType, setFilterExamType] = useState('All');

    useEffect(() => {
        fetchMarks();
    }, []);

    const fetchMarks = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/exam-marks');
            setMarks(res.data);
        } catch (error) {
            console.error('Error fetching exam marks', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredMarks = marks.filter(m => {
        const matchesSearch = 
            m.student_id?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.student_id?.regd_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.subject_id?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.faculty_id?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesType = filterExamType === 'All' || m.exam_type === filterExamType;
        
        return matchesSearch && matchesType;
    });

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header & Controls */}
            <div className="glass-card p-8 rounded-3xl bg-white/70 border border-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-50">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-emerald-200">📊</div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Academic Performance Audit</h3>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Global view of all student marks & internal assessments</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap w-full md:w-auto gap-3">
                    <input 
                        type="text" 
                        placeholder="Search Regd No, Student, Subject..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 md:w-80 px-6 py-4 rounded-2xl border-2 border-slate-100 outline-none font-bold text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 transition-all bg-white shadow-sm"
                    />
                    <select 
                        value={filterExamType}
                        onChange={(e) => setFilterExamType(e.target.value)}
                        className="px-6 py-4 rounded-2xl border-2 border-slate-100 outline-none font-bold text-slate-800 bg-white shadow-sm focus:border-emerald-500 transition-all cursor-pointer"
                    >
                        <option value="All">All Exams</option>
                        <option value="T1">T1</option>
                        <option value="T4">T4</option>
                        <option value="External Lab">External Lab</option>
                    </select>
                </div>
            </div>

            {/* Marks Table */}
            <div className="glass-card rounded-[32px] overflow-hidden bg-white/60 border border-white shadow-xl shadow-slate-100/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                                <th className="p-6 border-b border-slate-800">Student Info</th>
                                <th className="p-6 border-b border-slate-800">Exam Details</th>
                                <th className="p-6 border-b border-slate-800">Subject</th>
                                <th className="p-6 border-b border-slate-800">Faculty</th>
                                <th className="p-6 border-b border-slate-800 text-center">Score</th>
                                <th className="p-6 border-b border-slate-800 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-20 text-center">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto"></div>
                                    </td>
                                </tr>
                            ) : filteredMarks.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-20 text-center text-slate-400 font-bold italic">No records found matching your criteria.</td>
                                </tr>
                            ) : (
                                filteredMarks.map((m, idx) => (
                                    <tr key={m._id} className="hover:bg-white/80 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-800">{m.student_id?.name}</span>
                                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{m.student_id?.regd_no}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700">{m.exam_type}</span>
                                                <span className="text-[10px] font-medium text-slate-400">Section {m.section_id?.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700">{m.subject_id?.name}</span>
                                                <span className="text-[10px] font-medium text-slate-400">{m.subject_id?.code}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-sm font-bold text-slate-600">{m.faculty_id?.name}</td>
                                        <td className="p-6 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <span className="text-xl font-black text-slate-800">{m.marks_obtained}</span>
                                                <span className="text-[10px] font-black text-slate-300">/ {m.total_marks}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase ${m.is_locked ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                {m.is_locked ? '🔒 Locked' : '📝 Draft'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminExamMarksTab;
