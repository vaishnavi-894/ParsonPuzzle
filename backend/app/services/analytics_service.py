from typing import List, Dict, Optional
from app.core.database import get_attempts_collection, get_assignments_collection
from collections import Counter


class AnalyticsService:
    @staticmethod
    async def get_assignment_analytics(assignment_id: str) -> Dict:
        """Get analytics for a specific assignment"""
        attempts_collection = get_attempts_collection()
        
        # Get all submitted attempts for this assignment
        cursor = attempts_collection.find({
            "assignment_id": assignment_id,
            "submitted_at": {"$ne": None}
        })
        attempts = [attempt async for attempt in cursor]
        
        if not attempts:
            return {
                "assignment_id": assignment_id,
                "total_attempts": 0,
                "unique_students": 0,
                "success_rate": 0.0,
                "average_score": 0.0,
                "average_time_sec": 0,
                "common_errors": []
            }
        
        # Calculate metrics
        total_attempts = len(attempts)
        unique_students = len(set(attempt["user_id"] for attempt in attempts))
        successful_attempts = sum(1 for attempt in attempts if attempt.get("is_correct"))
        success_rate = successful_attempts / total_attempts if total_attempts > 0 else 0.0
        
        # Average score
        scores = [attempt.get("score", 0) for attempt in attempts if attempt.get("score") is not None]
        average_score = sum(scores) / len(scores) if scores else 0.0
        
        # Average time
        times = [attempt.get("time_taken_sec", 0) for attempt in attempts if attempt.get("time_taken_sec") is not None]
        average_time_sec = sum(times) / len(times) if times else 0
        
        # Common error patterns (most common wrong orders)
        wrong_attempts = [attempt for attempt in attempts if not attempt.get("is_correct")]
        error_patterns = Counter()
        for attempt in wrong_attempts:
            order_str = ",".join(attempt.get("submitted_order", []))
            error_patterns[order_str] += 1
        
        common_errors = [
            {"pattern": pattern, "count": count}
            for pattern, count in error_patterns.most_common(5)
        ]
        
        return {
            "assignment_id": assignment_id,
            "total_attempts": total_attempts,
            "unique_students": unique_students,
            "success_rate": success_rate,
            "average_score": average_score,
            "average_time_sec": int(average_time_sec),
            "common_errors": common_errors
        }
    
    @staticmethod
    async def get_puzzle_analytics(puzzle_id: str) -> Dict:
        """Get analytics for a specific puzzle across all assignments"""
        assignments_collection = get_assignments_collection()
        attempts_collection = get_attempts_collection()
        
        # Get all assignments for this puzzle
        cursor = assignments_collection.find({"puzzle_id": puzzle_id})
        assignments = [assignment async for assignment in cursor]
        assignment_ids = [assignment["assignment_id"] for assignment in assignments]
        
        if not assignment_ids:
            return {
                "puzzle_id": puzzle_id,
                "total_assignments": 0,
                "total_attempts": 0,
                "overall_success_rate": 0.0
            }
        
        # Get all attempts for these assignments
        cursor = attempts_collection.find({
            "assignment_id": {"$in": assignment_ids},
            "submitted_at": {"$ne": None}
        })
        attempts = [attempt async for attempt in cursor]
        
        total_attempts = len(attempts)
        successful_attempts = sum(1 for attempt in attempts if attempt.get("is_correct"))
        success_rate = successful_attempts / total_attempts if total_attempts > 0 else 0.0
        
        return {
            "puzzle_id": puzzle_id,
            "total_assignments": len(assignment_ids),
            "total_attempts": total_attempts,
            "overall_success_rate": success_rate
        }
    
    @staticmethod
    async def get_student_progress(user_id: str, cohort_id: Optional[str] = None) -> Dict:
        """Get progress analytics for a student"""
        attempts_collection = get_attempts_collection()
        assignments_collection = get_assignments_collection()
        
        # Get assignments for the cohort if specified
        query = {}
        if cohort_id:
            query["cohort_id"] = cohort_id
        
        cursor = assignments_collection.find(query)
        assignments = [assignment async for assignment in cursor]
        assignment_ids = [assignment["assignment_id"] for assignment in assignments]
        
        # Get student's attempts
        cursor = attempts_collection.find({
            "user_id": user_id,
            "assignment_id": {"$in": assignment_ids},
            "submitted_at": {"$ne": None}
        })
        attempts = [attempt async for attempt in cursor]
        
        # Calculate progress
        total_puzzles = len(assignment_ids)
        completed_assignments = set(attempt["assignment_id"] for attempt in attempts if attempt.get("is_correct"))
        completed_count = len(completed_assignments)
        
        scores = [attempt.get("score", 0) for attempt in attempts if attempt.get("score") is not None]
        average_score = sum(scores) / len(scores) if scores else 0.0
        
        return {
            "user_id": user_id,
            "cohort_id": cohort_id,
            "total_puzzles": total_puzzles,
            "completed_puzzles": completed_count,
            "completion_rate": completed_count / total_puzzles if total_puzzles > 0 else 0.0,
            "average_score": average_score,
            "total_attempts": len(attempts)
        }
