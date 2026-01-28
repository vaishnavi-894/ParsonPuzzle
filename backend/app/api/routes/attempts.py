from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from app.models.attempt import AttemptCreate, AttemptSubmit, AttemptResponse
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
    
    # Check if user has exceeded max attempts
    attempt_count = await AttemptService.get_user_attempt_count(
        current_user.user_id,
        attempt_data.assignment_id
    )
    
    print(f"User {current_user.user_id} attempt count: {attempt_count}/{assignment.max_attempts}")
    
    if attempt_count >= assignment.max_attempts:
        print(f"Max attempts exceeded: {attempt_count} >= {assignment.max_attempts}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum attempts ({assignment.max_attempts}) exceeded"
        )
    
    # Check time window
    now = datetime.utcnow()
    print(f"Time check - Now: {now}, Start: {assignment.start_at}, End: {assignment.end_at}")
    
    if now < assignment.start_at:
        print(f"Assignment has not started yet. Now: {now}, Start: {assignment.start_at}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment has not started yet"
        )
    
    if now > assignment.end_at:
        print(f"Assignment deadline has passed. Now: {now}, End: {assignment.end_at}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment deadline has passed"
        )
    
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
    
    # Check if deadline has passed
    now = datetime.utcnow()
    if now > assignment.end_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment deadline has passed. Submission not allowed."
        )
    
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
