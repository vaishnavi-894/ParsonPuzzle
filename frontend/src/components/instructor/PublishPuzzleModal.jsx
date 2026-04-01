import React, { useState } from 'react';
import { assignmentAPI } from '../../services/api';
import { X, Send } from 'lucide-react';

export default function PublishPuzzleModal({ puzzle, onClose, onPublished }) {
    const [formData, setFormData] = useState({
        cohort_id: 'default-cohort', // Simplified: using a default cohort
        feedback_mode: 'IMMEDIATE'
    });

    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setPublishing(true);
        setError('');

        try {
            await assignmentAPI.create({
                puzzle_id: puzzle.puzzle_id,
                cohort_id: formData.cohort_id,
                feedback_mode: formData.feedback_mode
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
                        <div className="form-group">
                            <label>Feedback Mode</label>
                            <select
                                className="input"
                                value={formData.feedback_mode}
                                onChange={(e) => setFormData({ ...formData, feedback_mode: e.target.value })}
                            >
                                <option value="IMMEDIATE">Immediate</option>
                                <option value="DELAYED">Delayed</option>
                            </select>
                        </div>

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
