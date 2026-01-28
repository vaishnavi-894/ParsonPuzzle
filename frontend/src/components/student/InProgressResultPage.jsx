import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import './Student.css';

export default function InProgressResultPage({ attempt, blocks, totalTimeSec, remainingAttempts, maxAttempts }) {
    const navigate = useNavigate();
    const { score, time_taken_sec, attempt_number, submitted_order, feedback } = attempt;

    // Create a map for easy block lookup
    const blockMap = {};
    blocks.forEach(block => {
        blockMap[block.block_id] = block;
    });

    // Get user's submitted order
    const userOrder = submitted_order ? submitted_order.map(id => blockMap[id]).filter(Boolean) : [];

    return (
        <div className="page-container">
            <div className="results-container">
                <div className="results-header card in-progress">
                    <AlertCircle size={64} className="text-warning" />
                    <h1>Keep Trying! 💪</h1>
                    <p>You're learning - try again!</p>
                </div>

                <div className="results-stats">
                    <div className="stat-card card">
                        <h3>Score</h3>
                        <div className="stat-value">{Math.round(score * 100)}%</div>
                    </div>
                    <div className="stat-card card">
                        <h3>Total Time</h3>
                        <div className="stat-value">{Math.floor(totalTimeSec / 60)}:{(totalTimeSec % 60).toString().padStart(2, '0')}</div>
                    </div>
                    <div className="stat-card card">
                        <h3>Attempt</h3>
                        <div className="stat-value">#{attempt_number} of {maxAttempts}</div>
                    </div>
                    <div className="stat-card card">
                        <h3>Remaining</h3>
                        <div className="stat-value remaining-attempts">{remainingAttempts}</div>
                    </div>
                </div>

                {/* Show user's submission with highlighting */}
                {userOrder.length > 0 && (
                    <div className="solution-section card">
                        <h3>Your Submission</h3>
                        <p className="text-secondary">Green = Correct Position | Red = Wrong Position</p>
                        <div className="solution-blocks">
                            {userOrder.map((block, index) => {
                                const isCorrectPosition = block.correct_position === index;
                                return (
                                    <div key={block.block_id} className={`solution-block ${isCorrectPosition ? 'correct' : 'incorrect'}`}>
                                        <span className="block-number">{index + 1}</span>
                                        <code>{block.text}</code>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Feedback section */}
                {feedback && (
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
                    <button onClick={() => navigate(-2)} className="btn btn-primary btn-lg">
                        <RotateCcw size={18} />
                        Try Again ({remainingAttempts} left)
                    </button>
                </div>
            </div>
        </div>
    );
}
