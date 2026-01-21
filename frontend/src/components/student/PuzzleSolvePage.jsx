import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { assignmentAPI, attemptAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import DraggableBlock from '../common/DraggableBlock';
import { Clock, Send, RotateCcw } from 'lucide-react';
import './Student.css';

export default function PuzzleSolvePage() {
    const { assignmentId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [assignment, setAssignment] = useState(null);
    const [puzzle, setPuzzle] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [attemptId, setAttemptId] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        loadPuzzle();
    }, [assignmentId]);

    const loadPuzzle = async () => {
        try {
            const response = await assignmentAPI.getPuzzle(assignmentId);
            const { assignment: assignmentData, puzzle: puzzleData, blocks: blocksData } = response.data;

            setAssignment(assignmentData);
            setPuzzle(puzzleData);
            setBlocks(blocksData);

            // Create attempt
            const attemptResponse = await attemptAPI.create({
                assignment_id: assignmentId,
                started_at: new Date().toISOString()
            });
            setAttemptId(attemptResponse.data.attempt_id);
            setStartTime(new Date());
        } catch (err) {
            setError('Failed to load puzzle');
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setBlocks((items) => {
                const oldIndex = items.findIndex((item) => item.block_id === active.id);
                const newIndex = items.findIndex((item) => item.block_id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleReset = async () => {
        // Reload puzzle to get shuffled blocks again
        await loadPuzzle();
    };

    const handleSubmit = async () => {
        if (!attemptId) return;

        setSubmitting(true);
        try {
            const submittedOrder = blocks.map(block => block.block_id);
            const response = await attemptAPI.submit(attemptId, { submitted_order: submittedOrder });

            // Navigate to results page
            navigate(`/student/result/${attemptId}`);
        } catch (err) {
            setError('Failed to submit attempt');
        } finally {
            setSubmitting(false);
        }
    };

    const getElapsedTime = () => {
        if (!startTime) return '0:00';
        const elapsed = Math.floor((new Date() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return <div className="page-container"><div className="text-secondary">Loading puzzle...</div></div>;
    }

    return (
        <div className="page-container">
            <div className="puzzle-solve-header">
                <div>
                    <h1>{puzzle?.title || 'Puzzle'}</h1>
                    <p className="text-secondary">{puzzle?.description}</p>
                </div>
                <div className="puzzle-timer">
                    <Clock size={20} />
                    <span>{getElapsedTime()}</span>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            <div className="puzzle-solve-container">
                <div className="puzzle-instructions card">
                    <h3>Instructions</h3>
                    <p>Drag and drop the code blocks below to arrange them in the correct order.</p>
                    <p className="text-secondary">The blocks are currently shuffled. Your goal is to arrange them to form a correct solution.</p>
                </div>

                <div className="puzzle-blocks-container card">
                    <div className="blocks-header">
                        <h3>Code Blocks</h3>
                        <button onClick={handleReset} className="btn btn-secondary">
                            <RotateCcw size={18} />
                            Reset
                        </button>
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={blocks.map(b => b.block_id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="blocks-list">
                                {blocks.map((block, index) => (
                                    <DraggableBlock
                                        key={block.block_id}
                                        id={block.block_id}
                                        text={block.text}
                                        index={index}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                <div className="puzzle-actions">
                    <button
                        onClick={handleSubmit}
                        className="btn btn-primary btn-lg"
                        disabled={submitting}
                    >
                        <Send size={18} />
                        {submitting ? 'Submitting...' : 'Submit Solution'}
                    </button>
                </div>
            </div>
        </div>
    );
}
