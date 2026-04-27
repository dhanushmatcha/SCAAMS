import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import TimetableGrid from '../components/TimetableGrid';

const AdminSectionDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [selectedSection, setSelectedSection] = useState(null);
    const [sectionDetails, setSectionDetails] = useState(null);
    const [sectionStudents, setSectionStudents] = useState([]);
    const [availableStudents, setAvailableStudents] = useState([]);
    const [selectedStudentsToAdd, setSelectedStudentsToAdd] = useState([]);
    const [activeTab, setActiveTab] = useState('students'); // 'students', 'faculties', 'timetable'

    useEffect(() => {
        fetchSectionData();
    }, [id]);

    const fetchSectionData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/section/${id}/details`);
            const data = res.data;
            
            setSectionDetails(data);
            setSelectedSection(data.section || { name: 'Details', semester: 'N/A' }); 
            setSectionStudents(data.students || []);
            
            const deptId = data.section?.department_id?._id || data.section?.department_id;
            if (deptId) {
                const studRes = await api.get(`/admin/students/available?departmentId=${deptId}`);
                setAvailableStudents(studRes.data);
            }
        } catch (error) {
            console.error('Error loading section details', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignStudentsToSection = async () => {
        try {
            if (selectedStudentsToAdd.length === 0) {
                alert('Please select students to assign');
                return;
            }
            
            await api.post(`/admin/section/${id}/assign-students`, {
                studentIds: selectedStudentsToAdd
            });
            alert('Students assigned successfully!');
            
            setSelectedStudentsToAdd([]);
            fetchSectionData();
        } catch (error) {
            alert('Error assigning students: ' + (error.response?.data?.message || error.message));
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col h-screen bg-slate-50 items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500 font-medium">Loading section details...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-screen bg-slate-50 overflow-hidden font-sans relative">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 pointer-events-none animate-blob"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 pointer-events-none animate-blob animation-delay-2000"></div>

            <header className="glass-navbar p-6 z-10 flex justify-between items-center border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin')} className="text-slate-500 hover:text-indigo-600 transition flex items-center gap-2 font-semibold">
                        <span>←</span> Back to Dashboard
                    </button>
                    <div className="h-6 w-px bg-slate-300"></div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        Section Details
                    </h1>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8 z-10 custom-scrollbar">
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-xl max-w-7xl mx-auto border border-white/50">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <div className="text-4xl mb-4">📚</div>
                            <h2 className="text-3xl font-black text-slate-800 mb-2">Section {selectedSection?.name}</h2>
                            <p className="text-slate-500 font-medium text-lg">
                                Semester {selectedSection?.semester} | {selectedSection?.department_id?.name || 'Department'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className="bg-blue-50/80 p-6 rounded-2xl text-center border border-blue-100 shadow-sm">
                            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">Total Students</p>
                            <p className="text-4xl font-black text-blue-700">{sectionStudents.length}</p>
                        </div>
                        <div className="bg-green-50/80 p-6 rounded-2xl text-center border border-green-100 shadow-sm">
                            <p className="text-sm font-semibold text-green-600 uppercase tracking-wider mb-2">Main Faculty</p>
                            <p className="text-xl font-bold text-green-700 mt-2">{sectionDetails?.faculties?.mainFaculty?.name || 'Unassigned'}</p>
                        </div>
                        <div className="bg-purple-50/80 p-6 rounded-2xl text-center border border-purple-100 shadow-sm">
                            <p className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-2">TA Count</p>
                            <p className="text-4xl font-black text-purple-700">{sectionDetails?.faculties?.taFaculties?.length || 0}</p>
                        </div>
                    </div>

                    <div className="border-b border-slate-200 mb-8 flex gap-2">
                        {['students', 'faculties', 'timetable'].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-3 px-6 font-bold text-sm uppercase tracking-wider rounded-t-xl transition-all duration-200 ${
                                    activeTab === tab 
                                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' 
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'students' && (
                        <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <h3 className="font-extrabold text-xl text-slate-800 mb-6 flex items-center gap-2">
                                    <span className="w-2 h-6 bg-blue-500 rounded-full inline-block"></span>
                                    Current Students ({sectionStudents.length})
                                </h3>
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    {sectionStudents.length > 0 ? (
                                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                                                    <tr>
                                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reg. Number</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {sectionStudents.map(student => (
                                                        <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-4 font-semibold text-slate-800">{student.name}</td>
                                                            <td className="px-6 py-4 text-sm font-medium text-slate-500 bg-slate-50/50 rounded-md mx-2">{student.regd_no || 'N/A'}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-600">{student.email}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center text-slate-500">
                                            <div className="text-5xl mb-4 opacity-50">👨‍🎓</div>
                                            <p className="font-semibold text-lg">No students currently assigned.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="lg:col-span-1">
                                <div className="bg-gradient-to-b from-indigo-50 to-white rounded-2xl border border-indigo-100 p-6 shadow-sm sticky top-6">
                                    <h4 className="font-extrabold text-lg text-indigo-900 mb-2">Assign New Students</h4>
                                    <p className="text-sm text-indigo-600/70 mb-6 font-medium">Select available students from the department.</p>
                                    
                                    <div className="max-h-80 overflow-y-auto custom-scrollbar border border-white bg-white/50 rounded-xl p-2 mb-6">
                                        {availableStudents.length > 0 ? (
                                            <div className="space-y-1">
                                                {availableStudents.map(student => (
                                                    <label key={student._id} className="flex items-center space-x-3 p-3 hover:bg-white rounded-lg cursor-pointer transition-colors group">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedStudentsToAdd.includes(student._id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedStudentsToAdd([...selectedStudentsToAdd, student._id]);
                                                                } else {
                                                                    setSelectedStudentsToAdd(selectedStudentsToAdd.filter(id => id !== student._id));
                                                                }
                                                            }}
                                                            className="w-5 h-5 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 focus:ring-2 transition-all"
                                                        />
                                                        <div className="flex-1">
                                                            <span className="font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">{student.name}</span>
                                                            <span className="block text-slate-400 text-xs font-medium mt-0.5">{student.regd_no || student.email}</span>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-slate-500 text-center py-8 font-medium">No available students found.</p>
                                        )}
                                    </div>
                                    <button 
                                        onClick={handleAssignStudentsToSection}
                                        disabled={selectedStudentsToAdd.length === 0}
                                        className="w-full py-3 bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl hover:bg-indigo-700 font-bold tracking-wide transition-all shadow-md shadow-indigo-200"
                                    >
                                        Assign {selectedStudentsToAdd.length > 0 && `(${selectedStudentsToAdd.length})`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'faculties' && (
                        <div className="animate-fade-in max-w-4xl">
                            <h3 className="font-extrabold text-xl text-slate-800 mb-6 flex items-center gap-2">
                                <span className="w-2 h-6 bg-green-500 rounded-full inline-block"></span>
                                Assigned Teaching Staff
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {sectionDetails?.faculties?.allAssignments && sectionDetails.faculties.allAssignments.length > 0 ? (
                                    sectionDetails.faculties.allAssignments.map(assignment => (
                                        <div key={assignment._id} className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-green-400"></div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-400">
                                                        {assignment.faculty_id?.name?.charAt(0) || 'F'}
                                                    </div>
                                                    <div>
                                                        <p className="font-extrabold text-lg text-slate-800">{assignment.faculty_id?.name}</p>
                                                        <span className={`inline-block mt-1 text-xs px-2 py-1 rounded font-bold uppercase tracking-wider ${assignment.role === 'Main' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                                                            {assignment.role} Faculty
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <p className="text-sm font-semibold text-slate-500 mb-1">Assigned Subject</p>
                                                <p className="font-bold text-slate-700">{assignment.subject_id?.name}</p>
                                                <p className="font-mono text-xs text-indigo-600 mt-1">{assignment.subject_id?.code}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-500 col-span-2 py-8 font-medium">No faculties assigned to this section yet.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'timetable' && (
                        <div className="animate-fade-in">
                            <h3 className="font-extrabold text-xl text-slate-800 mb-6 flex items-center gap-2">
                                <span className="w-2 h-6 bg-orange-500 rounded-full inline-block"></span>
                                Section Timetable
                            </h3>
                            <TimetableGrid userRole="Admin" sectionId={id} />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminSectionDetails;

