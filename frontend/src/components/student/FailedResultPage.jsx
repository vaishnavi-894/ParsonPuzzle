import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, Home, BookOpen } from 'lucide-react';
import './Student.css';

export default function FailedResultPage({ attempt, blocks, totalTimeSec, totalAttempts }) {
    const navigate = useNavigate();
    const { score, time_taken_sec, attempt_number, submitted_order } = attempt;

    // Create a map for easy block lookup
    const blockMap = {};
    blocks.forEach(block => {
        blockMap[block.block_id] = block;
    });

    // Get correct order
    const correctOrder = [...blocks].sort((a, b) => a.correct_position - b.correct_position);

    // Get user's submitted order
    const userOrder = submitted_order ? submitted_order.map(id => blockMap[id]).filter(Boolean) : [];

    return (
        <div className="page-container">
            <div className="results-container">
                <div className="results-header card failed">
                    <XCircle size={64} className="text-error" />
                    <h1>All Attempts Used</h1>
                    <p>Let's learn from this - review the correct solution below</p>
                </div>

                <div className="results-stats">
                    <div className="stat-card card">
                        <h3>Best Score</h3>
                        <div className="stat-value">{Math.round(score * 100)}%</div>
                    </div>
                    <div className="stat-card card">
                        <h3>Total Time</h3>
                        <div className="stat-value">{Math.floor(totalTimeSec / 60)}:{(totalTimeSec % 60).toString().padStart(2, '0')}</div>
                    </div>
                    <div className="stat-card card">
                        <h3>Total Attempts</h3>
                        <div className="stat-value">{totalAttempts}</div>
                    </div>
                </div>

                {/* Motivational message */}
                <div className="motivation-section card">
                    <BookOpen size={24} className="text-primary" />
                    <h3>Keep Practicing!</h3>
                    <p>This puzzle has been completed. Review your approach and try similar problems to improve your skills.</p>
                </div>

                {/* Show user's last submission for reference */}
                {userOrder.length > 0 && (
                    <div className="solution-section card">
                        <h3>Your Last Attempt</h3>
                        <p className="text-secondary">Review your approach and identify areas for improvement</p>
                        <div className="solution-blocks">
                            {userOrder.map((block, index) => (
                                <div key={block.block_id} className="solution-block">
                                    <span className="block-number">{index + 1}</span>
                                    <code>{block.text}</code>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="results-actions">
                    <button onClick={() => navigate('/student/puzzles')} className="btn btn-primary btn-lg">
                        <Home size={18} />
                        Back to Puzzles
                    </button>
                </div>
            </div>
        </div>
    );
}
