import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Home } from 'lucide-react';
import './Student.css';

export default function SuccessResultPage({ attempt, blocks, totalTimeSec }) {
    const navigate = useNavigate();
    const { score, time_taken_sec, attempt_number, submitted_order } = attempt;

    // Get correct order
    const correctOrder = [...blocks].sort((a, b) => a.correct_position - b.correct_position);

    return (
        <div className="page-container">
            <div className="results-container">
                <div className="results-header card success">
                    <CheckCircle size={64} className="text-success" />
                    <h1>Perfect! 🎉</h1>
                    <p>You solved the puzzle correctly!</p>
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
                        <div className="stat-value">#{attempt_number}</div>
                    </div>
                </div>

                {/* Show the correct solution */}
                <div className="solution-section card">
                    <h3>Correct Solution</h3>
                    <div className="solution-blocks">
                        {correctOrder.map((block, index) => (
                            <div key={block.block_id} className="solution-block correct">
                                <span className="block-number">{index + 1}</span>
                                <code>{block.text}</code>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="results-actions">
                    <button onClick={() => navigate('/student/puzzles')} className="btn btn-secondary btn-lg">
                        <Home size={18} />
                        Back to Puzzles
                    </button>
                </div>
            </div>
        </div>
    );
}
