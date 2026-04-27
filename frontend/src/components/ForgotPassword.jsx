import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
    const [step, setStep] = useState(1); // 1: Verify, 2: Reset
    const [email, setEmail] = useState('');
    const [uniqueId, setUniqueId] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [userId, setUserId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/reset-request', { email, unique_id: uniqueId });
            setUserId(res.data.userId);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return setError('Passwords do not match');
        }
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/reset-password', { userId, newPassword });
            setMessage('Password reset successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {/* Background Blobs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob"></div>
            <div className="absolute -bottom-8 right-20 w-96 h-96 bg-violet-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob animation-delay-4000"></div>

            <div className="glass-panel p-10 w-full max-w-md z-10 animate-fade-in">
                <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-white text-xl font-black">🔑</span>
                    </div>
                </div>
                
                <h2 className="text-2xl font-black mb-2 text-center text-slate-800">Account Recovery</h2>
                <p className="text-center text-slate-500 mb-8 text-xs font-bold uppercase tracking-widest">
                    {step === 1 ? "Verify your identity" : "Set your new password"}
                </p>

                {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl mb-6 text-xs font-bold">{error}</div>}
                {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl mb-6 text-xs font-bold">{message}</div>}

                {step === 1 ? (
                    <form onSubmit={handleVerify} className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                            <input 
                                type="email" 
                                className="input-field" 
                                placeholder="your-email@vignan.ac.in"
                                value={email} onChange={e => setEmail(e.target.value)} required 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Regd No / Faculty ID</label>
                            <input 
                                type="text" 
                                className="input-field" 
                                placeholder="e.g. 211FA04xxx"
                                value={uniqueId} onChange={e => setUniqueId(e.target.value)} required 
                            />
                        </div>
                        <button 
                            disabled={loading}
                            type="submit" 
                            className="btn-primary w-full h-12 font-black tracking-tight"
                        >
                            {loading ? "Verifying..." : "Verify Identity"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleReset} className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">New Password</label>
                            <input 
                                type="password" 
                                className="input-field" 
                                placeholder="••••••••"
                                value={newPassword} onChange={e => setNewPassword(e.target.value)} required 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Confirm Password</label>
                            <input 
                                type="password" 
                                className="input-field" 
                                placeholder="••••••••"
                                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required 
                            />
                        </div>
                        <button 
                            disabled={loading}
                            type="submit" 
                            className="btn-primary w-full h-12 font-black tracking-tight"
                        >
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                    </form>
                )}

                <div className="mt-8 text-center">
                    <button 
                        onClick={() => navigate('/login')}
                        className="text-[10px] font-black text-slate-400 hover:text-indigo-600 transition uppercase tracking-widest"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
