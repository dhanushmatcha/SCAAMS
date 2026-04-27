import React, { useState, useEffect } from 'react';
import api from '../services/api';

const TimetableGrid = ({ userRole, sectionId, facultyId, assignedSections = [], onFindReplacement, isCompact = false }) => {
  const [timetable, setTimetable] = useState({});
  const [timetableEntries, setTimetableEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [activeDay, setActiveDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));

  const timeSlots = [
    '09:00 AM - 09:50 AM',
    '10:00 AM - 10:50 AM',
    '11:10 AM - 12:00 PM',
    '12:10 PM - 01:00 PM',
    '02:00 PM - 02:50 PM',
    '03:00 PM - 03:50 PM'
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const getSubjectStyle = (subjectName) => {
    const name = subjectName.toLowerCase();
    if (name.includes('lab') || name.includes('practical')) return 'from-blue-500 to-indigo-600 shadow-blue-100';
    if (name.includes('drawing') || name.includes('graphics')) return 'from-purple-500 to-fuchsia-600 shadow-purple-100';
    if (name.includes('mathematics') || name.includes('math')) return 'from-emerald-500 to-teal-600 shadow-emerald-100';
    if (name.includes('physics') || name.includes('chemistry')) return 'from-orange-500 to-amber-600 shadow-orange-100';
    if (name.includes('programming') || name.includes('data')) return 'from-violet-500 to-purple-600 shadow-violet-100';
    if (name.includes('project') || name.includes('work')) return 'from-rose-500 to-pink-600 shadow-rose-100';
    return 'from-slate-600 to-slate-700 shadow-slate-100';
  };

  const convertTo12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours);
    const m = minutes;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  };

  const findMatchingTimeSlot = (startTime, endTime) => {
    const start12 = convertTo12Hour(startTime);
    const end12 = convertTo12Hour(endTime);
    const constructedSlot = `${start12} - ${end12}`;
    
    for (const slot of timeSlots) {
      if (slot === constructedSlot) return slot;
    }
    
    for (const slot of timeSlots) {
      const [slotStart] = slot.split(' - ');
      const [sh, sm] = slotStart.split(':');
      const startH = parseInt(startTime.split(':')[0]);
      const startM = parseInt(startTime.split(':')[1]);
      
      const sH = parseInt(sh) + (slotStart.includes('PM') && sh !== '12' ? 12 : 0);
      if (startH === sH) return slot;
    }
    
    return null;
  };

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        setLoading(true);
        let response;
        
        if (userRole === 'Student') {
          response = await api.get('/student/timetable');
        } else if (userRole === 'Faculty') {
          response = await api.get('/faculty/timetable');
        } else if (userRole === 'Admin' && sectionId) {
          response = await api.get(`/admin/section/${sectionId}/timetable`);
        }
        
        if (response && response.data) {
          const data = response.data;
          const entries = Array.isArray(data) ? data : data.timetable || [];

          const gridData = {};
          days.forEach(day => {
            gridData[day] = {};
            timeSlots.forEach(slot => {
              gridData[day][slot] = null;
            });
          });

          entries.forEach(entry => {
            const day = entry.day_of_week;
            const matchingSlot = findMatchingTimeSlot(entry.start_time, entry.end_time);
            
            if (matchingSlot && gridData[day]) {
              gridData[day][matchingSlot] = {
                id: entry._id,
                subject: entry.subject_id?.name || 'Unknown',
                subjectCode: entry.subject_id?.code || '',
                faculty: (userRole === 'Student' || userRole === 'Admin') ? entry.faculty_id?.name : entry.section_id?.name,
                room: entry.classroom_id?.room_number || 'TBA',
                type: entry.subject_id?.name?.toLowerCase().includes('lab') ? 'LAB' : 'THEORY'
              };
            }
          });

          setTimetable(gridData);
          setTimetableEntries(entries);
        }
      } catch (error) {
        console.error('Error fetching timetable:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, [userRole, sectionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Synchronizing Timetable...</p>
      </div>
    );
  }

  return (
    <div className={`w-full animate-fade-in ${isCompact ? 'space-y-4' : 'space-y-8'}`}>
      {/* Day Selector Tabs */}
      <div className={`flex flex-wrap justify-center gap-2 p-1 bg-slate-100/50 backdrop-blur-md rounded-2xl border border-white/50 shadow-inner ${isCompact ? 'max-w-3xl mx-auto' : ''}`}>
        {days.map(day => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
              activeDay === day 
              ? 'bg-white text-indigo-600 shadow-md scale-105' 
              : 'text-slate-500 hover:text-indigo-500 hover:bg-white/50'
            } ${isCompact ? 'px-4 py-1.5 text-xs' : ''}`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Grid Content */}
      <div className={isCompact ? "space-y-2 max-w-4xl mx-auto" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
        {timeSlots.map((slot, idx) => {
          const cell = timetable[activeDay]?.[slot];
          const [startTime, endTime] = slot.split(' - ');
          
          if (isCompact) {
              return (
                <div 
                  key={slot}
                  className={`group relative px-6 py-3 rounded-2xl border transition-all duration-300 flex items-center gap-6 ${
                    cell 
                    ? 'bg-white border-slate-100 shadow-sm hover:shadow-md' 
                    : 'bg-slate-50/50 border-dashed border-slate-200 opacity-40'
                  }`}
                >
                  <div className="w-24 flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Slot {idx + 1}</span>
                    <span className="text-xs font-bold text-slate-600">{startTime}</span>
                  </div>

                  <div className="flex-1">
                    {cell ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getSubjectStyle(cell.subject)} text-white shadow-lg flex items-center justify-center text-lg`}>
                             {cell.type === 'LAB' ? '🧪' : '📖'}
                           </div>
                           <div>
                             <h4 className="text-sm font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                               {cell.subject}
                             </h4>
                             <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                               {cell.subjectCode} • <span className="text-indigo-500">{cell.room}</span>
                             </p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-black text-slate-700">{cell.faculty}</p>
                           <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{cell.type}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="text-sm">☕</span>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Free Period</p>
                      </div>
                    )}
                  </div>
                </div>
              );
          }

          return (
            <div 
              key={slot}
              className={`group relative p-6 rounded-[2rem] border transition-all duration-500 ${
                cell 
                ? 'bg-white border-slate-100 shadow-xl hover:shadow-2xl hover:-translate-y-2' 
                : 'bg-slate-50/50 border-dashed border-slate-200 opacity-60'
              }`}
            >
              {/* Time Badge */}
              <div className="flex justify-between items-center mb-4">
                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black tracking-widest uppercase">
                  Slot {idx + 1}
                </span>
                <span className="text-xs font-bold text-slate-400">{startTime}</span>
              </div>

              {cell ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                      {cell.subject}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      {cell.subjectCode}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${getSubjectStyle(cell.subject)} text-white shadow-lg`}>
                      <span className="text-xl">{cell.type === 'LAB' ? '🧪' : '📖'}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{cell.faculty}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Classroom: <span className="text-indigo-500 font-black">{cell.room}</span></p>
                    </div>
                  </div>

                  {/* Decorative Gradient Line */}
                  <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1 rounded-full bg-gradient-to-r ${getSubjectStyle(cell.subject)} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                </div>
              ) : (
                <div className="h-32 flex flex-col items-center justify-center text-slate-300">
                  <span className="text-3xl mb-2">☕</span>
                  <p className="text-xs font-bold uppercase tracking-widest">Free Period</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend & Summary */}
      <div className="flex flex-col md:flex-row justify-between items-center p-6 bg-indigo-900 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        
        <div className="z-10 mb-6 md:mb-0">
          <h3 className="text-xl font-black mb-1 italic tracking-tight">Today's Load</h3>
          <p className="text-xs text-indigo-200 font-medium uppercase tracking-widest">
            {Object.values(timetable[activeDay] || {}).filter(v => v !== null).length} Scheduled Classes
          </p>
        </div>

        <div className="flex flex-wrap gap-4 z-10 justify-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="w-3 h-3 rounded-full bg-indigo-400"></div>
            <span className="text-[10px] font-bold uppercase">Theory</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
            <span className="text-[10px] font-bold uppercase">Practical</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableGrid;

