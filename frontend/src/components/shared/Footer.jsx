import React from 'react';

const Footer = () => {
    return (
        <footer className="w-full py-8 px-8 bg-white/50 backdrop-blur-md border-t border-slate-200/50 mt-auto">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200/50">
                        S
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">SCAAMS</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Smart Academic Management</p>
                    </div>
                </div>

                <div className="flex gap-8">
                    <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform</span>
                        <a href="#" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">Help Center</a>
                        <a href="#" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">Documentation</a>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connect</span>
                        <a href="#" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">Support</a>
                        <a href="#" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">University Portal</a>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-sm font-bold text-slate-700">© 2026 SCAAMS Institution</p>
                    <p className="text-xs text-slate-500 font-medium">Built with precision for Vignan University</p>
                    <div className="flex gap-2 justify-end mt-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                        <span className="text-[10px] font-black text-emerald-600 uppercase">System Operational</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
