from pydantic import BaseModel, Field
from datetime import datetime
from uuid import uuid4


class Cohort(BaseModel):
    cohort_id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    term: str  # e.g., "Fall 2024", "Spring 2025"
    created_by: str  # user_id of instructor
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "CS101 Section A",
                "term": "Fall 2024",
                "created_by": "instructor-user-id"
            }
        }


class CohortCreate(BaseModel):
    name: str
    term: str


class CohortResponse(BaseModel):
    cohort_id: str
    name: str
    term: str
    created_by: str
    created_at: datetime
