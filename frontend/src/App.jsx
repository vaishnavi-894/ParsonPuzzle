import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import PuzzleListPage from './components/student/PuzzleListPage';
import PuzzleSolvePage from './components/student/PuzzleSolvePage';
import ResultsPage from './components/student/ResultsPage';
import PuzzleBuilderPage from './components/instructor/PuzzleBuilderPage';
import PuzzleManagerPage from './components/instructor/PuzzleManagerPage';

function AppRoutes() {
    const { user } = useAuth();

    return (
        <>
            <Navbar />
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={user ? <Navigate to={user.role === 'STUDENT' ? '/student/puzzles' : '/instructor/puzzles'} /> : <LoginPage />} />
                <Route path="/register" element={user ? <Navigate to={user.role === 'STUDENT' ? '/student/puzzles' : '/instructor/puzzles'} /> : <RegisterPage />} />

                {/* Student routes */}
                <Route path="/student/puzzles" element={<ProtectedRoute><PuzzleListPage /></ProtectedRoute>} />
                <Route path="/student/puzzle/:assignmentId" element={<ProtectedRoute><PuzzleSolvePage /></ProtectedRoute>} />
                <Route path="/student/result/:attemptId" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />

                {/* Instructor routes */}
                <Route path="/instructor/puzzles" element={<ProtectedRoute requireInstructor><PuzzleManagerPage /></ProtectedRoute>} />
                <Route path="/instructor/puzzle/new" element={<ProtectedRoute requireInstructor><PuzzleBuilderPage /></ProtectedRoute>} />

                {/* Default redirect */}
                <Route path="/" element={<Navigate to={user ? (user.role === 'STUDENT' ? '/student/puzzles' : '/instructor/puzzles') : '/login'} />} />
            </Routes>
        </>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}

export default App;
