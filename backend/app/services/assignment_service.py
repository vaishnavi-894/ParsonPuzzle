from typing import List, Optional
from app.models.assignment import Assignment, AssignmentCreate
from app.core.database import get_assignments_collection
from datetime import datetime


class AssignmentService:
    @staticmethod
    async def create_assignment(assignment_data: AssignmentCreate, created_by: str) -> Assignment:
        """Create a new assignment (publish puzzle to cohort)"""
        from app.services.puzzle_service import PuzzleService
        
        # Fetch puzzle details for redundancy
        puzzle = await PuzzleService.get_puzzle(assignment_data.puzzle_id)
        if not puzzle:
            raise ValueError("Puzzle not found")
        
        # Set default start_at to now if not provided
        assignment_dict = assignment_data.model_dump()
        if assignment_dict.get("start_at") is None:
            assignment_dict["start_at"] = datetime.utcnow()
            
        assignment = Assignment(
            created_by=created_by,
            puzzle_title=puzzle.title,
            puzzle_description=puzzle.description,
            puzzle_difficulty=puzzle.difficulty,
            **assignment_dict
        )
        
        collection = get_assignments_collection()
        await collection.insert_one(assignment.model_dump())
        return assignment
    
    @staticmethod
    async def get_assignment(assignment_id: str) -> Optional[Assignment]:
        """Get an assignment by ID"""
        collection = get_assignments_collection()
        assignment_data = await collection.find_one({"assignment_id": assignment_id})
        if assignment_data:
            return Assignment(**assignment_data)
        return None
    
    @staticmethod
    async def get_assignments_by_cohort(cohort_id: str) -> List[Assignment]:
        """Get all assignments for a cohort"""
        collection = get_assignments_collection()
        cursor = collection.find({"cohort_id": cohort_id})
        assignments = [Assignment(**assignment_data) async for assignment_data in cursor]
        return assignments
    
    @staticmethod
    async def get_active_assignments_by_cohort(cohort_id: str) -> List[Assignment]:
        """Get active assignments for a cohort (no longer time-restricted)"""
        collection = get_assignments_collection()
        
        # Since deadlines are optional, just return all assignments
        # Alternatively, could filter by start_at if present
        cursor = collection.find({"cohort_id": cohort_id})
        
        assignments = [Assignment(**assignment_data) async for assignment_data in cursor]
        return assignments
    
    @staticmethod
    async def get_assignments_by_puzzle(puzzle_id: str) -> List[Assignment]:
        """Get all assignments for a puzzle"""
        collection = get_assignments_collection()
        cursor = collection.find({"puzzle_id": puzzle_id})
        assignments = [Assignment(**assignment_data) async for assignment_data in cursor]
        return assignments
