import React, { useState, useEffect } from 'react';
import api from '../services/api';

const FeesTab = () => {
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFees();
    }, []);

    const fetchFees = async () => {
        try {
            const res = await api.get('/student/fees');
            setFees(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching fees", error);
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="p-20 text-center flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium">Retrieving financial records...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            {fees.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-12 text-center shadow-xl border border-slate-100">
                    <div className="text-6xl mb-6 text-slate-200">💳</div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">No Fee Records Found</h3>
                    <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                        It looks like your fee details haven't been synchronized with the portal yet. Please contact the accounts department for more information.
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {fees.map(fee => {
                            const pending = fee.total_amount - fee.paid_amount;
                            const percentage = Math.round((fee.paid_amount / fee.total_amount) * 100);
                            
                            return (
                                <div key={fee._id} className="lg:col-span-3 bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-emerald-100/50 border border-emerald-50 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50 transition-transform group-hover:scale-110"></div>
                                    
                                    <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-6">
                                                <span className="bg-emerald-100 text-emerald-700 px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase">
                                                    AY {fee.academic_year} • Semester {fee.semester}
                                                </span>
                                                <span className={`px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase ${
                                                    fee.status === 'Paid' ? 'bg-emerald-500 text-white' : 
                                                    fee.status === 'Partial' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                                                }`}>
                                                    {fee.status}
                                                </span>
                                            </div>
                                            
                                            <h3 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">Tuition & Academic Fees</h3>
                                            <p className="text-slate-400 font-medium text-sm">Last payment recorded on {new Date(fee.updatedAt).toLocaleDateString()}</p>
                                            
                                            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
                                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 transition-transform hover:-translate-y-1">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Fee</p>
                                                    <p className="text-2xl font-black text-slate-800">₹{fee.total_amount.toLocaleString()}</p>
                                                </div>
                                                <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 transition-transform hover:-translate-y-1">
                                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Paid</p>
                                                    <p className="text-2xl font-black text-emerald-700">₹{fee.paid_amount.toLocaleString()}</p>
                                                </div>
                                                <div className="p-6 rounded-3xl bg-rose-50 border border-rose-100 transition-transform hover:-translate-y-1">
                                                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Balance Due</p>
                                                    <p className="text-2xl font-black text-rose-700">₹{pending.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full md:w-64 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                            <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                                                <svg className="absolute w-full h-full transform -rotate-90">
                                                    <circle cx="64" cy="64" r="58" stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
                                                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent"
                                                        className="text-emerald-500 transition-all duration-1000 ease-out"
                                                        strokeDasharray={`${(percentage / 100) * 364} 364`}
                                                        strokeLinecap="round" />
                                                </svg>
                                                <span className="text-2xl font-black text-slate-800">{percentage}%</span>
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paid Percentage</p>
                                        </div>
                                    </div>

                                    {/* History Table */}
                                    <div className="mt-12 relative z-10">
                                        <h4 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                            <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                                            Payment History
                                        </h4>
                                        <div className="overflow-x-auto rounded-3xl border border-slate-100">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                                    <tr>
                                                        <th className="p-4">Date</th>
                                                        <th className="p-4">Transaction ID</th>
                                                        <th className="p-4">Method</th>
                                                        <th className="p-4 text-right">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {fee.payment_history.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="4" className="p-8 text-center text-slate-400 italic">No payments recorded yet.</td>
                                                        </tr>
                                                    ) : (
                                                        fee.payment_history.map((pay, i) => (
                                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="p-4 text-sm font-bold text-slate-700">{new Date(pay.date).toLocaleDateString()}</td>
                                                                <td className="p-4 text-xs font-mono text-slate-500">{pay.transaction_id || 'N/A'}</td>
                                                                <td className="p-4">
                                                                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">
                                                                        {pay.method}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4 text-sm font-black text-emerald-600 text-right">₹{pay.amount.toLocaleString()}</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            <div className="bg-amber-50 rounded-[2.5rem] p-8 border border-amber-100 flex items-start gap-6">
                <div className="text-4xl">💡</div>
                <div>
                    <h4 className="text-lg font-black text-amber-900 mb-1">Important Note</h4>
                    <p className="text-amber-800/70 text-sm font-medium leading-relaxed">
                        Online payment through the portal is currently under maintenance. Please visit the accounts office for physical receipts and fee clearance. Ensure all dues are cleared 15 days prior to the final examinations.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FeesTab;
