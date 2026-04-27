import React, { createContext, useContext, useState } from 'react';

const ErrorContext = createContext();

export const useError = () => {
    const context = useContext(ErrorContext);
    if (!context) {
        throw new Error('useError must be used within an ErrorProvider');
    }
    return context;
};

export const ErrorProvider = ({ children }) => {
    const [errors, setErrors] = useState([]);

    const addError = (message, type = 'error') => {
        const id = Date.now() + Math.random();
        const newError = {
            id,
            message,
            type,
            timestamp: new Date()
        };
        
        setErrors(prev => [...prev, newError]);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            removeError(id);
        }, 5000);
    };

    const removeError = (id) => {
        setErrors(prev => prev.filter(error => error.id !== id));
    };

    const clearErrors = () => {
        setErrors([]);
    };

    const value = {
        errors,
        addError,
        removeError,
        clearErrors
    };

    return (
        <ErrorContext.Provider value={value}>
            {children}
            <ErrorDisplay errors={errors} removeError={removeError} />
        </ErrorContext.Provider>
    );
};

const ErrorDisplay = ({ errors, removeError }) => {
    if (errors.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {errors.map(error => (
                <div
                    key={error.id}
                    className={`px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 transform transition-all duration-300 animate-slide-in-right max-w-md ${
                        error.type === 'success' ? 'bg-emerald-600 text-white' :
                        error.type === 'warning' ? 'bg-amber-500 text-white' :
                        error.type === 'info' ? 'bg-blue-500 text-white' :
                        'bg-red-500 text-white'
                    }`}
                >
                    <span className="text-xl flex-shrink-0">
                        {error.type === 'success' ? '✅' :
                         error.type === 'warning' ? '⚠️' :
                         error.type === 'info' ? 'ℹ️' :
                         '❌'}
                    </span>
                    <div className="flex-1">
                        <p className="font-bold text-sm">{error.message}</p>
                        <p className="text-xs opacity-75">
                            {error.timestamp.toLocaleTimeString()}
                        </p>
                    </div>
                    <button
                        onClick={() => removeError(error.id)}
                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ErrorProvider;
