import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const user = await login(email, password);
            if (user.role === 'Admin') navigate('/admin');
            if (user.role === 'Faculty') navigate('/faculty');
            if (user.role === 'Student') navigate('/student');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {/* Decorative background blobs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-brand-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-96 h-96 bg-violet-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-4000"></div>

            <div className="glass-panel p-10 md:p-12 w-full max-w-md z-10 animate-fade-in">
                <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-gradient-primary rounded-2xl shadow-[0_8px_16px_rgba(79,70,229,0.3)] flex items-center justify-center transform -rotate-6 transition-transform hover:rotate-0 duration-300">
                        <span className="text-white text-3xl font-bold font-serif filter drop-shadow-md">S</span>
                    </div>
                </div>
                <h2 className="text-3xl font-extrabold mb-3 text-center text-slate-800 tracking-tight">Welcome to <span className="text-gradient">SCAAMS</span></h2>
                <p className="text-center text-slate-500 mb-8 text-sm font-medium">Smart Campus Attendance & Academic Mgmt</p>

                {error && <div className="bg-red-50/90 border border-red-200 text-red-700 p-4 rounded-xl mb-6 text-sm flex items-center shadow-sm animate-fade-in backdrop-blur-sm">
                    <svg className="w-5 h-5 mr-3 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                    {error}
                </div>}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700">Email Address</label>
                        <input
                            type="email"
                            className="input-field"
                            placeholder="user@vignan.ac.in"
                            value={email} onChange={e => setEmail(e.target.value)} required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700">Password</label>
                        <input
                            type="password"
                            className="input-field"
                            placeholder="••••••••"
                            value={password} onChange={e => setPassword(e.target.value)} required
                        />
                        <div className="flex justify-end mt-1">
                            <button 
                                type="button"
                                onClick={() => navigate('/forgot-password')}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary w-full mt-2 shadow-brand-500/25 flex justify-center items-center h-12 text-base"
                    >
                        {isLoading ? (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : "Sign In"}
                    </button>


                </form>
            </div>
        </div>
    );
};

export default Login;
