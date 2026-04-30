import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { attemptAPI, assignmentAPI, puzzleAPI } from '../../services/api';
import SuccessResultPage from './SuccessResultPage';
import InProgressResultPage from './InProgressResultPage';
import FailedResultPage from './FailedResultPage';
import './Student.css';

export default function ResultsPage() {
    const { attemptId } = useParams();
    const [attempt, setAttempt] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [allAttempts, setAllAttempts] = useState([]);
    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAttempt();
    }, [attemptId]);

    const loadAttempt = async () => {
        try {
            const attemptResponse = await attemptAPI.getById(attemptId);
            setAttempt(attemptResponse.data);

            // Fetch all attempts for this assignment to calculate total time
            const allAttemptsResponse = await attemptAPI.getAll({
                assignment_id: attemptResponse.data.assignment_id
            });
            setAllAttempts(allAttemptsResponse.data || []);

            // Fetch assignment to get max_attempts
            const assignmentResponse = await assignmentAPI.getPuzzle(attemptResponse.data.assignment_id);
            setAssignment(assignmentResponse.data.assignment);

            // Fetch puzzle blocks to show the correct solution
            const puzzleResponse = await puzzleAPI.getBlocks(attemptResponse.data.puzzle_id, false);
            setBlocks(puzzleResponse.data);
        } catch (err) {
            console.error('Failed to load attempt');
        } finally {
            setLoading(false);
        }
    };

    const getPositionStats = (attemptData, puzzleBlocks) => {
        const feedback = attemptData?.feedback || {};
        const totalBlocks = feedback.total_blocks ?? puzzleBlocks.length ?? 0;
        const correctCount = feedback.correct_count ?? Math.round((attemptData?.score || 0) * totalBlocks);
        const incorrectCount = feedback.incorrect_count ?? Math.max(0, totalBlocks - correctCount);
        const percentage = totalBlocks > 0 ? Math.round((correctCount / totalBlocks) * 100) : 0;

        return {
            totalBlocks,
            correctCount,
            incorrectCount,
            submittedCount: feedback.submitted_count ?? attemptData?.submitted_order?.length ?? 0,
            missingCount: feedback.missing_count ?? Math.max(0, totalBlocks - (attemptData?.submitted_order?.length ?? 0)),
            positionResults: feedback.position_results ?? [],
            percentage,
        };
    };

    if (loading) {
        return <div className="page-container"><div className="text-secondary">Loading results...</div></div>;
    }

    if (!attempt || !assignment) {
        return <div className="page-container"><div className="text-error">Attempt not found</div></div>;
    }

    // Calculate total time across all attempts
    const totalTimeSec = allAttempts.reduce((sum, att) => sum + (att.time_taken_sec || 0), 0);

    // Calculate remaining attempts
    const submittedAttempts = allAttempts.filter(a => a.submitted_at).length;
    const remainingAttempts = assignment.max_attempts - submittedAttempts;
    const positionStats = getPositionStats(attempt, blocks);

    // Determine which result page to show
    if (attempt.is_correct) {
        // Success: Show celebration and solution
        return <SuccessResultPage
            attempt={attempt}
            blocks={blocks}
            totalTimeSec={totalTimeSec}
            positionStats={positionStats}
        />;
    } else if (remainingAttempts > 0) {
        // In Progress: Show encouragement, NO solution
        return <InProgressResultPage
            attempt={attempt}
            blocks={blocks}
            totalTimeSec={totalTimeSec}
            positionStats={positionStats}
        />;
    } else {
        // Failed: Show solution for learning
        return <FailedResultPage
            attempt={attempt}
            blocks={blocks}
            totalTimeSec={totalTimeSec}
            positionStats={positionStats}
        />;
    }
}
