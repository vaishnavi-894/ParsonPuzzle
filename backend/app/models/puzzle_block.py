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
    # Code editor metadata
    indentation_level: int = 0  # Number of leading spaces
    is_comment: bool = False  # Is this line a comment
    line_number: int = 0  # Original line number in source code
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Hierarchical scope metadata (for function/loop drill-down UI)
    function_name: Optional[str] = None       # Which top-level function this block belongs to
    scope_id: Optional[str] = None            # Unique ID for this block when it's a scope opener (function def / loop header)
    parent_scope_id: Optional[str] = None     # The scope_id of the immediately enclosing scope
    is_scope_header: bool = False             # True if this line opens a scope (function def or loop)
    scope_type: Optional[str] = None          # "function" | "for_loop" | "while_loop"

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
    # Scope fields exposed to frontend
    function_name: Optional[str] = None
    scope_id: Optional[str] = None
    parent_scope_id: Optional[str] = None
    is_scope_header: bool = False
    scope_type: Optional[str] = None
