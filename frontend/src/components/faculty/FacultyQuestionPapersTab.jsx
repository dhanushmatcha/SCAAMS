import React, { useState, useEffect } from 'react';

const FacultyQuestionPapersTab = ({
    newPaperForm,
    setNewPaperForm,
    assignmentContext = [],
    getContextLabel,
    uploadQuestionPaper,
    questionPapers
}) => {
    const [viewData, setViewData] = useState(null);
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');

    // Extract unique sections
    const sectionIdSet = new Set();
    assignmentContext.forEach(c => {
        if (c.section_id && c.section_id._id) {
            sectionIdSet.add(c.section_id._id);
        }
    });

    const uniqueSections = Array.from(sectionIdSet).map(id => {
        const found = assignmentContext.find(c => c.section_id && c.section_id._id === id);
        return found ? found.section_id : null;
    }).filter(s => s !== null);

    // Filter subjects
    const filteredSubjects = assignmentContext
        .filter(c => c.section_id && c.section_id._id === selectedSectionId)
        .map(c => c.subject_id)
        .filter(s => s !== null);

    useEffect(() => {
        setSelectedSubjectId('');
    }, [selectedSectionId]);

    useEffect(() => {
        if (selectedSectionId && selectedSubjectId) {
            const context = assignmentContext.find(c => 
                c.section_id && c.section_id._id === selectedSectionId && 
                c.subject_id && c.subject_id._id === selectedSubjectId
            );
            if (context) {
                setNewPaperForm(prev => ({ ...prev, contextId: context._id }));
            }
        } else {
            setNewPaperForm(prev => ({ ...prev, contextId: '' }));
        }
    }, [selectedSectionId, selectedSubjectId, assignmentContext, setNewPaperForm]);

    const isLocked = questionPapers.some(p => 
        p.exam_type === newPaperForm.exam_type && 
        p.locked && 
        p.section_id?._id === selectedSectionId &&
        p.subject_id?._id === selectedSubjectId
    );

    return (
        <div className="glass-card p-8 rounded-3xl bg-white/80 animate-fade-in shadow-xl border border-white/40">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Question Paper Management</h2>
                {isLocked && <div className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-xl flex items-center gap-2 text-xs border border-red-200">🔒 Paper Locked</div>}
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Upload Form Section */}
                <div className="space-y-6 bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-inner">
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest text-slate-400">Step-by-Step Configuration</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">1. Select Section</label>
                            <select 
                                value={selectedSectionId} 
                                onChange={(e) => setSelectedSectionId(e.target.value)} 
                                className="w-full p-3.5 border-2 border-white rounded-2xl outline-none bg-white shadow-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                            >
                                <option value="">Choose Section...</option>
                                {uniqueSections.map(section => (
                                    <option key={section._id} value={section._id}>{section.name} (Sem {section.semester})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">2. Select Subject</label>
                            <select 
                                value={selectedSubjectId} 
                                onChange={(e) => setSelectedSubjectId(e.target.value)} 
                                disabled={!selectedSectionId}
                                className="w-full p-3.5 border-2 border-white rounded-2xl outline-none bg-white shadow-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                            >
                                <option value="">Choose Subject...</option>
                                {filteredSubjects.map(subject => (
                                    <option key={subject._id} value={subject._id}>{subject.name} ({subject.code})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">3. Exam Category</label>
                            <select 
                                value={newPaperForm.exam_type} 
                                onChange={(e) => setNewPaperForm(prev => ({ ...prev, exam_type: e.target.value, questions_data: {} }))} 
                                className="w-full p-3.5 border-2 border-indigo-100 rounded-2xl outline-none bg-indigo-50 font-black text-indigo-800 focus:ring-2 focus:ring-indigo-500 transition-all"
                            >
                                <option value="T1">T1 (Subjective - 30M)</option>
                                <option value="T4">T4 (MCQ + Subj - 20M)</option>
                            </select>
                        </div>
                    </div>

                    {!newPaperForm.contextId ? (
                        <div className="mt-8 p-8 rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 text-slate-400 text-center italic text-sm">
                            Complete the 3 selection steps above to unlock question entry fields.
                        </div>
                    ) : (
                        <div className="space-y-6 mt-6 animate-scale-up">
                            {/* Question Input Fields */}
                            {newPaperForm.exam_type === 'T1' && (
                                <div className="space-y-3 p-4 bg-white rounded-2xl border border-indigo-100 shadow-sm">
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase mb-2">Subjective Questions (10M each)</p>
                                    {[1,2,3].map(q => (
                                        <textarea key={q} placeholder={`Question ${q}...`} 
                                            className="w-full p-3 border border-slate-200 rounded-xl outline-none h-20 text-sm focus:border-indigo-400 bg-slate-50 focus:bg-white transition"
                                            value={newPaperForm.questions_data?.[`q${q}`] || ''}
                                            disabled={isLocked}
                                            onChange={(e) => setNewPaperForm(prev => ({...prev, questions_data: {...prev.questions_data, [`q${q}`]: e.target.value}}))}
                                        />
                                    ))}
                                </div>
                            )}

                            {newPaperForm.exam_type === 'T4' && (
                                <div className="space-y-3 p-4 bg-white rounded-2xl border border-indigo-100 shadow-sm max-h-96 overflow-y-auto custom-scrollbar">
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase mb-4">MCQ (0.5M) + Subjective (5M)</p>
                                    
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase mb-2">Part A: MCQs</h4>
                                    {[1,2,3,4,5,6,7,8,9,10].map(q => (
                                        <input key={`mcq${q}`} type="text" placeholder={`${q}. Multiple Choice Question`} 
                                            className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:border-indigo-400 bg-slate-50 focus:bg-white transition mb-2"
                                            value={newPaperForm.questions_data?.[`mcq${q}`] || ''}
                                            disabled={isLocked}
                                            onChange={(e) => setNewPaperForm(prev => ({...prev, questions_data: {...prev.questions_data, [`mcq${q}`]: e.target.value}}))}
                                        />
                                    ))}
                                    
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase mt-4 mb-2">Part B: Subjective</h4>
                                    {[1,2,3].map(q => (
                                        <textarea key={`sub${q}`} placeholder={`Short Question ${q}...`} 
                                            className="w-full p-3 border border-slate-200 rounded-xl outline-none h-20 text-sm focus:border-indigo-400 bg-slate-50 focus:bg-white transition"
                                            value={newPaperForm.questions_data?.[`sub${q}`] || ''}
                                            disabled={isLocked}
                                            onChange={(e) => setNewPaperForm(prev => ({...prev, questions_data: {...prev.questions_data, [`sub${q}`]: e.target.value}}))}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* PDF Upload Area */}
                            <div className="flex gap-2 w-full p-6 border-2 border-dashed border-indigo-200 rounded-3xl bg-white hover:bg-indigo-50/30 transition items-center justify-center relative cursor-pointer group shadow-sm">
                                <input 
                                    type="file" 
                                    accept="application/pdf"
                                    disabled={isLocked}
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setNewPaperForm(prev => ({ ...prev, filename: file.name, file_url: reader.result }));
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }} 
                                    className={`absolute inset-0 w-full h-full opacity-0 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`} 
                                />
                                <div className="flex flex-col items-center justify-center pointer-events-none text-center">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition">
                                        <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">
                                        {newPaperForm.filename ? newPaperForm.filename : 'Upload PDF Document'}
                                    </span>
                                    <p className="text-[10px] text-slate-400 mt-1">Combine questions into a single PDF if needed</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => uploadQuestionPaper(false)} disabled={isLocked} className="flex-1 bg-slate-800 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-slate-900 transition disabled:bg-slate-300">
                                    {isLocked ? 'Paper Locked' : '💾 Save Draft'}
                                </button>
                                <button onClick={() => uploadQuestionPaper(true)} disabled={isLocked} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition disabled:bg-slate-300">
                                    {isLocked ? 'Locked' : '🔒 Finalize Paper'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* History Section */}
                <div className="space-y-6">
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest text-slate-400">Vault: Uploaded Papers</h3>
                    {questionPapers.length === 0 ? (
                        <div className="p-12 rounded-3xl border-2 border-dashed border-slate-100 bg-white/40 text-slate-400 text-center italic text-sm">
                            Your vault is empty. Uploaded papers will appear here.
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                            {questionPapers.map(paper => (
                                <div key={paper._id} className="p-5 rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-black text-slate-800">{paper.filename}</h4>
                                            <p className="text-xs text-slate-500 font-bold">{paper.subject_id?.name} • {paper.section_id?.name}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-lg ${paper.locked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {paper.locked ? 'LOCKED' : 'DRAFT'}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">{paper.exam_type}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 border-t pt-4 border-slate-50">
                                        {paper.file_url && <a href={paper.file_url} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg> PREVIEW PDF</a>}
                                        {paper.questions_data && Object.keys(paper.questions_data).length > 0 && (
                                            <button onClick={() => setViewData(paper)} className="text-xs font-black text-emerald-600 hover:text-emerald-800 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> DIGITAL VIEW</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Modal */}
            {viewData && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden border border-white">
                        <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-slate-800 text-xl">Digital Paper Preview</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{viewData.subject_id?.name} - {viewData.exam_type}</p>
                            </div>
                            <button onClick={() => setViewData(null)} className="w-12 h-12 rounded-2xl bg-white shadow-sm hover:bg-slate-50 flex items-center justify-center transition border border-slate-100">
                                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto space-y-4 custom-scrollbar bg-white">
                            {Object.entries(viewData.questions_data || {}).map(([key, info], i) => (
                                info ? (
                                    <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-indigo-100 transition">
                                        <div className="text-[10px] font-black text-slate-300 mb-2 uppercase tracking-widest group-hover:text-indigo-300 transition">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                                        <div className="text-slate-700 font-bold text-sm leading-relaxed whitespace-pre-wrap">{info}</div>
                                    </div>
                                ) : null
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyQuestionPapersTab;
