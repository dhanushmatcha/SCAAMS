import React from 'react';

const FacultyAssignmentsTab = ({
    newAssignmentForm,
    setNewAssignmentForm,
    assignmentContext,
    getContextLabel,
    createAssignment,
    assignments
}) => {
    return (
        <div className="glass-card p-8 rounded-3xl bg-white/80 animate-fade-in">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Assignment Management</h2>
                    <p className="text-sm text-slate-500 mt-1">Create assignments only for your assigned section and subject context.</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2 mb-8">
                <div className="space-y-4 bg-slate-50 p-5 rounded-3xl border border-slate-200">
                    <h3 className="font-semibold text-slate-800">New Assignment</h3>
                    <label className="block text-sm text-slate-600">Section & Subject</label>
                    <select value={newAssignmentForm.contextId} onChange={(e) => setNewAssignmentForm(prev => ({ ...prev, contextId: e.target.value }))} className="w-full p-3 border rounded-2xl outline-none">
                        <option value="">Select your assignment context</option>
                        {assignmentContext.map(context => (
                            <option key={context._id} value={context._id}>{getContextLabel(context)}</option>
                        ))}
                    </select>

                    <input type="text" value={newAssignmentForm.title} onChange={(e) => setNewAssignmentForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Assignment Title" className="w-full p-3 border rounded-2xl outline-none" />
                    <textarea value={newAssignmentForm.description} onChange={(e) => setNewAssignmentForm(prev => ({ ...prev, description: e.target.value }))} rows="4" placeholder="Assignment Description" className="w-full p-3 border rounded-2xl outline-none"></textarea>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input type="number" value={newAssignmentForm.total_marks} onChange={(e) => setNewAssignmentForm(prev => ({ ...prev, total_marks: e.target.value }))} placeholder="Total Marks" className="w-full p-3 border rounded-2xl outline-none" />
                        <input type="date" value={newAssignmentForm.due_date} onChange={(e) => setNewAssignmentForm(prev => ({ ...prev, due_date: e.target.value }))} className="w-full p-3 border rounded-2xl outline-none" />
                        <select value={newAssignmentForm.type} onChange={(e) => setNewAssignmentForm(prev => ({ ...prev, type: e.target.value }))} className="w-full p-3 border rounded-2xl outline-none">
                            <option value="Assignment">Assignment</option>
                            <option value="Quiz">Quiz</option>
                            <option value="Test">Test</option>
                            <option value="Project">Project</option>
                            <option value="Exam">Exam</option>
                        </select>
                    </div>

                    <button onClick={createAssignment} className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-bold hover:bg-emerald-700 transition">Create Assignment</button>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800">Your Recent Assignments</h3>
                    <div className="space-y-4">
                        {assignments.map(assignment => (
                            <div key={assignment._id} className="border border-slate-200 rounded-2xl p-5 bg-white/80">
                                <div className="flex justify-between items-start gap-4 mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">{assignment.title}</h3>
                                        <p className="text-sm text-slate-600">{assignment.subject_id?.name} • {assignment.section_id?.name}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                        assignment.type === 'Exam' ? 'bg-red-100 text-red-700' :
                                        assignment.type === 'Quiz' ? 'bg-yellow-100 text-yellow-700' :
                                        assignment.type === 'Project' ? 'bg-purple-100 text-purple-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                        {assignment.type}
                                    </span>
                                </div>
                                <p className="text-slate-600 mb-4">{assignment.description}</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-500">
                                    <span>📅 Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'Not set'}</span>
                                    <span>📊 {assignment.total_marks} marks</span>
                                    <span>📝 {assignment.submissions?.length || 0} submissions</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {assignments.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <span className="text-6xl block mb-4">📚</span>
                    <p className="text-lg font-medium">No assignments created yet</p>
                    <p className="text-sm mt-2">Use the form above to create your first assignment.</p>
                </div>
            )}
        </div>
    );
};

export default FacultyAssignmentsTab;
