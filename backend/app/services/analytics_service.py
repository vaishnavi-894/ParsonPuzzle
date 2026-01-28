from typing import List, Dict, Optional
from app.core.database import get_attempts_collection, get_assignments_collection, get_puzzles_collection
from collections import Counter
from datetime import datetime


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
        
        # Common error patterns
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
        """Get detailed analytics for a specific puzzle across all assignments"""
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
                "unique_students": 0,
                "students_solved": 0,
                "students_failed": 0,
                "attempt_success_rate": 0.0,
                "student_solve_rate": 0.0,
                "average_time_sec": 0,
                "common_errors": [],
                "score_distribution": {}
            }
        
        # Get all submitted attempts for these assignments
        cursor = attempts_collection.find({
            "assignment_id": {"$in": assignment_ids},
            "submitted_at": {"$ne": None}
        })
        attempts = [attempt async for attempt in cursor]
        
        if not attempts:
            return {
                "puzzle_id": puzzle_id,
                "total_assignments": len(assignment_ids),
                "total_attempts": 0,
                "unique_students": 0,
                "students_solved": 0,
                "students_failed": 0,
                "attempt_success_rate": 0.0,
                "student_solve_rate": 0.0,
                "average_time_sec": 0,
                "common_errors": [],
                "score_distribution": {}
            }
        
        total_attempts = len(attempts)
        all_student_ids = set(attempt["user_id"] for attempt in attempts)
        unique_students_count = len(all_student_ids)
        
        solved_student_ids = set(attempt["user_id"] for attempt in attempts if attempt.get("is_correct"))
        students_solved_count = len(solved_student_ids)
        students_failed_count = unique_students_count - students_solved_count
        
        # Success rate based on attempts
        successful_attempts_count = len([a for a in attempts if a.get("is_correct")])
        attempt_success_rate = successful_attempts_count / total_attempts if total_attempts > 0 else 0.0
        
        # Student solve rate (completion rate)
        student_solve_rate = students_solved_count / unique_students_count if unique_students_count > 0 else 0.0
        
        # Average time for successful attempts
        successful_attempts = [a for a in attempts if a.get("is_correct")]
        times = [a.get("time_taken_sec", 0) for a in successful_attempts if a.get("time_taken_sec") is not None]
        average_time_sec = sum(times) / len(times) if times else 0
        
        # Common error patterns
        wrong_attempts = [attempt for attempt in attempts if not attempt.get("is_correct")]
        error_patterns = Counter()
        for attempt in wrong_attempts:
            order_str = ",".join(attempt.get("submitted_order", []))
            error_patterns[order_str] += 1
        
        common_errors = [
            {"pattern": pattern, "count": count}
            for pattern, count in error_patterns.most_common(5)
        ]
        
        # Score distribution (best score per student)
        student_best_scores = {}
        for attempt in attempts:
            uid = attempt["user_id"]
            score = attempt.get("score", 0)
            if uid not in student_best_scores or score > student_best_scores[uid]:
                student_best_scores[uid] = score
        
        score_distribution = Counter()
        for score in student_best_scores.values():
            bucket = int(score * 10) * 10
            score_distribution[str(bucket)] += 1
            
        return {
            "puzzle_id": puzzle_id,
            "total_assignments": len(assignment_ids),
            "total_attempts": total_attempts,
            "unique_students": unique_students_count,
            "students_solved": students_solved_count,
            "students_failed": students_failed_count,
            "attempt_success_rate": attempt_success_rate,
            "student_solve_rate": student_solve_rate,
            "average_time_sec": int(average_time_sec),
            "common_errors": common_errors,
            "score_distribution": score_distribution
        }
    
    @staticmethod
    async def get_student_progress(user_id: str, cohort_id: Optional[str] = None) -> Dict:
        """Get detailed progress analytics for a student"""
        attempts_collection = get_attempts_collection()
        assignments_collection = get_assignments_collection()
        puzzles_collection = get_puzzles_collection()
        
        query = {}
        if cohort_id:
            query["cohort_id"] = cohort_id
        
        cursor = assignments_collection.find(query)
        assignments = [assignment async for assignment in cursor]
        assignment_ids = [assignment["assignment_id"] for assignment in assignments]
        puzzle_ids = [assignment["puzzle_id"] for assignment in assignments]
        
        cursor = attempts_collection.find({
            "user_id": user_id,
            "assignment_id": {"$in": assignment_ids},
            "submitted_at": {"$ne": None}
        }).sort("submitted_at", 1)
        attempts = [attempt async for attempt in cursor]
        
        cursor = puzzles_collection.find({"puzzle_id": {"$in": puzzle_ids}})
        puzzles = {p["puzzle_id"]: p async for p in cursor}
        
        total_puzzles = len(assignment_ids)
        successful_attempts = [attempt for attempt in attempts if attempt.get("is_correct")]
        completed_assignments = set(attempt["assignment_id"] for attempt in successful_attempts)
        completed_count = len(completed_assignments)
        
        scores = [attempt.get("score", 0) for attempt in attempts if attempt.get("score") is not None]
        average_score = sum(scores) / len(scores) if scores else 0.0
        
        difficulty_stats = Counter()
        difficulty_total = Counter()
        for assignment in assignments:
            p = puzzles.get(assignment["puzzle_id"])
            if p:
                diff = p.get("difficulty", "MEDIUM")
                difficulty_total[diff] += 1
                if assignment["assignment_id"] in completed_assignments:
                    difficulty_stats[diff] += 1
        
        tag_stats = Counter()
        for attempt in successful_attempts:
            p = puzzles.get(attempt["puzzle_id"])
            if p and p.get("tags"):
                for tag in p["tags"]:
                    tag_stats[tag] += 1
        
        recent_attempts = attempts[-10:]
        time_trends = [
            {
                "date": attempt["submitted_at"].isoformat() if attempt.get("submitted_at") else None,
                "time_sec": attempt.get("time_taken_sec", 0),
                "score": attempt.get("score", 0)
            }
            for attempt in recent_attempts
        ]
        
        return {
            "user_id": user_id,
            "cohort_id": cohort_id,
            "total_puzzles": total_puzzles,
            "completed_puzzles": completed_count,
            "completion_rate": completed_count / total_puzzles if total_puzzles > 0 else 0.0,
            "average_score": average_score,
            "total_attempts": len(attempts),
            "difficulty_breakdown": {
                diff: {"completed": difficulty_stats[diff], "total": difficulty_total[diff]}
                for diff in ["EASY", "MEDIUM", "HARD"]
            },
            "top_tags": [{"tag": tag, "count": count} for tag, count in tag_stats.most_common(5)],
            "recent_trends": time_trends
        }

    @staticmethod
    async def get_instructor_summary(instructor_id: str) -> Dict:
        """Get global aggregated analytics for an instructor's puzzles"""
        puzzles_collection = get_puzzles_collection()
        assignments_collection = get_assignments_collection()
        attempts_collection = get_attempts_collection()

        cursor = puzzles_collection.find({"created_by": instructor_id})
        puzzles = [p async for p in cursor]
        puzzle_ids = [p["puzzle_id"] for p in puzzles]

        if not puzzle_ids:
            return {
                "total_puzzles": 0,
                "total_attempts": 0,
                "unique_students": 0,
                "students_solved": 0,
                "students_failed": 0,
                "overall_solve_rate": 0.0,
                "avg_attempts_per_student": 0.0,
                "avg_time_sec": 0,
                "puzzle_performance": []
            }

        cursor = assignments_collection.find({"puzzle_id": {"$in": puzzle_ids}})
        assignments = [a async for a in cursor]
        assignment_ids = [a["assignment_id"] for a in assignments]
        
        assignment_to_puzzle = {a["assignment_id"]: a["puzzle_id"] for a in assignments}
        puzzle_titles = {p["puzzle_id"]: p["title"] for p in puzzles}

        cursor = attempts_collection.find({
            "assignment_id": {"$in": assignment_ids},
            "submitted_at": {"$ne": None}
        })
        attempts = [attempt async for attempt in cursor]

        if not attempts:
            return {
                "total_puzzles": len(puzzle_ids),
                "total_attempts": 0,
                "unique_students": 0,
                "students_solved": 0,
                "students_failed": 0,
                "overall_solve_rate": 0.0,
                "avg_attempts_per_student": 0.0,
                "avg_time_sec": 0,
                "puzzle_performance": []
            }

        total_attempts = len(attempts)
        all_students = set(a["user_id"] for a in attempts)
        unique_students_count = len(all_students)
        
        successful_attempts = [a for a in attempts if a.get("is_correct")]
        students_who_solved = set(a["user_id"] for a in successful_attempts)
        
        overall_solve_rate = len(students_who_solved) / unique_students_count if unique_students_count > 0 else 0
        avg_attempts_per_student = total_attempts / unique_students_count if unique_students_count > 0 else 0
        
        times = [a.get("time_taken_sec", 0) for a in attempts if a.get("time_taken_sec") is not None]
        avg_time = sum(times) / len(times) if times else 0
        
        puzzle_stats = {}
        for pid in puzzle_ids:
            puzzle_stats[pid] = {"title": puzzle_titles[pid], "attempts": 0, "solves": 0}
            
        for attempt in attempts:
            pid = assignment_to_puzzle.get(attempt["assignment_id"])
            if pid in puzzle_stats:
                puzzle_stats[pid]["attempts"] += 1
                if attempt.get("is_correct"):
                    puzzle_stats[pid]["solves"] += 1
                    
        puzzle_performance = [
            {
                "puzzle_id": pid,
                "title": stats["title"],
                "success_rate": stats["solves"] / stats["attempts"] if stats["attempts"] > 0 else 0,
                "total_attempts": stats["attempts"],
                "solves": stats["solves"],
                "failures": stats["attempts"] - stats["solves"]
            }
            for pid, stats in puzzle_stats.items()
        ]
        
        return {
            "total_puzzles": len(puzzle_ids),
            "total_attempts": total_attempts,
            "unique_students": unique_students_count,
            "students_solved": len(students_who_solved),
            "students_failed": unique_students_count - len(students_who_solved),
            "overall_solve_rate": overall_solve_rate,
            "avg_attempts_per_student": avg_attempts_per_student,
            "avg_time_sec": int(avg_time),
            "puzzle_performance": sorted(puzzle_performance, key=lambda x: x["success_rate"], reverse=True)
        }
