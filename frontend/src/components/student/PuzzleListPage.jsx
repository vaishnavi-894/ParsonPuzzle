import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { assignmentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, Trophy, AlertCircle } from 'lucide-react';
import './Student.css';

export default function PuzzleListPage() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        loadAssignments();
    }, []);

    const loadAssignments = async () => {
        try {
            const response = await assignmentAPI.getAll({
                active_only: true
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

            {assignments.length === 0 ? (
                <div className="empty-state card">
                    <Trophy size={48} className="text-secondary" />
                    <h3>No Puzzles Available</h3>
                    <p className="text-secondary">Check back later for new assignments</p>
                </div>
            ) : (
                <div className="puzzle-grid">
                    {assignments.map((assignment) => (
                        <Link
                            key={assignment.assignment_id}
                            to={`/student/puzzle/${assignment.assignment_id}`}
                            className="puzzle-card card"
                        >
                            <div className="puzzle-card-header">
                                <h3>{assignment.puzzle_title || 'Untitled Puzzle'}</h3>
                                <span className={`badge badge-${getDifficultyColor(assignment.puzzle_difficulty || 'MEDIUM')}`}>
                                    {assignment.puzzle_difficulty || 'MEDIUM'}
                                </span>
                            </div>

                            <div className="puzzle-description">
                                <p className="text-secondary">
                                    {assignment.puzzle_description || 'No description available'}
                                </p>
                            </div>

                            <div className="puzzle-card-meta">
                                <div className="meta-item">
                                    <Clock size={16} />
                                    <span>Due: {new Date(assignment.end_at).toLocaleDateString()}</span>
                                </div>
                                <div className="meta-item">
                                    <Trophy size={16} />
                                    <span>Max Attempts: {assignment.max_attempts}</span>
                                </div>
                            </div>

                            <div className="puzzle-card-footer">
                                <span className="text-primary">Start Puzzle →</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
