import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { puzzleAPI } from '../../services/api';
import { Plus, Edit, Trash2, BarChart3, Send } from 'lucide-react';
import PublishPuzzleModal from './PublishPuzzleModal';
import './Instructor.css';
import './PublishModal.css';

export default function PuzzleManagerPage() {
    const [puzzles, setPuzzles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [publishingPuzzle, setPublishingPuzzle] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        loadPuzzles();
    }, []);

    const loadPuzzles = async () => {
        try {
            const response = await puzzleAPI.getMyPuzzles();
            setPuzzles(response.data);
        } catch (err) {
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
            case 'PUBLISHED': return 'success';
            case 'DRAFT': return 'warning';
            case 'ARCHIVED': return 'error';
            default: return 'primary';
        }
    };

    if (loading) {
        return <div className="page-container"><div className="text-secondary">Loading puzzles...</div></div>;
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>My Puzzles</h1>
                    <p className="text-secondary">Manage your created puzzles</p>
                </div>
                <Link to="/instructor/puzzle/new" className="btn btn-primary btn-lg">
                    <Plus size={18} />
                    Create Puzzle
                </Link>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="alert alert-success">
                    {successMessage}
                </div>
            )}

            {puzzles.length === 0 ? (
                <div className="empty-state card">
                    <Plus size={48} className="text-secondary" />
                    <h3>No Puzzles Yet</h3>
                    <p className="text-secondary">Create your first puzzle to get started</p>
                    <Link to="/instructor/puzzle/new" className="btn btn-primary">
                        <Plus size={18} />
                        Create Puzzle
                    </Link>
                </div>
            ) : (
                <div className="puzzles-table card">
                    <table>
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Difficulty</th>
                                <th>Status</th>
                                <th>Tags</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {puzzles.map((puzzle) => (
                                <tr key={puzzle.puzzle_id}>
                                    <td>
                                        <div className="puzzle-title">{puzzle.title}</div>
                                        <div className="puzzle-description text-secondary">
                                            {puzzle.description.substring(0, 60)}...
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge badge-${getDifficultyColor(puzzle.difficulty)}`}>
                                            {puzzle.difficulty}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge badge-${getStatusColor(puzzle.status)}`}>
                                            {puzzle.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="tags-cell">
                                            {puzzle.tags.slice(0, 2).map((tag, index) => (
                                                <span key={index} className="badge badge-primary">
                                                    {tag}
                                                </span>
                                            ))}
                                            {puzzle.tags.length > 2 && (
                                                <span className="text-secondary">+{puzzle.tags.length - 2}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{new Date(puzzle.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="table-actions">
                                            {puzzle.status !== 'PUBLISHED' ? (
                                                <button
                                                    onClick={() => setPublishingPuzzle(puzzle)}
                                                    className="btn btn-primary"
                                                    title="Publish to Students"
                                                >
                                                    <Send size={16} />
                                                </button>
                                            ) : (
                                                <span className="badge badge-success">Published</span>
                                            )}
                                            <Link
                                                to={`/instructor/analytics/${puzzle.puzzle_id}`}
                                                className="btn btn-secondary"
                                                title="View Analytics"
                                            >
                                                <BarChart3 size={16} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {publishingPuzzle && (
                <PublishPuzzleModal
                    puzzle={publishingPuzzle}
                    onClose={() => setPublishingPuzzle(null)}
                    onPublished={() => {
                        setPublishingPuzzle(null);
                        setSuccessMessage('✅ Puzzle published successfully! Students can now see it.');
                        setTimeout(() => setSuccessMessage(''), 5000);
                        loadPuzzles();
                    }}
                />
            )}
        </div>
    );
}
