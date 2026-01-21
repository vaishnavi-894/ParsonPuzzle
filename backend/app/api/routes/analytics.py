from fastapi import APIRouter, HTTPException, Depends, status
from app.models.user import User, UserRole
from app.services.analytics_service import AnalyticsService
from app.api.routes.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/assignment/{assignment_id}")
async def get_assignment_analytics(
    assignment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get analytics for a specific assignment (instructor only)"""
    if current_user.role not in [UserRole.INSTRUCTOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors can view analytics"
        )
    
    analytics = await AnalyticsService.get_assignment_analytics(assignment_id)
    return analytics


@router.get("/puzzle/{puzzle_id}")
async def get_puzzle_analytics(
    puzzle_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get analytics for a specific puzzle (instructor only)"""
    if current_user.role not in [UserRole.INSTRUCTOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors can view analytics"
        )
    
    analytics = await AnalyticsService.get_puzzle_analytics(puzzle_id)
    return analytics


@router.get("/student/{user_id}")
async def get_student_progress(
    user_id: str,
    cohort_id: str = None,
    current_user: User = Depends(get_current_user)
):
    """Get progress analytics for a student"""
    # Students can only view their own progress
    if current_user.role == UserRole.STUDENT and user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own progress"
        )
    
    analytics = await AnalyticsService.get_student_progress(user_id, cohort_id)
    return analytics
