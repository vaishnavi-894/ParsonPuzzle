from typing import List, Optional
from app.models.puzzle import Puzzle, PuzzleCreate, PuzzleUpdate, PuzzleStatus
from app.models.puzzle_block import PuzzleBlock, PuzzleBlockCreate
from app.core.database import get_puzzles_collection, get_puzzle_blocks_collection
from datetime import datetime
import random


class PuzzleService:
    @staticmethod
    async def create_puzzle(puzzle_data: PuzzleCreate, created_by: str) -> Puzzle:
        """Create a new puzzle and auto-generate blocks from code"""
        from app.services.code_parser import CodeParser
        
        puzzle = Puzzle(
            created_by=created_by,
            **puzzle_data.model_dump()
        )
        
        collection = get_puzzles_collection()
        await collection.insert_one(puzzle.model_dump())
        
        # Auto-generate blocks from code_text
        if puzzle_data.code_text:
            blocks_data = CodeParser.generate_blocks_from_code(
                puzzle_data.code_text,
                puzzle.puzzle_id
            )
            blocks_collection = get_puzzle_blocks_collection()
            if blocks_data:
                await blocks_collection.insert_many(blocks_data)
        
        return puzzle
    
    @staticmethod
    async def get_puzzle(puzzle_id: str) -> Optional[Puzzle]:
        """Get a puzzle by ID"""
        collection = get_puzzles_collection()
        puzzle_data = await collection.find_one({"puzzle_id": puzzle_id})
        if puzzle_data:
            return Puzzle(**puzzle_data)
        return None
    
    @staticmethod
    async def update_puzzle(puzzle_id: str, puzzle_update: PuzzleUpdate) -> Optional[Puzzle]:
        """Update a puzzle"""
        collection = get_puzzles_collection()
        
        update_data = {k: v for k, v in puzzle_update.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        result = await collection.update_one(
            {"puzzle_id": puzzle_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await PuzzleService.get_puzzle(puzzle_id)
        return None
    
    @staticmethod
    async def delete_puzzle(puzzle_id: str) -> bool:
        """Delete a puzzle (soft delete by archiving)"""
        collection = get_puzzles_collection()
        result = await collection.update_one(
            {"puzzle_id": puzzle_id},
            {"$set": {"status": PuzzleStatus.ARCHIVED}}
        )
        return result.modified_count > 0
    
    @staticmethod
    async def add_blocks(puzzle_id: str, blocks: List[PuzzleBlockCreate]) -> List[PuzzleBlock]:
        """Add blocks to a puzzle"""
        collection = get_puzzle_blocks_collection()
        
        puzzle_blocks = []
        for block_data in blocks:
            block = PuzzleBlock(
                puzzle_id=puzzle_id,
                **block_data.model_dump()
            )
            puzzle_blocks.append(block)
        
        if puzzle_blocks:
            await collection.insert_many([block.model_dump() for block in puzzle_blocks])
        
        return puzzle_blocks
    
    @staticmethod
    async def get_puzzle_blocks(puzzle_id: str, shuffle: bool = False) -> List[PuzzleBlock]:
        """Get all blocks for a puzzle, optionally shuffled"""
        collection = get_puzzle_blocks_collection()
        cursor = collection.find({"puzzle_id": puzzle_id})
        blocks = [PuzzleBlock(**block_data) async for block_data in cursor]
        
        if shuffle:
            random.shuffle(blocks)
        else:
            # Sort by correct position for instructor view
            blocks.sort(key=lambda b: b.correct_position)
        
        return blocks
    
    @staticmethod
    async def get_puzzles_by_instructor(instructor_id: str) -> List[Puzzle]:
        """Get all puzzles created by an instructor"""
        collection = get_puzzles_collection()
        cursor = collection.find({"created_by": instructor_id})
        puzzles = [Puzzle(**puzzle_data) async for puzzle_data in cursor]
        return puzzles
