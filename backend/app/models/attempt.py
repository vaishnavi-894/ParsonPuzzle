from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from uuid import uuid4


class Attempt(BaseModel):
    attempt_id: str = Field(default_factory=lambda: str(uuid4()))
    assignment_id: str
    user_id: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    time_taken_sec: Optional[int] = None
    submitted_order: List[str] = []  # List of block_ids in submitted order
    is_correct: Optional[bool] = None
    score: Optional[float] = None  # 0.0 to 1.0
    feedback: Optional[Dict] = None  # Detailed feedback
    attempt_number: int = 1
    
    class Config:
        json_schema_extra = {
            "example": {
                "assignment_id": "assignment-uuid",
                "user_id": "user-uuid",
                "started_at": "2024-01-20T10:00:00",
                "submitted_order": ["block-1", "block-2", "block-3"],
                "attempt_number": 1
            }
        }


class AttemptCreate(BaseModel):
    assignment_id: str
    started_at: datetime


class AttemptSubmit(BaseModel):
    submitted_order: List[str]  # List of block_ids


class AttemptResponse(BaseModel):
    attempt_id: str
    assignment_id: str
    user_id: str
    started_at: datetime
    submitted_at: Optional[datetime]
    time_taken_sec: Optional[int]
    is_correct: Optional[bool]
    score: Optional[float]
    feedback: Optional[Dict]
    attempt_number: int
