import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AdminShuffleStudentsTab = ({ departments, fetchData, setDepartments }) => {
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [isShuffling, setIsShuffling] = useState(false);
    const [shuffleResult, setShuffleResult] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        if (departments.length === 0) {
            fetchData('department', setDepartments);
        }
    }, []);

    const handleShuffle = async () => {
        if (!selectedDept || !selectedSemester) {
            alert('Please select both Department and Semester');
            return;
        }

        setIsShuffling(true);
        setShuffleResult(null);
        try {
            const response = await api.post('/admin/shuffle-students', {
                department_id: selectedDept,
                semester: parseInt(selectedSemester)
            });
            setShuffleResult(response.data);
            setShowConfirmModal(false);
        } catch (error) {
            alert('Error shuffling students: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsShuffling(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="glass-card p-8 rounded-3xl bg-white/70">
                <div className="max-w-2xl mx-auto text-center mb-10">
                    <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-sm">
                        🔀
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Shuffle Students</h2>
                    <p className="text-slate-600 text-lg leading-relaxed">
                        Randomly redistribute students across sections within a department. This is ideal for starting a new semester or refreshing student dynamics.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto p-8 rounded-3xl bg-slate-50/50 border border-slate-100 shadow-inner">
                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-slate-700 ml-1 uppercase tracking-wider">Select Department</label>
                        <select 
                            value={selectedDept} 
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                        >
                            <option value="">-- Choose Department --</option>
                            {departments.map(d => (
                                <option key={d._id} value={d._id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-slate-700 ml-1 uppercase tracking-wider">Select Semester</label>
                        <select 
                            value={selectedSemester} 
                            onChange={(e) => setSelectedSemester(e.target.value)}
                            className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                        >
                            <option value="">-- Choose Semester --</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                <option key={sem} value={sem}>Semester {sem}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-2 pt-6">
                        <button 
                            onClick={() => setShowConfirmModal(true)}
                            disabled={!selectedDept || !selectedSemester || isShuffling}
                            className={`w-full py-5 rounded-2xl font-black text-xl shadow-xl transition-all duration-300 transform active:scale-[0.98] ${
                                !selectedDept || !selectedSemester || isShuffling 
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed grayscale' 
                                : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 bg-[length:200%_auto] hover:bg-right text-white shadow-blue-200'
                            }`}
                        >
                            {isShuffling ? (
                                <span className="flex items-center justify-center gap-3">
                                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Shuffling Database...
                                </span>
                            ) : 'Execute Student Shuffle'}
                        </button>
                    </div>
                </div>

                {shuffleResult && (
                    <div className="mt-12 animate-fade-in bg-emerald-50 border border-emerald-200 rounded-3xl p-8 max-w-4xl mx-auto shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl">✅</div>
                            <h3 className="text-2xl font-black text-emerald-900">{shuffleResult.message}</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {shuffleResult.results.map((res, i) => (
                                <div key={i} className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
                                    <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest mb-1">Section {res.sectionName}</p>
                                    <p className="text-2xl font-black text-slate-800">{res.studentCount}</p>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Students assigned</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl relative border border-slate-100 transform scale-110">
                        <div className="text-center">
                            <div className="text-6xl mb-6">🛑</div>
                            <h2 className="text-3xl font-black text-slate-800 mb-4">Are you absolutely sure?</h2>
                            <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                                This will randomly redistribute all students in this department into the selected semester's sections. 
                                <span className="block mt-4 font-bold text-red-600 underline decoration-red-200 decoration-4 underline-offset-4 italic">
                                    This action cannot be easily undone!
                                </span>
                            </p>
                            
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={handleShuffle}
                                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-lg hover:bg-red-700 transition shadow-lg shadow-red-100 active:scale-95"
                                >
                                    Yes, Shuffle Students Now
                                </button>
                                <button 
                                    onClick={() => setShowConfirmModal(false)}
                                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-lg hover:bg-slate-200 transition active:scale-95"
                                >
                                    Cancel & Go Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminShuffleStudentsTab;
