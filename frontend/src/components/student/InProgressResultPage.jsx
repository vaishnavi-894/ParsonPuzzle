import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import './Student.css';

export default function InProgressResultPage({ attempt, blocks, totalTimeSec }) {
    const navigate = useNavigate();
    const { score, submitted_order, assignment_id: assignmentId } = attempt;
    const scorePct = Number.isFinite(score) ? Math.round(score * 100) : 0;

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
                        <h3>Correct Position</h3>
                        <div className="stat-value">{scorePct}%</div>
                    </div>
                    <div className="stat-card card">
                        <h3>Total Time</h3>
                        <div className="stat-value">{Math.floor(totalTimeSec / 60)}:{(totalTimeSec % 60).toString().padStart(2, '0')}</div>
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

                <div className="results-actions">
                    <button onClick={() => navigate('/student/puzzles')} className="btn btn-secondary btn-lg">
                        <Home size={18} />
                        Back to Puzzles
                    </button>
                    <button onClick={() => navigate(`/student/puzzle/${assignmentId}`)} className="btn btn-primary btn-lg">
                        <RotateCcw size={18} />
                        Try Again
                    </button>
                </div>
            </div>
        </div>
    );
}
