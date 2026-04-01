from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
from uuid import uuid4


class FeedbackMode(str, Enum):
    IMMEDIATE = "IMMEDIATE"
    DELAYED = "DELAYED"


class Assignment(BaseModel):
    assignment_id: str = Field(default_factory=lambda: str(uuid4()))
    puzzle_id: str
    cohort_id: str
    start_at: Optional[datetime] = None  # Optional, defaults to creation time
    end_at: Optional[datetime] = None  # Optional, no deadline by default
    # Redundant fields for denormalization
    puzzle_title: str
    puzzle_description: str
    puzzle_difficulty: str

    max_attempts: int = 999  # Effectively unlimited
    feedback_mode: FeedbackMode = FeedbackMode.IMMEDIATE
    created_by: str  # user_id of instructor
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "puzzle_id": "puzzle-uuid",
                "cohort_id": "cohort-uuid",
                "start_at": "2024-01-20T00:00:00",  # Optional
                "end_at": None,  # No deadline
                "puzzle_title": "Binary Search",
                "puzzle_description": "Implement binary search...",
                "puzzle_difficulty": "MEDIUM",
                "max_attempts": 999,  # Unlimited
                "feedback_mode": "IMMEDIATE"
            }
        }


class AssignmentCreate(BaseModel):
    puzzle_id: str
    cohort_id: str
    start_at: Optional[datetime] = None  # Optional, defaults to now
    end_at: Optional[datetime] = None  # Optional, no deadline
    max_attempts: int = 999  # Unlimited by default
    feedback_mode: FeedbackMode = FeedbackMode.IMMEDIATE


class AssignmentResponse(BaseModel):
    assignment_id: str
    puzzle_id: str
    cohort_id: str
    start_at: Optional[datetime]
    end_at: Optional[datetime]
    max_attempts: int
    feedback_mode: FeedbackMode
    created_by: str
    created_at: datetime
    
    # Redundant fields (always present now)
    puzzle_title: str
    puzzle_description: str
    puzzle_difficulty: str
    
    # User progress fields (optional, for students)
    user_status: Optional[str] = "NOT_STARTED" # NOT_STARTED, ATTEMPTED, COMPLETED
    user_attempts_count: Optional[int] = 0
