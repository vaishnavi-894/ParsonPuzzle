import React, { useState } from 'react';
import { assignmentAPI } from '../../services/api';
import { X, Send } from 'lucide-react';

export default function PublishPuzzleModal({ puzzle, onClose, onPublished }) {
    const [formData, setFormData] = useState({
        cohort_id: 'default-cohort', // Simplified: using a default cohort
        start_at: new Date().toISOString().slice(0, 16),
        end_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        max_attempts: 3,
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
                start_at: new Date(formData.start_at).toISOString(),
                end_at: new Date(formData.end_at).toISOString(),
                max_attempts: parseInt(formData.max_attempts),
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
                            <label>Start Date & Time</label>
                            <input
                                type="datetime-local"
                                className="input"
                                value={formData.start_at}
                                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>End Date & Time</label>
                            <input
                                type="datetime-local"
                                className="input"
                                value={formData.end_at}
                                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Maximum Attempts</label>
                            <input
                                type="number"
                                className="input"
                                min="1"
                                max="10"
                                value={formData.max_attempts}
                                onChange={(e) => setFormData({ ...formData, max_attempts: e.target.value })}
                                required
                            />
                        </div>

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
