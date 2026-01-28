import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsAPI } from '../../services/api';
import {
    Target,
    Loader2,
    AlertCircle,
    Layers,
    ChevronRight,
    Trophy,
    XCircle
} from 'lucide-react';
import './GlobalInstructorAnalyticsPage.css';
import '../student/StudentProgressPage.css'; // Reuse stat card styles

export default function GlobalInstructorAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await analyticsAPI.getInstructorSummary();
                setStats(response.data);
            } catch (err) {
                console.error('Failed to fetch instructor summary:', err);
                setError('Failed to load global analytics. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="global-analytics-container">
                <div className="loading-container">
                    <Loader2 className="animate-spin" size={48} />
                    <p>Aggregating global analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="global-analytics-container">
                <div className="error-container">
                    <AlertCircle size={48} color="var(--error-color)" />
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    // Defensive values to avoid NaN or empty display
    const totalPuzzles = stats?.total_puzzles ?? 0;
    const studentsSolved = stats?.students_solved ?? 0;
    const studentsFailed = stats?.students_failed ?? 0;
    const uniqueStudents = stats?.unique_students ?? 0;
    const overallSolveRate = stats?.overall_solve_rate ?? 0;

    return (
        <div className="global-analytics-container">
            <header className="progress-header">
                <h1>Instructor Dashboard</h1>
                <p>Global analytics across all your puzzles and students</p>
            </header>

            <div className="global-stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">
                        <Layers size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Total Puzzles</h3>
                        <div className="stat-value">{totalPuzzles}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <Trophy size={24} className="text-success" />
                    </div>
                    <div className="stat-info">
                        <h3>Students Solved</h3>
                        <div className="stat-value text-success">{studentsSolved}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <XCircle size={24} className="text-error" />
                    </div>
                    <div className="stat-info">
                        <h3>Not Completed</h3>
                        <div className="stat-value text-error">{studentsFailed}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <Target size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Global Solve Rate</h3>
                        <div className="stat-value">{(overallSolveRate * 100).toFixed(1)}%</div>
                    </div>
                </div>
            </div>

            <div className="performance-table-card">
                <h3>
                    <Trophy size={20} className="text-primary" />
                    Puzzle Performance Ranking
                </h3>
                <div className="overflow-x-auto">
                    <table className="p-table">
                        <thead>
                            <tr>
                                <th>Puzzle Title</th>
                                <th>Attempts</th>
                                <th>Solves</th>
                                <th>Needs Help</th>
                                <th>Success Rate</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.puzzle_performance && stats.puzzle_performance.length > 0 ? (
                                stats.puzzle_performance.map((puzzle) => (
                                    <tr key={puzzle.puzzle_id}>
                                        <td>
                                            <div className="font-semibold">{puzzle.title}</div>
                                        </td>
                                        <td>{puzzle.total_attempts}</td>
                                        <td><span className="text-success">{puzzle.solves}</span></td>
                                        <td><span className={puzzle.failures > 0 ? "text-error" : "text-secondary"}>{puzzle.failures}</span></td>
                                        <td>
                                            <div className="flex-center">
                                                <div className="progress-bar-small">
                                                    <div
                                                        className="progress-fill-small"
                                                        style={{ width: `${puzzle.success_rate * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span>{(puzzle.success_rate * 100).toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <Link
                                                to={`/instructor/analytics/${puzzle.puzzle_id}`}
                                                className="btn btn-secondary btn-sm flex-center"
                                            >
                                                Details
                                                <ChevronRight size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center text-secondary py-lg">
                                        No puzzle data available yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
