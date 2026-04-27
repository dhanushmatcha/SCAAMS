import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = Cookies.get('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        
        // You can emit a custom event or use a global error handler here
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('apiError', { 
                detail: { message: errorMessage, type: 'error' } 
            }));
        }
        
        return Promise.reject(error);
    }
);

export default api;
