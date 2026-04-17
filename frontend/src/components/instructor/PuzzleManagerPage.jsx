import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { puzzleAPI } from '../../services/api';
import { Plus, BarChart3, Send, Sparkles, CalendarDays, Tags, Layers3 } from 'lucide-react';
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
                <div className="instructor-puzzle-gallery">
                    {puzzles.map((puzzle) => (
                        <article
                            key={puzzle.puzzle_id}
                            className={`instructor-puzzle-card card status-${puzzle.status?.toLowerCase()}`}
                        >
                            <div className="instructor-card-topline">
                                <span className={`badge badge-${getStatusColor(puzzle.status)}`}>
                                    {puzzle.status}
                                </span>
                                <span className={`badge badge-${getDifficultyColor(puzzle.difficulty)}`}>
                                    {puzzle.difficulty}
                                </span>
                            </div>

                            <div className="instructor-card-hero">
                                <div className="instructor-card-icon">
                                    <Sparkles size={18} />
                                </div>
                                <div>
                                    <h3>{puzzle.title}</h3>
                                    <p className="text-secondary">
                                        {puzzle.description}
                                    </p>
                                </div>
                            </div>

                            <div className="instructor-card-meta">
                                <div className="instructor-meta-pill">
                                    <CalendarDays size={14} />
                                    <span>{new Date(puzzle.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="instructor-meta-pill">
                                    <Layers3 size={14} />
                                    <span>{puzzle.status === 'PUBLISHED' ? 'Live to students' : 'Ready to publish'}</span>
                                </div>
                            </div>

                            <div className="instructor-card-tags">
                                <div className="instructor-tag-heading">
                                    <Tags size={14} />
                                    <span>Topics</span>
                                </div>
                                <div className="tags-cell">
                                    {puzzle.tags.length > 0 ? (
                                        <>
                                            {puzzle.tags.slice(0, 3).map((tag, index) => (
                                                <span key={index} className="badge badge-primary">
                                                    {tag}
                                                </span>
                                            ))}
                                            {puzzle.tags.length > 3 && (
                                                <span className="text-secondary">+{puzzle.tags.length - 3}</span>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-secondary">No tags yet</span>
                                    )}
                                </div>
                            </div>

                            <div className="instructor-card-actions">
                                {puzzle.status !== 'PUBLISHED' ? (
                                    <button
                                        onClick={() => setPublishingPuzzle(puzzle)}
                                        className="btn btn-primary"
                                        title="Publish to Students"
                                    >
                                        <Send size={16} />
                                        Publish
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
                                    Analytics
                                </Link>
                            </div>
                        </article>
                    ))}
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
