import React from 'react';

const AdminTimetablesTab = ({
    timetables, setTimetables,
    users, setUsers,
    sections, setSections,
    subjects, setSubjects,
    classrooms, setClassrooms,
    fetchData, handleCreate,
    ttFilterType, setTtFilterType,
    ttFilterValue, setTtFilterValue
}) => {
    return (
        <div className="animate-fade-in glass-card p-8 rounded-3xl text-center bg-white/80">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Timetable Builder is Functional</h2>
            <p className="text-slate-500 max-w-md mx-auto mb-6">Fully integrated with the backend API. Select Section, Subject, Faculty, Classroom, Day and Time.</p>

            <form className="grid grid-cols-2 md:grid-cols-3 gap-4 text-left max-w-4xl mx-auto" onSubmit={(e) => {
                e.preventDefault();
                const payload = {
                    section_id: e.target.sec.value, subject_id: e.target.sub.value, faculty_id: e.target.fac.value,
                    classroom_id: e.target.room.value, day_of_week: e.target.day.value, start_time: e.target.start.value, end_time: e.target.end.value
                };
                handleCreate('timetable', payload, () => fetchData('timetable', setTimetables));
            }}>
                <select name="sec" className="p-3 border rounded-xl outline-none" required onClick={() => { if (sections.length === 0) fetchData('section', setSections) }}>
                    <option value="">Section</option>
                    {sections.map(s => <option key={s._id} value={s._id}>{s.name} (Sem {s.semester})</option>)}
                </select>
                <select name="sub" className="p-3 border rounded-xl outline-none" required onClick={() => { if (subjects.length === 0) fetchData('subject', setSubjects) }}>
                    <option value="">Subject</option>
                    {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <select name="fac" className="p-3 border rounded-xl outline-none" required onClick={() => { if (users.length === 0) fetchData('users', setUsers) }}>
                    <option value="">Faculty</option>
                    {users.filter(u => u.role === 'Faculty').map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
                <select name="room" className="p-3 border rounded-xl outline-none" required onClick={() => { if (classrooms.length === 0) fetchData('classroom', setClassrooms) }}>
                    <option value="">Classroom</option>
                    {classrooms.map(c => <option key={c._id} value={c._id}>{c.room_number}</option>)}
                </select>
                <select name="day" className="p-3 border rounded-xl outline-none" required>
                    <option value="">Day of Week</option>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="flex gap-2">
                    <input name="start" type="time" className="w-1/2 p-3 border rounded-xl outline-none" required />
                    <input name="end" type="time" className="w-1/2 p-3 border rounded-xl outline-none" required />
                </div>
                <div className="col-span-full mt-4">
                    <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition transform hover:-translate-y-0.5">Schedule Class Slot</button>
                </div>
            </form>

            <div className="mt-12 text-left">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                    <h3 className="font-bold text-xl text-slate-800">Scheduled Slots</h3>

                    <div className="flex flex-wrap gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <select className="px-3 py-1.5 rounded-lg border-slate-200 outline-none text-sm bg-white" value={ttFilterType} onChange={(e) => { setTtFilterType(e.target.value); setTtFilterValue(''); }}>
                            <option value="All">All Timetables</option>
                            <option value="Faculty">By Faculty</option>
                            <option value="Class">By Class (Section)</option>
                        </select>

                        {ttFilterType === 'Faculty' && (
                            <select className="px-3 py-1.5 rounded-lg border-slate-200 outline-none text-sm bg-white min-w-[200px]" value={ttFilterValue} onChange={(e) => setTtFilterValue(e.target.value)}>
                                <option value="">Select Faculty...</option>
                                {users.filter(u => u.role === 'Faculty').map(u => <option key={u._id} value={u._id}>{u.name} ({u.faculty_id})</option>)}
                            </select>
                        )}

                        {ttFilterType === 'Class' && (
                            <select className="px-3 py-1.5 rounded-lg border-slate-200 outline-none text-sm bg-white min-w-[200px]" value={ttFilterValue} onChange={(e) => setTtFilterValue(e.target.value)}>
                                <option value="">Select Section...</option>
                                {sections.map(s => <option key={s._id} value={s._id}>{s.name} (Sem {s.semester})</option>)}
                            </select>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {timetables.filter(t => {
                        if (ttFilterType === 'All') return true;
                        if (ttFilterType === 'Faculty') return ttFilterValue === '' || t.faculty_id?._id === ttFilterValue;
                        if (ttFilterType === 'Class') return ttFilterValue === '' || t.section_id?._id === ttFilterValue;
                        return true;
                    }).map(t => (
                        <div key={t._id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-slate-800">{t.day_of_week}, {t.start_time} - {t.end_time}</p>
                                <p className="text-sm text-slate-600">{t.subject_id?.name || 'Sub'} • {t.faculty_id?.name || 'Fac'}</p>
                            </div>
                            <div className="text-right">
                                <span className="block text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">Sec {t.section_id?.name}</span>
                                <span className="block text-xs text-slate-500 mt-1">Room {t.classroom_id?.room_number}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminTimetablesTab;
