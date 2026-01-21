from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from app.models.assignment import AssignmentCreate, AssignmentResponse
from app.models.user import User, UserRole
from app.services.assignment_service import AssignmentService
from app.services.puzzle_service import PuzzleService
from app.services.attempt_service import AttemptService
from app.api.routes.auth import get_current_user
from app.core.database import get_puzzles_collection

router = APIRouter(prefix="/assignments", tags=["Assignments"])


@router.post("", response_model=AssignmentResponse, status_code=201)
async def create_assignment(
    assignment_data: AssignmentCreate,
    current_user: User = Depends(get_current_user),
    puzzles_collection = Depends(get_puzzles_collection)
):
    """Create a new assignment (instructor only)"""
    if current_user.role != UserRole.INSTRUCTOR:
        raise HTTPException(status_code=403, detail="Only instructors can create assignments")
    
    # Verify puzzle exists
    puzzle = await PuzzleService.get_puzzle(assignment_data.puzzle_id)
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    
    # Create assignment
    assignment = await AssignmentService.create_assignment(assignment_data, current_user.user_id)
    
    # Update puzzle status to PUBLISHED
    await puzzles_collection.update_one(
        {"puzzle_id": assignment_data.puzzle_id},
        {"$set": {"status": "PUBLISHED"}}
    )
    
    return AssignmentResponse(**assignment.model_dump())


@router.get("/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    assignment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get an assignment by ID"""
    assignment = await AssignmentService.get_assignment(assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    return AssignmentResponse(**assignment.model_dump())


@router.get("", response_model=List[AssignmentResponse])
async def get_assignments(
    cohort_id: Optional[str] = Query(None),
    puzzle_id: Optional[str] = Query(None),
    active_only: bool = Query(False),
    current_user: User = Depends(get_current_user)
):
    """Get assignments, optionally filtered by cohort or puzzle"""
    # For students, always use their cohort_id from profile
    if current_user.role == UserRole.STUDENT:
        student_cohort = getattr(current_user.profile, "cohort_id", None) if current_user.profile else None
        if student_cohort:
            if active_only:
                assignments = await AssignmentService.get_active_assignments_by_cohort(student_cohort)
            else:
                assignments = await AssignmentService.get_assignments_by_cohort(student_cohort)
        else:
            assignments = []
    elif cohort_id:
        # Instructors can filter by specific cohort
        if active_only:
            assignments = await AssignmentService.get_active_assignments_by_cohort(cohort_id)
        else:
            assignments = await AssignmentService.get_assignments_by_cohort(cohort_id)
    elif puzzle_id:
        assignments = await AssignmentService.get_assignments_by_puzzle(puzzle_id)
    else:
        assignments = []
    
    # Enrich assignments with puzzle details for students
    # Enrich assignments with puzzle details for students
    enriched_assignments = []
    for assignment in assignments:
        assignment_dict = assignment.model_dump()
        
        # Fetch puzzle details
        print(f"Looking for puzzle with ID: {assignment.puzzle_id}")
        puzzle = await PuzzleService.get_puzzle(assignment.puzzle_id)
        
        if puzzle:
            assignment_dict["puzzle_title"] = puzzle.title
            assignment_dict["puzzle_description"] = puzzle.description
            assignment_dict["puzzle_difficulty"] = puzzle.difficulty
            print(f"Enriched with title: {puzzle.title}")
        
        # Fetch user progress (if student)
        if current_user.role == UserRole.STUDENT:
            attempts = await AttemptService.get_attempts_by_user(current_user.user_id, assignment.assignment_id)
            assignment_dict["user_attempts_count"] = len(attempts)
            
            # Check if any attempt is correct
            is_completed = any(attempt.is_correct for attempt in attempts)
            
            if is_completed:
                assignment_dict["user_status"] = "COMPLETED"
            elif len(attempts) > 0:
                assignment_dict["user_status"] = "ATTEMPTED"
            else:
                assignment_dict["user_status"] = "NOT_STARTED"
                
        enriched_assignments.append(assignment_dict)
    
    return enriched_assignments


@router.get("/{assignment_id}/puzzle")
async def get_assignment_puzzle(
    assignment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get puzzle details for an assignment (with shuffled blocks for students)"""
    assignment = await AssignmentService.get_assignment(assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    puzzle = await PuzzleService.get_puzzle(assignment.puzzle_id)
    if not puzzle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Puzzle not found"
        )
    
    # Get blocks (shuffled for students)
    shuffle = current_user.role == UserRole.STUDENT
    blocks = await PuzzleService.get_puzzle_blocks(assignment.puzzle_id, shuffle=shuffle)
    
    # Hide correct_position from students
    if current_user.role == UserRole.STUDENT:
        blocks_data = [
            {
                "block_id": block.block_id,
                "text": block.text,
                "block_type": block.block_type
            }
            for block in blocks
        ]
    else:
        blocks_data = [block.model_dump() for block in blocks]
    
    return {
        "assignment": assignment.model_dump(),
        "puzzle": puzzle.model_dump(),
        "blocks": blocks_data
    }
