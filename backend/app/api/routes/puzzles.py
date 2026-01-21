from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from app.models.puzzle import PuzzleCreate, PuzzleUpdate, PuzzleResponse
from app.models.puzzle_block import PuzzleBlockCreate, PuzzleBlockResponse
from app.models.user import User, UserRole
from app.services.puzzle_service import PuzzleService
from app.api.routes.auth import get_current_user

router = APIRouter(prefix="/puzzles", tags=["Puzzles"])


@router.post("", response_model=PuzzleResponse, status_code=status.HTTP_201_CREATED)
async def create_puzzle(
    puzzle_data: PuzzleCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new puzzle (instructor only)"""
    if current_user.role not in [UserRole.INSTRUCTOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors can create puzzles"
        )
    
    puzzle = await PuzzleService.create_puzzle(puzzle_data, current_user.user_id)
    return PuzzleResponse(**puzzle.model_dump())


@router.get("/{puzzle_id}", response_model=PuzzleResponse)
async def get_puzzle(
    puzzle_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a puzzle by ID"""
    puzzle = await PuzzleService.get_puzzle(puzzle_id)
    if not puzzle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Puzzle not found"
        )
    
    return PuzzleResponse(**puzzle.model_dump())


@router.put("/{puzzle_id}", response_model=PuzzleResponse)
async def update_puzzle(
    puzzle_id: str,
    puzzle_update: PuzzleUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a puzzle (instructor only)"""
    if current_user.role not in [UserRole.INSTRUCTOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors can update puzzles"
        )
    
    # Check if puzzle exists and user owns it
    puzzle = await PuzzleService.get_puzzle(puzzle_id)
    if not puzzle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Puzzle not found"
        )
    
    if puzzle.created_by != current_user.user_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own puzzles"
        )
    
    updated_puzzle = await PuzzleService.update_puzzle(puzzle_id, puzzle_update)
    return PuzzleResponse(**updated_puzzle.model_dump())


@router.post("/{puzzle_id}/blocks", response_model=List[PuzzleBlockResponse])
async def add_puzzle_blocks(
    puzzle_id: str,
    blocks: List[PuzzleBlockCreate],
    current_user: User = Depends(get_current_user)
):
    """Add blocks to a puzzle (instructor only)"""
    if current_user.role not in [UserRole.INSTRUCTOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors can add blocks"
        )
    
    # Check if puzzle exists and user owns it
    puzzle = await PuzzleService.get_puzzle(puzzle_id)
    if not puzzle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Puzzle not found"
        )
    
    if puzzle.created_by != current_user.user_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only add blocks to your own puzzles"
        )
    
    puzzle_blocks = await PuzzleService.add_blocks(puzzle_id, blocks)
    return [PuzzleBlockResponse(**block.model_dump()) for block in puzzle_blocks]


@router.get("/{puzzle_id}/blocks", response_model=List[PuzzleBlockResponse])
async def get_puzzle_blocks(
    puzzle_id: str,
    shuffle: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Get blocks for a puzzle, optionally shuffled"""
    puzzle = await PuzzleService.get_puzzle(puzzle_id)
    if not puzzle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Puzzle not found"
        )
    
    blocks = await PuzzleService.get_puzzle_blocks(puzzle_id, shuffle=shuffle)
    
    # Hide correct_position from students when shuffled
    if shuffle and current_user.role == UserRole.STUDENT:
        return [
            PuzzleBlockResponse(
                block_id=block.block_id,
                puzzle_id=block.puzzle_id,
                text=block.text,
                correct_position=-1,  # Hide from students
                block_type=block.block_type,
                explanation=None  # Hide explanation until after submission
            )
            for block in blocks
        ]
    
    return [PuzzleBlockResponse(**block.model_dump()) for block in blocks]


@router.get("", response_model=List[PuzzleResponse])
async def get_my_puzzles(current_user: User = Depends(get_current_user)):
    """Get all puzzles created by the current instructor"""
    if current_user.role not in [UserRole.INSTRUCTOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors can view their puzzles"
        )
    
    puzzles = await PuzzleService.get_puzzles_by_instructor(current_user.user_id)
    return [PuzzleResponse(**puzzle.model_dump()) for puzzle in puzzles]
