import React, { useState } from 'react';
import { assignmentAPI } from '../../services/api';
import { X, Send } from 'lucide-react';

export default function PublishPuzzleModal({ puzzle, onClose, onPublished }) {
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setPublishing(true);
        setError('');

        try {
            await assignmentAPI.create({
                puzzle_id: puzzle.puzzle_id,
                cohort_id: 'default-cohort',
            });

            onPublished();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to publish puzzle');
        } finally {
            setPublishing(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Publish Puzzle</h2>
                    <button onClick={onClose} className="btn btn-secondary">
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="publish-info">
                        <h3>{puzzle.title}</h3>
                        <p className="text-secondary">{puzzle.description}</p>
                    </div>

                    {error && (
                        <div className="alert alert-error">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="publish-form">
                        <div className="modal-actions">
                            <button type="button" onClick={onClose} className="btn btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={publishing}>
                                <Send size={18} />
                                {publishing ? 'Publishing...' : 'Publish to Students'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
