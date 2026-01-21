import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptAPI } from '../../services/api';
import { CheckCircle, XCircle, RotateCcw, Home } from 'lucide-react';
import './Student.css';

export default function ResultsPage() {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const [attempt, setAttempt] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAttempt();
    }, [attemptId]);

    const loadAttempt = async () => {
        try {
            const response = await attemptAPI.getById(attemptId);
            setAttempt(response.data);
        } catch (err) {
            console.error('Failed to load attempt');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="page-container"><div className="text-secondary">Loading results...</div></div>;
    }

    if (!attempt) {
        return <div className="page-container"><div className="text-error">Attempt not found</div></div>;
    }

    const { is_correct, score, feedback, time_taken_sec, attempt_number } = attempt;

    return (
        <div className="page-container">
            <div className="results-container">
                <div className={`results-header card ${is_correct ? 'success' : 'error'}`}>
                    {is_correct ? (
                        <>
                            <CheckCircle size={64} className="text-success" />
                            <h1>Perfect! 🎉</h1>
                            <p>You solved the puzzle correctly!</p>
                        </>
                    ) : (
                        <>
                            <XCircle size={64} className="text-error" />
                            <h1>Not Quite Right</h1>
                            <p>Keep trying, you're getting closer!</p>
                        </>
                    )}
                </div>

                <div className="results-stats">
                    <div className="stat-card card">
                        <h3>Score</h3>
                        <div className="stat-value">{Math.round(score * 100)}%</div>
                    </div>
                    <div className="stat-card card">
                        <h3>Time Taken</h3>
                        <div className="stat-value">{Math.floor(time_taken_sec / 60)}:{(time_taken_sec % 60).toString().padStart(2, '0')}</div>
                    </div>
                    <div className="stat-card card">
                        <h3>Attempt</h3>
                        <div className="stat-value">#{attempt_number}</div>
                    </div>
                </div>

                {feedback && !is_correct && (
                    <div className="feedback-section card">
                        <h3>Feedback</h3>
                        {feedback.message && <p>{feedback.message}</p>}
                        {feedback.hints && feedback.hints.length > 0 && (
                            <div className="hints">
                                <h4>Hints:</h4>
                                <ul>
                                    {feedback.hints.map((hint, index) => (
                                        <li key={index}>{hint}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {feedback.mismatches && feedback.mismatches.length > 0 && (
                            <div className="mismatches">
                                <p className="text-secondary">
                                    {feedback.mismatches.length} block(s) in incorrect positions
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <div className="results-actions">
                    <button onClick={() => navigate('/student/puzzles')} className="btn btn-secondary btn-lg">
                        <Home size={18} />
                        Back to Puzzles
                    </button>
                    {!is_correct && (
                        <button onClick={() => navigate(-2)} className="btn btn-primary btn-lg">
                            <RotateCcw size={18} />
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
