from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
from uuid import uuid4


class Difficulty(str, Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class PuzzleStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class ShuffleSeedMode(str, Enum):
    FIXED = "FIXED"
    PER_ATTEMPT = "PER_ATTEMPT"


class Puzzle(BaseModel):
    puzzle_id: str = Field(default_factory=lambda: str(uuid4()))
    created_by: str  # user_id of instructor
    title: str
    description: str  # Problem statement
    code_text: Optional[str] = None  # Original code pasted by instructor
    difficulty: Difficulty = Difficulty.MEDIUM
    tags: List[str] = []
    status: PuzzleStatus = PuzzleStatus.DRAFT
    shuffle_seed_mode: ShuffleSeedMode = ShuffleSeedMode.PER_ATTEMPT
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Binary Search Implementation",
                "description": "Arrange the pseudocode blocks to implement binary search",
                "difficulty": "MEDIUM",
                "tags": ["algorithms", "search"]
            }
        }


class PuzzleCreate(BaseModel):
    title: str
    description: str
    code_text: str  # Required: Code to generate blocks from
    difficulty: Difficulty = Difficulty.MEDIUM
    tags: List[str] = []


class PuzzleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[Difficulty] = None
    tags: Optional[List[str]] = None
    status: Optional[PuzzleStatus] = None


class PuzzleResponse(BaseModel):
    puzzle_id: str
    created_by: str
    title: str
    description: str
    difficulty: Difficulty
    tags: List[str]
    status: PuzzleStatus
    created_at: datetime
    updated_at: datetime
