import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsAPI } from '../../services/api';
import {
    Trophy,
    Target,
    Clock,
    Zap,
    BarChart3,
    TrendingUp,
    AlertCircle,
    Loader2
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './StudentProgressPage.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

export default function StudentProgressPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await analyticsAPI.getStudentProgress(user.user_id);
                setStats(response.data);
            } catch (err) {
                console.error('Failed to fetch stats:', err);
                setError('Failed to load your progress data. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        if (user?.user_id) {
            fetchStats();
        }
    }, [user?.user_id]);

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

    const lineChartData = {
        labels: stats.recent_trends.map((_, index) => `Attempt ${index + 1}`),
        datasets: [
            {
                label: 'Time Taken (sec)',
                data: stats.recent_trends.map(t => t.time_sec),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                yAxisID: 'y',
            },
            {
                label: 'Score (%)',
                data: stats.recent_trends.map(t => t.score * 100),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.5)',
                yAxisID: 'y1',
            }
        ],
    };

    const lineChartOptions = {
        responsive: true,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        stacked: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#94a3b8'
                }
            },
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)'
                },
                ticks: { color: '#94a3b8' }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: {
                    drawOnChartArea: false,
                },
                ticks: { color: '#94a3b8' },
                min: 0,
                max: 100
            },
            x: {
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)'
                },
                ticks: { color: '#94a3b8' }
            }
        },
    };

    return (
        <div className="progress-container">
            <header className="progress-header">
                <h1>My Progress</h1>
                <p>Track your learning journey and puzzle performance</p>
            </header>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">
                        <Trophy size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Puzzles Completed</h3>
                        <div className="stat-value">{stats.completed_puzzles} / {stats.total_puzzles}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <Target size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Average Score</h3>
                        <div className="stat-value">{(stats.average_score * 100).toFixed(1)}%</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <Zap size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Total Attempts</h3>
                        <div className="stat-value">{stats.total_attempts}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <Clock size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Completion Rate</h3>
                        <div className="stat-value">{(stats.completion_rate * 100).toFixed(1)}%</div>
                    </div>
                </div>
            </div>

            <div className="charts-grid">
                <div className="chart-card">
                    <h3>
                        <BarChart3 size={20} />
                        Difficulty Breakdown
                    </h3>
                    <div className="difficulty-bars">
                        {Object.entries(stats.difficulty_breakdown).map(([diff, data]) => {
                            const percent = data.total > 0 ? (data.completed / data.total) * 100 : 0;
                            return (
                                <div key={diff} className="diff-item">
                                    <div className="diff-label">
                                        <span>{diff}</span>
                                        <span>{data.completed}/{data.total} ({percent.toFixed(0)}%)</span>
                                    </div>
                                    <div className="bar-bg">
                                        <div
                                            className={`bar-fill ${diff.toLowerCase()}`}
                                            style={{ width: `${percent}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="chart-card">
                    <h3>
                        <TrendingUp size={20} />
                        Performance Trends
                    </h3>
                    {stats.recent_trends.length > 0 ? (
                        <Line data={lineChartData} options={lineChartOptions} />
                    ) : (
                        <div className="no-data">No recent attempts yet. Start solving to see trends!</div>
                    )}
                </div>
            </div>

            <div className="chart-card">
                <h3>
                    <Zap size={20} />
                    Top Topics
                </h3>
                <div className="tags-list">
                    {stats.top_tags.length > 0 ? stats.top_tags.map(tag => (
                        <div key={tag.tag} className="tag-badge">
                            <span className="tag-name">{tag.tag}</span>
                            <span className="tag-count">{tag.count} solved</span>
                        </div>
                    )) : (
                        <div className="no-data">Solve puzzles to see your top topics!</div>
                    )}
                </div>
            </div>
        </div>
    );
}
