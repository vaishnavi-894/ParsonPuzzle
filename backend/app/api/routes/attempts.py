from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from app.models.attempt import AttemptCreate, AttemptSubmit, AttemptResponse
from app.models.attempt_state import AttemptPause, AttemptResume
from app.models.user import User
from app.services.attempt_service import AttemptService
from app.services.assignment_service import AssignmentService
from app.services.evaluation_engine import EvaluationEngine
from app.api.routes.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/attempts", tags=["Attempts"])


@router.post("", response_model=AttemptResponse, status_code=status.HTTP_201_CREATED)
async def create_attempt(
    attempt_data: AttemptCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new attempt (start solving a puzzle)"""
    # Get assignment
    assignment = await AssignmentService.get_assignment(attempt_data.assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Note: No longer checking max_attempts or deadlines
    # Students can attempt puzzles unlimited times with no time restrictions
    
    attempt = await AttemptService.create_attempt(attempt_data, current_user.user_id)
    return AttemptResponse(**attempt.model_dump())


@router.post("/{attempt_id}/submit", response_model=AttemptResponse)
async def submit_attempt(
    attempt_id: str,
    submission: AttemptSubmit,
    current_user: User = Depends(get_current_user)
):
    """Submit an attempt for evaluation"""
    # Get attempt
    attempt = await AttemptService.get_attempt(attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attempt not found"
        )
    
    # Verify ownership
    if attempt.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only submit your own attempts"
        )
    
    # Check if already submitted
    if attempt.submitted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attempt already submitted"
        )
    
    # Get assignment
    assignment = await AssignmentService.get_assignment(attempt.assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Note: No longer checking deadline - students can submit anytime
    
    # Submit and evaluate
    evaluated_attempt = await AttemptService.submit_attempt(attempt_id, submission, assignment)
    return AttemptResponse(**evaluated_attempt.model_dump())


@router.get("/{attempt_id}", response_model=AttemptResponse)
async def get_attempt(
    attempt_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get an attempt by ID"""
    attempt = await AttemptService.get_attempt(attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attempt not found"
        )
    
    # Students can only view their own attempts
    if attempt.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own attempts"
        )
    
    return AttemptResponse(**attempt.model_dump())


@router.get("", response_model=List[AttemptResponse])
async def get_attempts(
    assignment_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Get attempts, optionally filtered by assignment or user"""
    if user_id:
        # Only allow users to view their own attempts
        if user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own attempts"
            )
        attempts = await AttemptService.get_attempts_by_user(user_id, assignment_id)
    elif assignment_id:
        # For students, only show their own attempts
        if current_user.role.value == "STUDENT":
            attempts = await AttemptService.get_attempts_by_user(current_user.user_id, assignment_id)
        else:
            # Instructors can see all attempts for an assignment
            attempts = await AttemptService.get_attempts_by_assignment(assignment_id)
    else:
        # Default: get user's own attempts
        attempts = await AttemptService.get_attempts_by_user(current_user.user_id)
    
    return [AttemptResponse(**attempt.model_dump()) for attempt in attempts]


@router.post("/{attempt_id}/pause", response_model=AttemptResponse)
async def pause_attempt(
    attempt_id: str,
    pause_data: AttemptPause,
    current_user: User = Depends(get_current_user)
):
    """Pause an attempt and save current progress"""
    # Get attempt
    attempt = await AttemptService.get_attempt(attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attempt not found"
        )
    
    # Verify ownership
    if attempt.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only pause your own attempts"
        )
    
    # Check if already submitted
    if attempt.submitted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot pause a submitted attempt"
        )
    
    # Check if already paused
    if attempt.is_paused:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attempt is already paused"
        )
    
    # Pause the attempt
    paused_attempt = await AttemptService.pause_attempt(attempt_id, pause_data.current_order)
    return AttemptResponse(**paused_attempt.model_dump())


@router.post("/{attempt_id}/resume", response_model=AttemptResponse)
async def resume_attempt(
    attempt_id: str,
    current_user: User = Depends(get_current_user)
):
    """Resume a paused attempt"""
    # Get attempt
    attempt = await AttemptService.get_attempt(attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attempt not found"
        )
    
    # Verify ownership
    if attempt.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only resume your own attempts"
        )
    
    # Check if actually paused
    if not attempt.is_paused:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attempt is not paused"
        )
    
    # Resume the attempt
    resumed_attempt = await AttemptService.resume_attempt(attempt_id)
    return AttemptResponse(**resumed_attempt.model_dump())
