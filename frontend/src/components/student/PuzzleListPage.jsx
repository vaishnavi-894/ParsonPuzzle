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

    const [filter, setFilter] = useState('ALL'); // ALL, COMPLETED, YET_TO_COMPLETE

    useEffect(() => {
        loadAssignments();
    }, []);

    const loadAssignments = async () => {
        try {
            const response = await assignmentAPI.getAll({
                active_only: false
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
                    In Progress
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
                            if (assignment.user_status === 'COMPLETED') {
                                try {
                                    const attemptsResponse = await attemptAPI.getAll({ assignment_id: assignment.assignment_id });
                                    const attempts = attemptsResponse.data;

                                    if (attempts && attempts.length > 0) {
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
                                                {assignment.user_status === 'YET_TO_COMPLETE' ? 'In Progress' :
                                                    assignment.user_status.replace(/_/g, ' ')}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="puzzle-description">
                                    <p className="text-secondary">
                                        {assignment.puzzle_description || 'No description available'}
                                    </p>
                                </div>

                                <div className="puzzle-card-meta">
                                    <div className="meta-item">
                                        <Trophy size={16} />
                                        <span>Attempts: {assignment.user_attempts_count || 0}</span>
                                    </div>
                                </div>

                                <div className="puzzle-card-footer">
                                    <span className="text-primary">
                                        {assignment.user_status === 'COMPLETED' ? 'Review Solution' : 'Start Puzzle →'}
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
