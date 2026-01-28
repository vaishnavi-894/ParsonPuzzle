import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { analyticsAPI, puzzleAPI } from '../../services/api';
import {
    Target,
    Clock,
    ArrowLeft,
    AlertCircle,
    Loader2,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import './Instructor.css';

export default function InstructorAnalyticsPage() {
    const { puzzleId } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [puzzle, setPuzzle] = useState(null);
    const [blocksMap, setBlocksMap] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, puzzleRes, blocksRes] = await Promise.all([
                    analyticsAPI.getPuzzleAnalytics(puzzleId),
                    puzzleAPI.getById(puzzleId),
                    puzzleAPI.getBlocks(puzzleId)
                ]);
                setStats(statsRes.data);
                setPuzzle(puzzleRes.data);

                // Create a mapping of block_id to block text
                const mapping = {};
                blocksRes.data.forEach(block => {
                    mapping[block.block_id] = block.text;
                });
                setBlocksMap(mapping);
            } catch (err) {
                console.error('Failed to fetch instructor analytics:', err);
                setError('Failed to load analytics data. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        if (puzzleId) {
            fetchData();
        }
    }, [puzzleId]);

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-container">
                    <Loader2 className="animate-spin" size={48} />
                    <p>Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container">
                <div className="error-container">
                    <AlertCircle size={48} color="var(--error-color)" />
                    <p>{error}</p>
                    <Link to="/instructor/puzzles" className="btn btn-secondary mt-md">
                        <ArrowLeft size={18} />
                        Back to Puzzles
                    </Link>
                </div>
            </div>
        );
    }

    // Defensive values to avoid NaN or empty display
    const studentsSolved = stats?.students_solved ?? 0;
    const studentsFailed = stats?.students_failed ?? 0;
    const solveRate = stats?.student_solve_rate ?? 0;
    const avgTime = stats?.average_time_sec ?? 0;

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <Link to="/instructor/puzzles" className="text-secondary flex items-center gap-xs mb-sm">
                        <ArrowLeft size={14} />
                        Back to Puzzles
                    </Link>
                    <h1>Analytics: {puzzle.title}</h1>
                    <p className="text-secondary">Comprehensive performance data for this puzzle</p>
                </div>
            </div>

            <div className="analytics-grid">
                <div className="card analytics-card">
                    <div className="analytics-label">Students Solved</div>
                    <div className="analytics-value text-success">{studentsSolved}</div>
                    <CheckCircle2 size={24} className="text-success mx-auto" />
                </div>

                <div className="card analytics-card">
                    <div className="analytics-label">Not Completed Yet</div>
                    <div className="analytics-value text-error">{studentsFailed}</div>
                    <XCircle size={24} className="text-error mx-auto" />
                </div>

                <div className="card analytics-card">
                    <div className="analytics-label">Solve rate</div>
                    <div className="analytics-value">{(solveRate * 100).toFixed(1)}%</div>
                    <Target size={24} className="text-secondary mx-auto" />
                </div>

                <div className="card analytics-card">
                    <div className="analytics-label">Avg. Solve Time</div>
                    <div className="analytics-value">{avgTime}s</div>
                    <Clock size={24} className="text-secondary mx-auto" />
                </div>
            </div>

            <div className="mt-xl">
                <div className="card p-xl">
                    <h3 className="mb-lg flex items-center gap-sm">
                        <AlertCircle size={20} className="text-error" />
                        Common Mistakes
                    </h3>
                    <div className="common-errors">
                        {stats.common_errors && stats.common_errors.length > 0 ? (
                            stats.common_errors.map((error, idx) => (
                                <div key={idx} className="error-item bg-tertiary p-md mb-md border-radius-md border">
                                    <div className="flex justify-between items-center mb-sm">
                                        <span className="badge badge-error">Pattern {idx + 1}</span>
                                        <span className="text-secondary">{error.count} occurrences</span>
                                    </div>
                                    <div className="code-snippet font-mono text-sm">
                                        {error.pattern.split(',').map((blockId, i) => (
                                            <div key={i} className="mb-xs p-xs bg-dark-soft border-radius-sm">
                                                {blocksMap[blockId] || blockId}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-secondary text-center py-xl">No common mistakes identified yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
