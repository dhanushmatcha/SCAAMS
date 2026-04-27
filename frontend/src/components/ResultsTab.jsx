import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ResultsTab = () => {
    const [marks, setMarks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMarks();
    }, []);

    const fetchMarks = async () => {
        try {
            const res = await api.get('/student/marks');
            setMarks(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching marks", error);
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="p-20 text-center flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium">Analyzing examination performance...</p>
        </div>
    );

    // Group marks by semester
    const marksBySemester = marks.reduce((acc, mark) => {
        const sem = mark.section_id?.semester || 'Other';
        if (!acc[sem]) acc[sem] = [];
        acc[sem].push(mark);
        return acc;
    }, {});

    return (
        <div className="space-y-10 animate-fade-in">
            {marks.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-12 text-center shadow-xl border border-slate-100">
                    <div className="text-6xl mb-6 text-slate-200">📊</div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">No Results Declared</h3>
                    <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                        Your examination marks haven't been released yet. Please check back after the evaluation process is complete.
                    </p>
                </div>
            ) : (
                Object.keys(marksBySemester).sort((a, b) => b - a).map(sem => (
                    <div key={sem} className="space-y-6">
                        <div className="flex items-center gap-4">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Semester {sem} Results</h3>
                            <div className="flex-1 h-px bg-slate-200"></div>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{marksBySemester[sem].length} Subjects</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {marksBySemester[sem].map(mark => {
                                const totalObtained = mark.marks_obtained;
                                const totalMax = mark.total_marks || 100;
                                const percentage = Math.round((totalObtained / totalMax) * 100);
                                const grade = percentage >= 90 ? 'O' : percentage >= 80 ? 'A+' : percentage >= 70 ? 'A' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : 'F';

                                return (
                                    <div key={mark._id} className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden">
                                        <div className={`absolute top-0 left-0 w-2 h-full ${percentage >= 40 ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>
                                        
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                                                    {mark.subject_id?.name}
                                                </h4>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{mark.subject_id?.code}</span>
                                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{mark.exam_type}</span>
                                                </div>
                                            </div>
                                            <span className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 ${
                                                grade === 'O' ? 'border-emerald-500 text-emerald-600 bg-emerald-50' :
                                                grade === 'F' ? 'border-rose-500 text-rose-600 bg-rose-50' : 'border-indigo-500 text-indigo-600 bg-indigo-50'
                                            }`}>
                                                {grade}
                                            </span>
                                        </div>

                                        <div className="mt-6 flex items-end justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Marks Obtained</p>
                                                <p className="text-3xl font-black text-slate-800">
                                                    {totalObtained}<span className="text-sm text-slate-300 font-medium">/{totalMax}</span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Percentage</p>
                                                <p className="text-xl font-black text-indigo-600">{percentage}%</p>
                                            </div>
                                        </div>

                                        {/* Breakdown Tags */}
                                        {mark.breakdown_marks && (
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {Object.entries(mark.breakdown_marks).map(([key, val]) => (
                                                    <span key={key} className="px-2 py-0.5 bg-slate-50 text-[9px] font-bold text-slate-500 rounded-md border border-slate-100">
                                                        {key}: {val}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Progress Bar */}
                                        <div className="mt-6 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ${percentage >= 75 ? 'bg-emerald-500' : percentage >= 40 ? 'bg-indigo-500' : 'bg-rose-500'}`} 
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>

                                        <div className="mt-4 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            <span>Evaluated by {mark.faculty_id?.name || 'Academic Dept'}</span>
                                            <span>{new Date(mark.recorded_at || mark.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}

            <div className="bg-indigo-50 rounded-[2.5rem] p-8 border border-indigo-100 flex items-start gap-6">
                <div className="text-4xl">💡</div>
                <div>
                    <h4 className="text-lg font-black text-indigo-900 mb-1">Performance Insight</h4>
                    <p className="text-indigo-800/70 text-sm font-medium leading-relaxed">
                        Grades are calculated based on the internal relative grading system. If you find any discrepancies in your marks, please raise a ticket within 48 hours of result declaration.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResultsTab;
