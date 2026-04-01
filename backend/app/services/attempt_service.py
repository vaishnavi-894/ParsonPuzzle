from typing import List, Optional
from app.models.attempt import Attempt, AttemptCreate, AttemptSubmit
from app.models.assignment import Assignment
from app.core.database import get_attempts_collection
from app.services.assignment_service import AssignmentService
from app.services.evaluation_engine import EvaluationEngine
from app.services.puzzle_service import PuzzleService
from datetime import datetime


class AttemptService:
    @staticmethod
    async def create_attempt(attempt_data: AttemptCreate, user_id: str) -> Attempt:
        """Create a new attempt"""
        # Get assignment to fetch puzzle_id
        assignment = await AssignmentService.get_assignment(attempt_data.assignment_id)
        if not assignment:
            raise ValueError("Assignment not found")
            
        # Get current attempt number for this user and assignment
        collection = get_attempts_collection()
        existing_attempts = await collection.count_documents({
            "assignment_id": attempt_data.assignment_id,
            "user_id": user_id
        })
        
        attempt = Attempt(
            user_id=user_id,
            puzzle_id=assignment.puzzle_id, # Populate redundant field
            attempt_number=existing_attempts + 1,
            **attempt_data.model_dump()
        )
        
        await collection.insert_one(attempt.model_dump())
        return attempt
    
    @staticmethod
    async def get_attempt(attempt_id: str) -> Optional[Attempt]:
        """Get an attempt by ID"""
        collection = get_attempts_collection()
        attempt_data = await collection.find_one({"attempt_id": attempt_id})
        if attempt_data:
            return Attempt(**attempt_data)
        return None
    
    @staticmethod
    async def submit_attempt(
        attempt_id: str,
        submission: AttemptSubmit,
        assignment: Assignment
    ) -> Attempt:
        """Submit an attempt and evaluate it"""
        collection = get_attempts_collection()
        
        # Get the attempt
        attempt = await AttemptService.get_attempt(attempt_id)
        if not attempt:
            raise ValueError("Attempt not found")
        
        # Get puzzle blocks
        puzzle_blocks = await PuzzleService.get_puzzle_blocks(assignment.puzzle_id)
        
        # Evaluate the attempt
        evaluation = EvaluationEngine.evaluate_attempt(
            submission.submitted_order,
            puzzle_blocks
        )
        
        # Calculate time taken (excluding pause duration)
        submitted_at = datetime.utcnow()
        time_taken_sec = int((submitted_at - attempt.started_at).total_seconds())
        time_taken_sec -= attempt.total_pause_duration_sec  # Subtract paused time
        
        # Update attempt with results
        update_data = {
            "submitted_at": submitted_at,
            "time_taken_sec": time_taken_sec,
            "submitted_order": submission.submitted_order,
            "is_correct": evaluation["is_correct"],
            "score": evaluation["score"],
            "feedback": evaluation["feedback"],
            "is_paused": False  # Ensure paused flag is cleared on submission
        }
        
        await collection.update_one(
            {"attempt_id": attempt_id},
            {"$set": update_data}
        )
        
        # Return updated attempt
        return await AttemptService.get_attempt(attempt_id)
    
    @staticmethod
    async def get_attempts_by_user(user_id: str, assignment_id: Optional[str] = None) -> List[Attempt]:
        """Get all attempts by a user, optionally filtered by assignment"""
        collection = get_attempts_collection()
        
        query = {"user_id": user_id}
        if assignment_id:
            query["assignment_id"] = assignment_id
        
        cursor = collection.find(query).sort("started_at", -1)
        attempts = [Attempt(**attempt_data) async for attempt_data in cursor]
        return attempts
    
    @staticmethod
    async def get_attempts_by_assignment(assignment_id: str) -> List[Attempt]:
        """Get all attempts for an assignment"""
        collection = get_attempts_collection()
        cursor = collection.find({"assignment_id": assignment_id})
        attempts = [Attempt(**attempt_data) async for attempt_data in cursor]
        return attempts
    
    @staticmethod
    async def get_user_attempt_count(user_id: str, assignment_id: str) -> int:
        """Get the number of attempts a user has made for an assignment"""
        collection = get_attempts_collection()
        count = await collection.count_documents({
            "user_id": user_id,
            "assignment_id": assignment_id
        })
        return count
    
    @staticmethod
    async def pause_attempt(attempt_id: str, current_order: List[str]) -> Attempt:
        """Pause an attempt and save current progress"""
        collection = get_attempts_collection()
        
        update_data = {
            "is_paused": True,
            "paused_at": datetime.utcnow(),
            "current_order": current_order
        }
        
        await collection.update_one(
            {"attempt_id": attempt_id},
            {"$set": update_data}
        )
        
        return await AttemptService.get_attempt(attempt_id)
    
    @staticmethod
    async def resume_attempt(attempt_id: str) -> Attempt:
        """Resume a paused attempt"""
        collection = get_attempts_collection()
        
        # Get current attempt to calculate pause duration
        attempt = await AttemptService.get_attempt(attempt_id)
        if not attempt or not attempt.paused_at:
            raise ValueError("Attempt not found or not paused")
        
        # Calculate pause duration and add to total
        resumed_at = datetime.utcnow()
        pause_duration_sec = int((resumed_at - attempt.paused_at).total_seconds())
        total_pause_duration = attempt.total_pause_duration_sec + pause_duration_sec
        
        update_data = {
            "is_paused": False,
            "paused_at": None,
            "total_pause_duration_sec": total_pause_duration
        }
        
        await collection.update_one(
            {"attempt_id": attempt_id},
            {"$set": update_data}
        )
        
        return await AttemptService.get_attempt(attempt_id)
