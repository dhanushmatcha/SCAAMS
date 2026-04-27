import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ErrorProvider, useError } from './context/ErrorContext';

import Login from './pages/Login';
import ForgotPassword from './components/ForgotPassword';
import AdminDashboard from './pages/AdminDashboard';
import AdminSectionDetails from './pages/AdminSectionDetails';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentDashboard from './pages/StudentDashboard';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />;

    return children;
};

const ErrorHandler = ({ children }) => {
    const { addError } = useError();

    useEffect(() => {
        const handleApiError = (event) => {
            const { message, type } = event.detail;
            addError(message, type);
        };

        window.addEventListener('apiError', handleApiError);
        return () => window.removeEventListener('apiError', handleApiError);
    }, [addError]);

    return children;
};

function App() {
    return (
        <ErrorProvider>
            <ErrorHandler>
                <AuthProvider>
                    <Router>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />

                            <Route path="/admin/*" element={
                                <ProtectedRoute allowedRoles={['Admin']}>
                                    <AdminDashboard />
                                </ProtectedRoute>
                            } />

                            <Route path="/admin/section/:id" element={
                                <ProtectedRoute allowedRoles={['Admin']}>
                                    <AdminSectionDetails />
                                </ProtectedRoute>
                            } />

                            <Route path="/faculty/*" element={
                                <ProtectedRoute allowedRoles={['Faculty']}>
                                    <FacultyDashboard />
                                </ProtectedRoute>
                            } />

                            <Route path="/student/*" element={
                                <ProtectedRoute allowedRoles={['Student']}>
                                    <StudentDashboard />
                                </ProtectedRoute>
                            } />

                            <Route path="/unauthorized" element={
                                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                                    <div className="glass-panel p-10 rounded-2xl text-center max-w-md animate-fade-in border-red-100">
                                        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                        </div>
                                        <h1 className="text-3xl font-bold text-slate-800 mb-2">Access Denied</h1>
                                        <p className="text-slate-500 mb-8">You don't have permission to access this page.</p>
                                        <button onClick={() => window.location.href = '/login'} className="btn-primary w-full shadow-red-500/20 from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700">Return to Login</button>
                                    </div>
                                </div>
                            } />

                            <Route path="*" element={<Navigate to="/login" replace />} />
                        </Routes>
                    </Router>
                </AuthProvider>
            </ErrorHandler>
        </ErrorProvider>
    );
}

export default App;
