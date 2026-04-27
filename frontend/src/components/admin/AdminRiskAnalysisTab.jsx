import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AdminRiskAnalysisTab = () => {
    const [riskData, setRiskData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRiskReport();
    }, []);

    const fetchRiskReport = async () => {
        try {
            const res = await api.get('/admin/analytics/risk-report');
            setRiskData(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching risk report", error);
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-slate-500">Analyzing student risks...</div>;

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">AI Risk Analysis</h2>
                    <p className="text-slate-500 text-sm">Identifying students at academic risk based on attendance and exam trends.</p>
                </div>
                <div className="flex space-x-3">
                    <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-bold border border-red-100">
                        {riskData.filter(r => r.riskLevel === 'High').length} High Risk
                    </div>
                    <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-sm font-bold border border-orange-100">
                        {riskData.filter(r => r.riskLevel === 'Medium').length} Medium Risk
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 text-slate-600 text-xs uppercase tracking-widest font-bold">
                        <tr>
                            <th className="p-5">Student</th>
                            <th className="p-5">Dept / Section</th>
                            <th className="p-5">Risk Score</th>
                            <th className="p-5">Risk Level</th>
                            <th className="p-5">Reasons</th>
                            <th className="p-5">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {riskData.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-10 text-center text-slate-400 italic">No high-risk students identified. Great job!</td>
                            </tr>
                        ) : (
                            riskData.map((student, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition">
                                    <td className="p-5">
                                        <div className="font-bold text-slate-800">{student.name}</div>
                                        <div className="text-[10px] text-slate-400">{student.regd_no}</div>
                                    </td>
                                    <td className="p-5">
                                        <div className="text-sm text-slate-600">{student.department}</div>
                                        <div className="text-[10px] font-bold text-orange-500 uppercase">{student.section}</div>
                                    </td>
                                    <td className="p-5">
                                        <div className="w-full bg-slate-100 rounded-full h-2 max-w-[100px] overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${
                                                    student.riskScore >= 80 ? 'bg-red-500' : 
                                                    student.riskScore >= 60 ? 'bg-orange-500' : 'bg-yellow-500'
                                                }`} 
                                                style={{ width: `${student.riskScore}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-[10px] mt-1 font-bold text-slate-400">{student.riskScore}/100</div>
                                    </td>
                                    <td className="p-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                            student.riskLevel === 'High' ? 'bg-red-100 text-red-600' : 
                                            student.riskLevel === 'Medium' ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'
                                        }`}>
                                            {student.riskLevel}
                                        </span>
                                    </td>
                                    <td className="p-5">
                                        <div className="space-y-1">
                                            {student.riskReasons.map((reason, ridx) => (
                                                <div key={ridx} className="text-[10px] text-slate-500 flex items-center">
                                                    <span className="w-1 h-1 bg-slate-300 rounded-full mr-2"></span>
                                                    {reason}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-5 text-right">
                                        <button className="text-[10px] font-bold bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-black transition">
                                            Notify Proctor
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminRiskAnalysisTab;
