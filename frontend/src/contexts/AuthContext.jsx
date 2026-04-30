import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
            setUser(JSON.parse(savedUser));
            // Verify token is still valid
            authAPI.getMe()
                .then(response => {
                    setUser(response.data);
                    localStorage.setItem('user', JSON.stringify(response.data));
                })
                .catch(() => {
                    logout();
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        try {
            const response = await authAPI.login({ email, password });
            const { access_token, user: userData } = response.data;

            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);

            return { success: true, user: userData };
        } catch (error) {
            const isUnauthorized = error.response?.status === 401;
            return {
                success: false,
                error: isUnauthorized
                    ? 'Wrong password'
                    : (error.response?.data?.detail || 'Login failed')
            };
        }
    };

    const register = async (name, email, password, role) => {
        try {
            const response = await authAPI.register({ name, email, password, role });
            return { success: true, user: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.detail || 'Registration failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const isInstructor = () => {
        return user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';
    };

    const isStudent = () => {
        return user?.role === 'STUDENT';
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        isInstructor,
        isStudent,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
