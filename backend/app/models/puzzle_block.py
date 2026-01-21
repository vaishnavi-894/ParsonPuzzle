from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
from uuid import uuid4


class BlockType(str, Enum):
    NORMAL = "NORMAL"
    DECOY = "DECOY"  # Distractor block


class PuzzleBlock(BaseModel):
    block_id: str = Field(default_factory=lambda: str(uuid4()))
    puzzle_id: str
    text: str  # Pseudocode line/segment
    correct_position: int  # Ground truth order (0-indexed)
    block_type: BlockType = BlockType.NORMAL
    explanation: Optional[str] = None  # Used in feedback
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "puzzle_id": "puzzle-uuid",
                "text": "if left <= right:",
                "correct_position": 0,
                "block_type": "NORMAL",
                "explanation": "This is the loop condition for binary search"
            }
        }


class PuzzleBlockCreate(BaseModel):
    text: str
    correct_position: int
    block_type: BlockType = BlockType.NORMAL
    explanation: Optional[str] = None


class PuzzleBlockResponse(BaseModel):
    block_id: str
    puzzle_id: str
    text: str
    correct_position: int
    block_type: BlockType
    explanation: Optional[str]
