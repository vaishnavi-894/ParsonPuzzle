import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { assignmentAPI, attemptAPI } from '../../services/api';
import {
    Trophy,
    Target,
    Clock,
    Zap,
    TrendingUp,
    AlertCircle,
    Loader2,
    ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './StudentProgressPage.css';

export default function StudentProgressPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [puzzleStats, setPuzzleStats] = useState([]);

    useEffect(() => {
        const fetchPuzzleStats = async () => {
            try {
                // Get all assignments for the student
                const assignmentsResponse = await assignmentAPI.getAll({ active_only: false });
                const assignments = assignmentsResponse.data;

                // For each assignment, fetch attempts and calculate stats
                const statsPromises = assignments.map(async (assignment) => {
                    try {
                        const attemptsResponse = await attemptAPI.getAll({
                            assignment_id: assignment.assignment_id
                        });
                        const attempts = attemptsResponse.data || [];

                        // Calculate stats for this puzzle
                        const submittedAttempts = attempts.filter(a => a.submitted_at);
                        const totalAttempts = submittedAttempts.length;
                        const isCompleted = submittedAttempts.some(a => a.is_correct);
                        const bestScore = submittedAttempts.length > 0
                            ? Math.max(...submittedAttempts.map(a => a.score || 0))
                            : 0;
                        const avgTime = submittedAttempts.length > 0
                            ? submittedAttempts.reduce((sum, a) => sum + (a.time_taken_sec || 0), 0) / submittedAttempts.length
                            : 0;

                        return {
                            assignment_id: assignment.assignment_id,
                            puzzle_id: assignment.puzzle_id,
                            title: assignment.puzzle_title || 'Untitled Puzzle',
                            difficulty: assignment.puzzle_difficulty || 'MEDIUM',
                            description: assignment.puzzle_description || '',
                            totalAttempts,
                            isCompleted,
                            bestScore,
                            avgTime,
                            attempts: submittedAttempts
                        };
                    } catch (err) {
                        console.error(`Failed to fetch attempts for ${assignment.assignment_id}:`, err);
                        return null;
                    }
                });

                const stats = (await Promise.all(statsPromises)).filter(s => s !== null);
                setPuzzleStats(stats);
            } catch (err) {
                console.error('Failed to fetch puzzle stats:', err);
                setError('Failed to load your progress data. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        if (user?.user_id) {
            fetchPuzzleStats();
        }
    }, [user?.user_id]);

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'EASY': return 'success';
            case 'MEDIUM': return 'warning';
            case 'HARD': return 'error';
            default: return 'primary';
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="loading-container">
                <Loader2 className="animate-spin" size={48} />
                <p>Loading your progress...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <AlertCircle size={48} color="var(--error-color)" />
                <p>{error}</p>
            </div>
        );
    }

    // Calculate summary stats
    const totalPuzzles = puzzleStats.length;
    const completedPuzzles = puzzleStats.filter(p => p.isCompleted).length;
    const totalAttempts = puzzleStats.reduce((sum, p) => sum + p.totalAttempts, 0);
    const avgScore = totalAttempts > 0
        ? puzzleStats.reduce((sum, p) => sum + p.bestScore, 0) / totalPuzzles
        : 0;

    return (
        <div className="progress-container">
            <header className="progress-header">
                <h1>My Progress</h1>
                <p>Track your performance on each puzzle</p>
            </header>

            {/* Summary Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">
                        <Trophy size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Puzzles Completed</h3>
                        <div className="stat-value">{completedPuzzles} / {totalPuzzles}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <Target size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Average Best Score</h3>
                        <div className="stat-value">{(avgScore * 100).toFixed(1)}%</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <Zap size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Total Attempts</h3>
                        <div className="stat-value">{totalAttempts}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <Clock size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Completion Rate</h3>
                        <div className="stat-value">
                            {totalPuzzles > 0 ? ((completedPuzzles / totalPuzzles) * 100).toFixed(1) : 0}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Per-Puzzle Breakdown */}
            <div className="puzzle-breakdown-section">
                <h2>📊 Per-Puzzle Performance</h2>
                <div className="puzzle-list">
                    {puzzleStats.length === 0 ? (
                        <div className="no-data">No puzzles assigned yet. Check back later!</div>
                    ) : (
                        puzzleStats.map((puzzle) => (
                            <div
                                key={puzzle.assignment_id}
                                className={`puzzle-stat-card ${puzzle.isCompleted ? 'completed' : 'in-progress'}`}
                                onClick={() => navigate(`/student/puzzle/${puzzle.assignment_id}`)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="puzzle-stat-header">
                                    <div>
                                        <h3>{puzzle.title}</h3>
                                        <div className="puzzle-badges">
                                            <span className={`badge badge-${getDifficultyColor(puzzle.difficulty)}`}>
                                                {puzzle.difficulty}
                                            </span>
                                            {puzzle.isCompleted ? (
                                                <span className="badge badge-success">✓ Completed</span>
                                            ) : puzzle.totalAttempts > 0 ? (
                                                <span className="badge badge-primary">In Progress</span>
                                            ) : (
                                                <span className="badge badge-secondary">Not Started</span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="chevron-icon" />
                                </div>

                                <div className="puzzle-stat-metrics">
                                    <div className="metric">
                                        <div className="metric-icon">
                                            <Zap size={16} />
                                        </div>
                                        <div className="metric-info">
                                            <span className="metric-label">Attempts</span>
                                            <span className="metric-value">{puzzle.totalAttempts}</span>
                                        </div>
                                    </div>

                                    <div className="metric">
                                        <div className="metric-icon">
                                            <Target size={16} />
                                        </div>
                                        <div className="metric-info">
                                            <span className="metric-label">Best Score</span>
                                            <span className="metric-value">
                                                {puzzle.totalAttempts > 0
                                                    ? `${(puzzle.bestScore * 100).toFixed(0)}%`
                                                    : '-'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="metric">
                                        <div className="metric-icon">
                                            <Clock size={16} />
                                        </div>
                                        <div className="metric-info">
                                            <span className="metric-label">Avg Time</span>
                                            <span className="metric-value">
                                                {puzzle.totalAttempts > 0
                                                    ? formatTime(puzzle.avgTime)
                                                    : '-'}
                                            </span>
                                        </div>
                                    </div>

                                    {puzzle.totalAttempts > 1 && (
                                        <div className="metric">
                                            <div className="metric-icon">
                                                <TrendingUp size={16} />
                                            </div>
                                            <div className="metric-info">
                                                <span className="metric-label">Trend</span>
                                                <span className="metric-value">
                                                    {puzzle.attempts.length >= 2 ? (
                                                        puzzle.attempts[puzzle.attempts.length - 1].score >
                                                            puzzle.attempts[0].score ? '📈' : '📉'
                                                    ) : '-'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
