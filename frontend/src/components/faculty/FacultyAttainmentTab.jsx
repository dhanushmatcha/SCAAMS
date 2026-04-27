import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const FacultyAttainmentTab = ({ assignmentContext, getContextLabel }) => {
    const [selectedContextId, setSelectedContextId] = useState('');
    const [examType, setExamType] = useState('T1');
    const [attainmentData, setAttainmentData] = useState(null);
    const [coDefinitions, setCoDefinitions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isEditingCOs, setIsEditingCOs] = useState(false);

    useEffect(() => {
        if (selectedContextId) {
            fetchCODefinitions();
        }
    }, [selectedContextId]);

    const fetchCODefinitions = async () => {
        const context = assignmentContext.find(c => c._id === selectedContextId);
        if (context && context.subject_id) {
            setCoDefinitions(context.subject_id.co_definitions || []);
        }
    };

    const fetchAttainmentReport = async () => {
        const context = assignmentContext.find(c => c._id === selectedContextId);
        if (!context) return;

        setLoading(true);
        try {
            const res = await api.get('/faculty/attainment-report', {
                params: {
                    section_id: context.section_id._id,
                    subject_id: context.subject_id._id,
                    exam_type: examType
                }
            });
            setAttainmentData(res.data.attainment);
        } catch (error) {
            console.error("Error fetching attainment", error);
        } finally {
            setLoading(false);
        }
    };

    const saveCODefinitions = async () => {
        const context = assignmentContext.find(c => c._id === selectedContextId);
        if (!context) return;

        try {
            await api.put('/faculty/co-definitions', {
                subject_id: context.subject_id._id,
                co_definitions: coDefinitions
            });
            setIsEditingCOs(false);
        } catch (error) {
            console.error("Error saving COs", error);
        }
    };

    const addCO = () => {
        const newCO = { code: `CO${coDefinitions.length + 1}`, description: '', target_percentage: 60 };
        setCoDefinitions([...coDefinitions, newCO]);
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="glass-card p-8 rounded-3xl bg-white/80 shadow-lg">
                <h2 className="text-2xl font-black text-slate-800 mb-6">Course Outcome Attainment</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Section & Subject</label>
                        <select 
                            value={selectedContextId} 
                            onChange={(e) => setSelectedContextId(e.target.value)}
                            className="w-full p-4 rounded-2xl border border-slate-200 bg-white shadow-sm outline-none"
                        >
                            <option value="">Choose a class...</option>
                            {assignmentContext.map(context => (
                                <option key={context._id} value={context._id}>{getContextLabel(context)}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Exam Type</label>
                        <select 
                            value={examType} 
                            onChange={(e) => setExamType(e.target.value)}
                            className="w-full p-4 rounded-2xl border border-slate-200 bg-white shadow-sm outline-none"
                        >
                            <option value="T1">Test 1 (T1)</option>
                            <option value="T4">Test 4 (T4)</option>
                            <option value="External Lab">External Lab</option>
                        </select>
                    </div>
                </div>

                {selectedContextId && (
                    <div className="space-y-8">
                        {/* CO Definitions Section */}
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800">CO Definitions</h3>
                                <button 
                                    onClick={() => isEditingCOs ? saveCODefinitions() : setIsEditingCOs(true)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${isEditingCOs ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
                                >
                                    {isEditingCOs ? 'Save COs' : 'Edit COs'}
                                </button>
                            </div>

                            <div className="space-y-3">
                                {coDefinitions.map((co, idx) => (
                                    <div key={idx} className="grid grid-cols-[80px_1fr_100px] gap-3 items-center">
                                        <div className="font-black text-slate-400">{co.code}</div>
                                        {isEditingCOs ? (
                                            <input 
                                                value={co.description} 
                                                onChange={(e) => {
                                                    const newCOs = [...coDefinitions];
                                                    newCOs[idx].description = e.target.value;
                                                    setCoDefinitions(newCOs);
                                                }}
                                                placeholder="Enter CO description..."
                                                className="p-2 rounded-lg border border-slate-200 text-sm"
                                            />
                                        ) : (
                                            <div className="text-sm text-slate-600 italic">{co.description || 'No description provided.'}</div>
                                        )}
                                        <div className="text-right text-xs font-bold text-slate-500">{co.target_percentage}% Goal</div>
                                    </div>
                                ))}
                                {isEditingCOs && (
                                    <button onClick={addCO} className="text-xs font-bold text-emerald-600 hover:underline mt-2">+ Add New CO</button>
                                )}
                                {coDefinitions.length === 0 && !isEditingCOs && <p className="text-xs text-slate-400">No COs defined for this subject yet.</p>}
                            </div>
                        </div>

                        {/* Attainment Calculation Trigger */}
                        <div className="flex justify-center">
                            <button 
                                onClick={fetchAttainmentReport}
                                disabled={loading || coDefinitions.length === 0}
                                className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition transform hover:-translate-y-1 disabled:opacity-50"
                            >
                                {loading ? 'Calculating Attainment...' : 'Generate Attainment Report'}
                            </button>
                        </div>

                        {/* Results Section */}
                        {attainmentData && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                                {Object.entries(attainmentData).map(([code, data]) => (
                                    <div key={code} className="glass-card p-6 rounded-2xl bg-white border border-slate-100 shadow-sm relative overflow-hidden group">
                                        <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 group-hover:scale-110 transition-transform ${data.percentage >= 60 ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                                        <h4 className="text-2xl font-black text-slate-800 mb-1">{code}</h4>
                                        <p className="text-[10px] text-slate-400 mb-4 h-8 overflow-hidden line-clamp-2">{data.description}</p>
                                        
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <div className="text-3xl font-black text-slate-900">{data.percentage}%</div>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Attainment</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-slate-700">{data.attainedCount} / {data.totalStudents}</div>
                                                <p className="text-[10px] text-slate-400 uppercase">Students Met Goal</p>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${data.percentage >= 60 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                                style={{ width: `${data.percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FacultyAttainmentTab;
