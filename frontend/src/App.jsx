import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';
import HomePage from './components/HomePage';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import PuzzleListPage from './components/student/PuzzleListPage';
import PuzzleSolvePage from './components/student/PuzzleSolvePage';
import ResultsPage from './components/student/ResultsPage';
import StudentProgressPage from './components/student/StudentProgressPage';
import PuzzleBuilderPage from './components/instructor/PuzzleBuilderPage';
import PuzzleManagerPage from './components/instructor/PuzzleManagerPage';
import InstructorAnalyticsPage from './components/instructor/InstructorAnalyticsPage';
import GlobalInstructorAnalyticsPage from './components/instructor/GlobalInstructorAnalyticsPage';

function AppRoutes() {
    const { user } = useAuth();

    return (
        <>
            <Navbar />
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={user ? <Navigate to={user.role === 'STUDENT' ? '/student/puzzles' : '/instructor/puzzles'} /> : <LoginPage />} />
                <Route path="/register" element={user ? <Navigate to={user.role === 'STUDENT' ? '/student/puzzles' : '/instructor/puzzles'} /> : <RegisterPage />} />
                <Route path="/" element={<HomePage />} />

                {/* Student routes */}
                <Route path="/student/puzzles" element={<ProtectedRoute><PuzzleListPage /></ProtectedRoute>} />
                <Route path="/student/puzzle/:assignmentId" element={<ProtectedRoute><PuzzleSolvePage /></ProtectedRoute>} />
                <Route path="/student/result/:attemptId" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
                <Route path="/student/progress" element={<ProtectedRoute><StudentProgressPage /></ProtectedRoute>} />

                {/* Instructor routes */}
                <Route path="/instructor/puzzles" element={<ProtectedRoute requireInstructor><PuzzleManagerPage /></ProtectedRoute>} />
                <Route path="/instructor/puzzle/new" element={<ProtectedRoute requireInstructor><PuzzleBuilderPage /></ProtectedRoute>} />
                <Route path="/instructor/analytics/:puzzleId" element={<ProtectedRoute requireInstructor><InstructorAnalyticsPage /></ProtectedRoute>} />
                <Route path="/instructor/analytics" element={<ProtectedRoute requireInstructor><GlobalInstructorAnalyticsPage /></ProtectedRoute>} />

                {/* Default redirect */}
                <Route path="*" element={<Navigate to="/" />} />
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
