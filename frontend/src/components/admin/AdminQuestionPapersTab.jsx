import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AdminQuestionPapersTab = () => {
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewData, setViewData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterExamType, setFilterExamType] = useState('All');

    useEffect(() => {
        fetchPapers();
    }, []);

    const fetchPapers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/question-papers');
            setPapers(res.data);
        } catch (error) {
            console.error('Error fetching question papers', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPapers = papers.filter(paper => {
        const matchesSearch = 
            paper.subject_id?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            paper.faculty_id?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            paper.section_id?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesType = filterExamType === 'All' || paper.exam_type === filterExamType;
        
        return matchesSearch && matchesType;
    });

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header & Controls */}
            <div className="glass-card p-8 rounded-3xl bg-white/70 border border-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-50">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-indigo-200">📄</div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Examination Question Vault</h3>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Review faculty uploads for upcoming exams</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap w-full md:w-auto gap-3">
                    <div className="relative flex-1 md:w-64">
                        <input 
                            type="text" 
                            placeholder="Search Subject, Faculty..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 outline-none font-bold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 transition-all bg-white shadow-sm"
                        />
                    </div>
                    <select 
                        value={filterExamType}
                        onChange={(e) => setFilterExamType(e.target.value)}
                        className="px-6 py-4 rounded-2xl border-2 border-slate-100 outline-none font-bold text-slate-800 bg-white shadow-sm focus:border-indigo-500 transition-all cursor-pointer"
                    >
                        <option value="All">All Types</option>
                        <option value="T1">T1 (Subjective)</option>
                        <option value="T4">T4 (Hybrid)</option>
                    </select>
                    <button 
                        onClick={fetchPapers}
                        className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black hover:bg-indigo-100 transition shadow-sm"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Papers List (Compact Row-wise) */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : filteredPapers.length === 0 ? (
                <div className="glass-card p-20 rounded-[40px] text-center bg-white/50 border border-dashed border-slate-200">
                    <span className="text-6xl mb-4 block opacity-20">📂</span>
                    <h4 className="text-xl font-black text-slate-400">No question papers found</h4>
                    <p className="text-slate-400 font-medium">Faculty haven't uploaded any papers matching your filters yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Header Row */}
                    <div className="px-8 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl flex items-center shadow-lg">
                        <div className="flex-[2]">Subject & Exam</div>
                        <div className="flex-1">Faculty</div>
                        <div className="flex-1">Section</div>
                        <div className="flex-1">Date</div>
                        <div className="w-64 text-center">Actions</div>
                    </div>

                    {filteredPapers.map(paper => (
                        <div key={paper._id} className="glass-card px-8 py-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex items-center group">
                            {/* Subject & Exam */}
                            <div className="flex-[2] flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{paper.subject_id?.name}</span>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${paper.locked ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                        {paper.locked ? 'LOCKED' : 'DRAFT'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">{paper.subject_id?.code}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{paper.exam_type}</span>
                                </div>
                            </div>

                            {/* Faculty */}
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-700">{paper.faculty_id?.name || 'Faculty'}</p>
                                <p className="text-[10px] font-medium text-slate-400 truncate max-w-[150px]">{paper.faculty_id?.email}</p>
                            </div>

                            {/* Section */}
                            <div className="flex-1">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-700">Section {paper.section_id?.name}</span>
                                    <span className="text-[10px] font-medium text-slate-400">Semester {paper.section_id?.semester}</span>
                                </div>
                            </div>

                            {/* Date */}
                            <div className="flex-1">
                                <span className="text-sm font-bold text-slate-500">{new Date(paper.uploaded_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                            </div>

                            {/* Actions */}
                            <div className="w-64 flex gap-2">
                                {paper.file_url ? (
                                    <a 
                                        href={paper.file_url} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-white font-black text-[10px] hover:bg-black transition shadow-sm"
                                    >
                                        📄 PDF
                                    </a>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 text-slate-300 font-black text-[10px] border border-slate-100">
                                        NO PDF
                                    </div>
                                )}
                                
                                {paper.questions_data && Object.keys(paper.questions_data).length > 0 ? (
                                    <button 
                                        onClick={() => setViewData(paper)} 
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-[10px] hover:bg-indigo-700 transition shadow-sm"
                                    >
                                        🖥️ VIEW
                                    </button>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 text-slate-300 font-black text-[10px] border border-slate-100">
                                        NO DATA
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Digital View Modal */}
            {viewData && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden border border-white">
                        <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-200">👁️</div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-xl tracking-tight">Question Paper Inspect</h3>
                                    <p className="text-xs text-indigo-500 font-black uppercase tracking-widest">{viewData.subject_id?.name} — {viewData.exam_type} EXAM</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setViewData(null)} 
                                className="w-12 h-12 rounded-2xl bg-white shadow-md hover:bg-slate-50 flex items-center justify-center transition border border-slate-100 font-black text-slate-400"
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto space-y-4 custom-scrollbar bg-white">
                            {/* Paper Metadata Badge */}
                            <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 mb-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Assigned Faculty</p>
                                        <p className="font-bold text-slate-800">{viewData.faculty_id?.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Target Section</p>
                                        <p className="font-bold text-slate-800">Section {viewData.section_id?.name}</p>
                                    </div>
                                </div>
                            </div>

                            {Object.entries(viewData.questions_data || {}).map(([key, info], i) => (
                                info ? (
                                    <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-indigo-200 hover:bg-white transition-all duration-300">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="text-[10px] font-black text-indigo-400 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-widest group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                                {key.replace(/([A-Z])/g, ' $1').trim()}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-300 tracking-tighter">QUESTION {i+1}</span>
                                        </div>
                                        <div className="text-slate-700 font-bold text-sm leading-relaxed whitespace-pre-wrap">{info}</div>
                                    </div>
                                ) : null
                            ))}
                        </div>
                        
                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button 
                                onClick={() => setViewData(null)}
                                className="px-8 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-xs hover:bg-slate-50 transition shadow-sm"
                            >
                                CLOSE INSPECTOR
                            </button>
                            {viewData.file_url && (
                                <a 
                                    href={viewData.file_url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="px-8 py-3 rounded-2xl bg-indigo-600 text-white font-black text-xs hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
                                >
                                    DOWNLOAD PDF
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminQuestionPapersTab;
