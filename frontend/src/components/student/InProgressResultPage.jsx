import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import './Student.css';

export default function InProgressResultPage({ attempt, blocks, totalTimeSec, positionStats }) {
    const navigate = useNavigate();
    const { submitted_order, assignment_id: assignmentId } = attempt;
    const scorePct = positionStats?.percentage ?? 0;

    const blockMap = {};
    blocks.forEach(block => {
        blockMap[block.block_id] = block;
    });

    const userOrder = submitted_order ? submitted_order.map(id => blockMap[id]).filter(Boolean) : [];
    const correctnessByBlockId = new Map(
        (positionStats?.positionResults || []).map(item => [item.block_id, item.is_correct])
    );
    const missingCount = positionStats?.missingCount ?? 0;

    return (
        <div className="page-container">
            <div className="results-container">
                <div className="results-header card in-progress">
                    <AlertCircle size={64} className="text-warning" />
                    <h1>{missingCount > 0 ? 'Almost There' : 'Keep Trying!'}</h1>
                    <p>
                        {missingCount > 0
                            ? `Arrange all blocks to finish. ${missingCount} blocks are still missing.`
                            : "You're learning - try again!"}
                    </p>
                </div>

                <div className="results-stats">
                    <div className="stat-card card">
                        <h3>Correct Position</h3>
                        <div className="stat-value">{scorePct}%</div>
                        <p className="stat-subvalue">
                            {positionStats?.correctCount ?? 0} of {positionStats?.totalBlocks ?? 0} blocks correct
                        </p>
                        {missingCount > 0 && (
                            <p className="stat-subvalue">
                                {positionStats?.submittedCount ?? userOrder.length} arranged, {missingCount} missing
                            </p>
                        )}
                    </div>
                    <div className="stat-card card">
                        <h3>Total Time</h3>
                        <div className="stat-value">{Math.floor(totalTimeSec / 60)}:{(totalTimeSec % 60).toString().padStart(2, '0')}</div>
                    </div>
                </div>

                {userOrder.length > 0 && (
                    <div className="solution-section card">
                        <h3>Your Submission</h3>
                        <p className="text-secondary">Green = Correct Position | Red = Wrong Position</p>
                        <div className="solution-blocks">
                            {userOrder.map((block, index) => {
                                const isCorrectPosition = correctnessByBlockId.has(block.block_id)
                                    ? correctnessByBlockId.get(block.block_id)
                                    : block.correct_position === index;

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
