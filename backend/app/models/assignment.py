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
    start_at: datetime
    end_at: datetime
    max_attempts: int = 3
    feedback_mode: FeedbackMode = FeedbackMode.IMMEDIATE
    created_by: str  # user_id of instructor
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "puzzle_id": "puzzle-uuid",
                "cohort_id": "cohort-uuid",
                "start_at": "2024-01-20T00:00:00",
                "end_at": "2024-01-27T23:59:59",
                "max_attempts": 3,
                "feedback_mode": "IMMEDIATE"
            }
        }


class AssignmentCreate(BaseModel):
    puzzle_id: str
    cohort_id: str
    start_at: datetime
    end_at: datetime
    max_attempts: int = 3
    feedback_mode: FeedbackMode = FeedbackMode.IMMEDIATE


class AssignmentResponse(BaseModel):
    assignment_id: str
    puzzle_id: str
    cohort_id: str
    start_at: datetime
    end_at: datetime
    max_attempts: int
    feedback_mode: FeedbackMode
    created_by: str
    created_at: datetime
    
    # Enriched fields (optional)
    puzzle_title: Optional[str] = None
    puzzle_description: Optional[str] = None
    puzzle_difficulty: Optional[str] = None
    
    # User progress fields (optional, for students)
    user_status: Optional[str] = "NOT_STARTED" # NOT_STARTED, ATTEMPTED, COMPLETED
    user_attempts_count: Optional[int] = 0
