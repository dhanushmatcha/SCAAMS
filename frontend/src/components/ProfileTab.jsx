import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const ProfileTab = () => {
    const { user, setUser } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        dob: '',
        gender: '',
        address: '',
        bio: '',
        skills: '',
        experience: '',
        achievements: '',
        profile_picture: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                phone: user.phone || '',
                dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
                gender: user.gender || 'Male',
                address: user.address || '',
                bio: user.bio || '',
                skills: (user.skills || []).join(', '),
                experience: user.experience || '',
                achievements: (user.achievements || []).join(', '),
                profile_picture: user.profile_picture || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        try {
            const dataToSubmit = {
                ...formData,
                skills: formData.skills.split(',').map(s => s.trim()).filter(s => s !== ''),
                achievements: formData.achievements.split(',').map(s => s.trim()).filter(s => s !== '')
            };
            const res = await api.put('/auth/profile', dataToSubmit);
            setUser({ ...user, ...res.data });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error("Error updating profile", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Header Card */}
                <div className="glass-card p-8 rounded-3xl bg-white/80 shadow-xl border-b-8 border-indigo-500 flex flex-col md:flex-row items-center gap-8">
                    <div className="relative group">
                        <img 
                            src={formData.profile_picture} 
                            alt="Profile" 
                            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg group-hover:opacity-75 transition"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-none">
                            <span className="text-[10px] font-bold bg-black/50 text-white px-2 py-1 rounded">Update Photo</span>
                        </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <p className="text-indigo-600 font-black uppercase tracking-tighter text-2xl">
                            {user?.name} — {user?.department?.name || 'Academic Dept'}
                        </p>
                        <p className="text-slate-400 text-sm font-bold mt-1 tracking-widest uppercase opacity-60">
                            {user?.role} Portal • {user?.email}
                        </p>
                        {user?.role === 'Student' && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="bg-slate-800 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Regd: {user?.regd_no || 'N/A'}</span>
                                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Section: {user?.section_id?.name || 'Unassigned'}</span>
                                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Semester: {user?.section_id?.semester || 'N/A'}</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition shadow-lg disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                {success && (
                    <div className="bg-emerald-100 text-emerald-700 p-4 rounded-2xl font-bold text-center animate-bounce">
                        ✅ Profile updated successfully!
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Details */}
                    <div className="glass-card p-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                            <span className="text-xl">👤</span> Personal Details
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Full Name</label>
                                    <input name="name" value={formData.name} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none transition font-bold text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Department</label>
                                    <input 
                                        value={user?.department?.name || 'Not Assigned'} 
                                        disabled 
                                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed outline-none font-bold text-sm" 
                                    />
                                </div>
                            </div>

                            {user?.role === 'Student' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Regd Number</label>
                                        <input value={user?.regd_no || 'N/A'} disabled className="w-full p-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed outline-none font-bold text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Section & Sem</label>
                                        <input value={user?.section_id ? `${user.section_id.name} (Sem ${user.section_id.semester})` : 'Unassigned'} disabled className="w-full p-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed outline-none font-bold text-sm" />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Phone Number</label>
                                <input name="phone" value={formData.phone} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none transition" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Date of Birth</label>
                                    <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Gender</label>
                                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none">
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Home Address</label>
                                <textarea name="address" value={formData.address} onChange={handleChange} rows="3" className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none" />
                            </div>
                        </div>
                    </div>

                    {/* Professional Details */}
                    <div className="glass-card p-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                            <span className="text-xl">💼</span> Professional Details
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bio / Summary</label>
                                <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="Tell us about yourself..." className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Skills (Comma separated)</label>
                                <input name="skills" value={formData.skills} onChange={handleChange} placeholder="e.g. Python, Public Speaking, Research" className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none" />
                            </div>
                            {user?.role === 'Faculty' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Teaching Experience</label>
                                    <textarea name="experience" value={formData.experience} onChange={handleChange} placeholder="Past institutions, years of service..." className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none" />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Achievements</label>
                                <input name="achievements" value={formData.achievements} onChange={handleChange} placeholder="Awards, certifications..." className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 rounded-3xl bg-indigo-50 border border-indigo-100">
                    <label className="block text-xs font-bold text-indigo-500 uppercase mb-2">Profile Picture URL</label>
                    <input name="profile_picture" value={formData.profile_picture} onChange={handleChange} placeholder="https://..." className="w-full p-3 rounded-xl border border-indigo-200 bg-white outline-none" />
                </div>
            </form>
        </div>
    );
};

export default ProfileTab;
