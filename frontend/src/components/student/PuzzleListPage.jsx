import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assignmentAPI, attemptAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, Trophy, AlertCircle } from 'lucide-react';
import './Student.css';

export default function PuzzleListPage() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    const [filter, setFilter] = useState('ALL'); // ALL, COMPLETED, YET_TO_COMPLETE, NOT_COMPLETED

    useEffect(() => {
        loadAssignments();
    }, []);

    const loadAssignments = async () => {
        try {
            const response = await assignmentAPI.getAll({
                active_only: false // We need all assignments to show completed/not completed ones too
            });
            console.log('Assignments response:', response.data);
            setAssignments(response.data);
        } catch (err) {
            console.error('Error loading assignments:', err);
            setError('Failed to load puzzles');
        } finally {
            setLoading(false);
        }
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'EASY': return 'success';
            case 'MEDIUM': return 'warning';
            case 'HARD': return 'error';
            default: return 'primary';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'success';
            case 'NOT_COMPLETED': return 'error';
            case 'YET_TO_COMPLETE': return 'primary';
            default: return 'secondary';
        }
    };

    const filteredAssignments = assignments.filter(assignment => {
        if (filter === 'ALL') return true;
        return assignment.user_status === filter;
    });

    if (loading) {
        return <div className="page-container"><div className="text-secondary">Loading puzzles...</div></div>;
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Available Puzzles</h1>
                <p className="text-secondary">Select a puzzle to start solving</p>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <div className="tabs-container">
                <button
                    className={`tab-btn ${filter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setFilter('ALL')}
                >
                    All
                </button>
                <button
                    className={`tab-btn ${filter === 'COMPLETED' ? 'active' : ''}`}
                    onClick={() => setFilter('COMPLETED')}
                >
                    Completed
                </button>
                <button
                    className={`tab-btn ${filter === 'YET_TO_COMPLETE' ? 'active' : ''}`}
                    onClick={() => setFilter('YET_TO_COMPLETE')}
                >
                    Yet to Complete
                </button>
                <button
                    className={`tab-btn ${filter === 'NOT_COMPLETED' ? 'active' : ''}`}
                    onClick={() => setFilter('NOT_COMPLETED')}
                >
                    Not Completed
                </button>
            </div>

            {filteredAssignments.length === 0 ? (
                <div className="empty-state card">
                    <Trophy size={48} className="text-secondary" />
                    <h3>No Puzzles Found</h3>
                    <p className="text-secondary">No assignments match the selected filter</p>
                </div>
            ) : (
                <div className="puzzle-grid">
                    {filteredAssignments.map((assignment) => {
                        const handleCardClick = async () => {
                            if (assignment.user_status === 'COMPLETED' || assignment.user_status === 'NOT_COMPLETED') {
                                // Fetch the most recent attempt to show results
                                try {
                                    const attemptsResponse = await attemptAPI.getAll({ assignment_id: assignment.assignment_id });
                                    const attempts = attemptsResponse.data;

                                    if (attempts && attempts.length > 0) {
                                        // Find the most recent completed attempt
                                        const completedAttempt = attempts
                                            .filter(a => a.submitted_at)
                                            .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0];

                                        if (completedAttempt) {
                                            navigate(`/student/result/${completedAttempt.attempt_id}`);
                                            return;
                                        }
                                    }
                                } catch (err) {
                                    console.error('Failed to fetch attempts:', err);
                                }
                            }

                            // Default: navigate to solve page
                            navigate(`/student/puzzle/${assignment.assignment_id}`);
                        };

                        return (
                            <div
                                key={assignment.assignment_id}
                                onClick={handleCardClick}
                                className={`puzzle-card card ${assignment.user_status?.toLowerCase().replace(/_/g, '-')}`}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="puzzle-card-header">
                                    <h3>{assignment.puzzle_title || 'Untitled Puzzle'}</h3>
                                    <div className="badges-row">
                                        <span className={`badge badge-${getDifficultyColor(assignment.puzzle_difficulty || 'MEDIUM')}`}>
                                            {assignment.puzzle_difficulty || 'MEDIUM'}
                                        </span>
                                        {assignment.user_status && (
                                            <span className={`badge badge-${getStatusColor(assignment.user_status)}`}>
                                                {assignment.user_status.replace(/_/g, ' ')}
                                            </span>
                                        )}
                                        {(() => {
                                            // Only show EXPIRED if the backend marked it as NOT_COMPLETED due to deadline
                                            if (assignment.user_status === 'NOT_COMPLETED') {
                                                const attempts = assignment.user_attempts_count || 0;
                                                const maxAttempts = assignment.max_attempts || 3;

                                                // If max attempts reached, don't show EXPIRED (show attempts exhausted message)
                                                if (attempts < maxAttempts) {
                                                    return <span className="badge badge-error">EXPIRED</span>;
                                                }
                                            } else if (assignment.user_status === 'YET_TO_COMPLETE') {
                                                // Show deadline warning for incomplete assignments
                                                const now = new Date();
                                                const deadline = new Date(assignment.end_at);
                                                const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);

                                                if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 24) {
                                                    return <span className="badge badge-warning">DEADLINE SOON</span>;
                                                }
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>

                                <div className="puzzle-description">
                                    <p className="text-secondary">
                                        {assignment.puzzle_description || 'No description available'}
                                    </p>
                                </div>

                                <div className="puzzle-card-meta">
                                    <div className="meta-item">
                                        <Clock size={16} />
                                        <span>Due: {new Date(assignment.end_at).toLocaleString()}</span>
                                    </div>
                                    <div className="meta-item">
                                        <Trophy size={16} />
                                        <span>Max Attempts: {assignment.max_attempts}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span>Attempts: {assignment.user_attempts_count || 0}</span>
                                    </div>
                                </div>

                                <div className="puzzle-card-footer">
                                    <span className="text-primary">
                                        {assignment.user_status === 'COMPLETED' ? 'Review Solution' :
                                            assignment.user_status === 'NOT_COMPLETED' ? 'View Solution' :
                                                'Start Puzzle →'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
