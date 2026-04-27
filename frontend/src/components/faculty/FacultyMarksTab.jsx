import React, { useState, useEffect } from 'react';

const FacultyMarksTab = ({
    marksContextId,
    handleMarksContextChange,
    assignmentContext = [],
    getContextLabel,
    marksExamType,
    setMarksExamType,
    submitMarks,
    sectionStudents = [],
    studentMarks = {},
    setStudentMarks,
    examMarks = [],
    lockMarks
}) => {
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');

    const getExpectedTotal = (type) => {
        if (type === 'T1') return 30;
        if (type === 'T2') return 5;
        if (type === 'T3') return 5;
        if (type === 'T4') return 20;
        if (type === 'T5') return 20;
        if (type === 'External Lab') return 40;
        return 0;
    };

    const maxMarks = getExpectedTotal(marksExamType);

    // Filter logic
    const isLocked = examMarks.some(em => {
        const matchingContext = assignmentContext.find(c => c._id === marksContextId);
        return em.exam_type === marksExamType && 
               em.locked === true && 
               em.section_id?._id === matchingContext?.section_id?._id;
    });

    const getColumnDefs = () => {
        if (marksExamType === 'T1') {
            return [
                { id: 'q1', label: 'Q1 (10M)', max: 10 },
                { id: 'q2', label: 'Q2 (10M)', max: 10 },
                { id: 'q3', label: 'Q3 (10M)', max: 10 }
            ];
        } else if (marksExamType === 'T4') {
            return [
                { id: 'mcq', label: 'MCQs (5M)', max: 5 },
                { id: 'sub1', label: 'S-Q1 (5M)', max: 5 },
                { id: 'sub2', label: 'S-Q2 (5M)', max: 5 },
                { id: 'sub3', label: 'S-Q3 (5M)', max: 5 }
            ];
        } else {
            return [
                { id: 'total', label: `Marks (${maxMarks}M)`, max: maxMarks }
            ];
        }
    };

    const columns = getColumnDefs();

    const handleMarksChange = (studentId, colId, value, colMax) => {
        if (isLocked) return;
        const num = parseFloat(value);
        if (num > colMax) {
            alert("Error: Maximum marks allowed for this sector is " + colMax + ".");
            return;
        }

        setStudentMarks(prev => {
            const currentStudentMarks = prev[studentId] || {};
            const currentBreakdown = currentStudentMarks.breakdown || {};
            return {
                ...prev,
                [studentId]: {
                    ...currentStudentMarks,
                    breakdown: {
                        ...currentBreakdown,
                        [colId]: value
                    }
                }
            };
        });
    };

    const computeRowTotal = (studentId) => {
        const studentData = studentMarks[studentId] || {};
        const bd = studentData.breakdown || {};
        return columns.reduce((acc, col) => acc + (parseFloat(bd[col.id]) || 0), 0);
    };

    const exportToCSV = () => {
        const headers = ['S.NO', 'REGISTER NO', ...columns.map(c => c.label), 'TOTAL'];
        const rows = sectionStudents.map((student, index) => {
            const studentData = studentMarks[student._id] || {};
            const bd = studentData.breakdown || {};
            const colData = columns.map(c => bd[c.id] || 0);
            return [index + 1, student.regd_no || 'N/A', ...colData, computeRowTotal(student._id)];
        });
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "Marks_Export_" + marksExamType + ".csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                handleMarksContextChange(context._id);
            }
        }
    }, [selectedSectionId, selectedSubjectId, assignmentContext, handleMarksContextChange]);

    return (
        <div className="glass-card p-8 rounded-3xl bg-white/80 shadow-xl border border-white/40">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Academic Marks Entry</h2>
                {isLocked && <div className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-xl flex items-center gap-2 text-xs border border-red-200">🔒 Locked by Admin</div>}
            </div>

            <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-200 mb-8 shadow-inner">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Step 1: Select Section</label>
                        <select 
                            value={selectedSectionId} 
                            onChange={(e) => setSelectedSectionId(e.target.value)} 
                            className="w-full p-3.5 border-2 border-white rounded-2xl outline-none bg-white shadow-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 transition-all"
                        >
                            <option value="">Choose Section...</option>
                            {uniqueSections.map(section => (
                                <option key={section._id} value={section._id}>{section.name} (Sem {section.semester})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Step 2: Select Subject</label>
                        <select 
                            value={selectedSubjectId} 
                            onChange={(e) => setSelectedSubjectId(e.target.value)} 
                            disabled={!selectedSectionId}
                            className="w-full p-3.5 border-2 border-white rounded-2xl outline-none bg-white shadow-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                        >
                            <option value="">Choose Subject...</option>
                            {filteredSubjects.map(subject => (
                                <option key={subject._id} value={subject._id}>{subject.name} ({subject.code})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Step 3: Exam Type</label>
                        <div className="flex items-center gap-2">
                            <select 
                                value={marksExamType} 
                                onChange={(e) => setMarksExamType(e.target.value)} 
                                className="flex-1 p-3.5 border-2 border-emerald-100 rounded-2xl outline-none bg-emerald-50 font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500 transition-all"
                            >
                                <option value="T1">T1 (Mid Exam)</option>
                                <option value="T2">T2 (Viva I)</option>
                                <option value="T3">T3 (Viva II)</option>
                                <option value="T4">T4 (MCQ+Subj)</option>
                                <option value="T5">T5 (Assignment)</option>
                                <option value="External Lab">External Lab</option>
                            </select>
                            <div className="bg-slate-800 text-white font-black px-4 py-3.5 rounded-2xl shadow-lg text-sm min-w-[50px] text-center">
                                /{maxMarks}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-slate-800 border-b pb-2 text-sm uppercase tracking-widest text-slate-400">Student Matrix Grid</h3>
                {(!selectedSectionId || !selectedSubjectId || !marksExamType) ? (
                    <div className="p-12 rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 text-slate-400 text-center italic">
                        Please complete Steps 1, 2, and 3 above to load the grading matrix.
                    </div>
                ) : sectionStudents.length === 0 ? (
                    <div className="p-12 rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 text-slate-400 text-center italic">
                        Loading students or no students found in this section...
                    </div>
                ) : (
                    <div>
                        <div className="overflow-x-auto max-h-[600px] border-2 border-indigo-100 rounded-2xl shadow-sm bg-white">
                            <table className="w-full text-left text-sm text-slate-700 whitespace-nowrap">
                                <thead className="bg-indigo-50 text-indigo-900 border-b-2 border-indigo-100 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 font-bold text-center w-12 text-xs">S.NO</th>
                                        <th className="px-4 py-3 font-bold text-xs">REGISTER NO</th>
                                        {columns.map(col => (
                                            <th key={col.id} className="px-4 py-3 font-bold text-center text-xs">{col.label}</th>
                                        ))}
                                        <th className="px-4 py-3 font-extrabold text-center bg-emerald-50 text-emerald-900 border-l border-emerald-200 text-xs">TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sectionStudents.map((student, index) => {
                                        const rowTotal = computeRowTotal(student._id);
                                        const marksEntry = studentMarks[student._id] || {};
                                        const breakdown = marksEntry.breakdown || {};
                                        
                                        return (
                                            <tr key={student._id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                                <td className="px-4 py-2.5 text-center font-semibold text-slate-400 text-xs">{index + 1}</td>
                                                <td className="px-4 py-2.5 font-black text-indigo-700 text-xs tracking-wider">{student.regd_no || 'N/A'}</td>
                                                {columns.map(col => (
                                                    <td key={col.id} className="px-4 py-2.5 text-center">
                                                        <input 
                                                            type="number" 
                                                            value={breakdown[col.id] || ''} 
                                                            onChange={(e) => handleMarksChange(student._id, col.id, e.target.value, col.max)} 
                                                            placeholder="0" 
                                                            disabled={isLocked}
                                                            className="w-14 p-1.5 border rounded-xl outline-none font-black text-center text-xs transition-all bg-white border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-slate-900 shadow-sm disabled:bg-slate-100 disabled:text-slate-400" 
                                                        />
                                                    </td>
                                                ))}
                                                <td className="px-4 py-2.5 text-center border-l border-emerald-50 bg-emerald-50/30">
                                                    <div className="mx-auto w-12 p-1 bg-emerald-100 border border-emerald-200 rounded-lg font-black text-emerald-800 text-xs shadow-inner">
                                                        {rowTotal}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-8 flex flex-col sm:flex-row gap-4">
                            <button onClick={() => submitMarks(false)} disabled={isLocked} className="flex-1 py-4 rounded-2xl font-black shadow-lg transition-all bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-300 disabled:text-slate-500">
                                {isLocked ? 'Record Locked' : '💾 Save & Update Marks'}
                            </button>
                            <button onClick={lockMarks} disabled={isLocked} className="flex-1 py-4 rounded-2xl font-black shadow-lg transition-all bg-red-600 hover:bg-red-700 text-white disabled:bg-slate-300 disabled:text-slate-500">
                                {isLocked ? 'Locked' : '🔒 Finalize & Lock Marks'}
                            </button>
                            <button onClick={exportToCSV} className="px-8 py-4 rounded-2xl font-black shadow-lg transition-all bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center gap-2">
                                📊 Export CSV
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FacultyMarksTab;
