from fastapi import APIRouter, Depends
from app.core.database import get_users_collection, get_assignments_collection

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/fix-student-cohorts")
async def fix_student_cohorts():
    """Assign default cohort to all students without one"""
    collection = get_users_collection()
    
    # Update students where cohort_id is missing OR null
    result = await collection.update_many(
        {
            "role": "STUDENT",
            "$or": [
                {"profile.cohort_id": {"$exists": False}},
                {"profile.cohort_id": None}
            ]
        },
        {"$set": {"profile.cohort_id": "default-cohort"}}
    )
    
    return {
        "message": f"Updated {result.modified_count} students",
        "modified_count": result.modified_count
    }

@router.get("/fix-student-cohorts")
async def fix_student_cohorts_get():
    """Assign default cohort to all students without one (GET version for browser)"""
    return await fix_student_cohorts()

@router.get("/debug/users")
async def debug_users():
    """Debug: Show all users with their cohort_id"""
    collection = get_users_collection()
    users = await collection.find({}, {"_id": 0, "email": 1, "role": 1, "profile": 1}).to_list(100)
    return {"users": users}

@router.get("/debug/assignments")
async def debug_assignments():
    """Debug: Show all assignments"""
    collection = get_assignments_collection()
    assignments = await collection.find({}, {"_id": 0}).to_list(100)
    return {"assignments": assignments}

@router.get("/debug/puzzles")
async def debug_puzzles():
    """Debug: Show all puzzles"""
    from app.core.database import get_puzzles_collection
    collection = get_puzzles_collection()
    puzzles = await collection.find({}, {"_id": 0}).to_list(100)
    return {"puzzles": puzzles}

@router.get("/fix-assignments")
async def fix_assignments():
    """Fix assignments to use the correct published puzzle_id"""
    from app.core.database import get_puzzles_collection
    
    puzzles_collection = get_puzzles_collection()
    assignments_collection = get_assignments_collection()
    
    # Get the published puzzle
    published_puzzle = await puzzles_collection.find_one({"status": "PUBLISHED"})
    
    if not published_puzzle:
        return {"error": "No published puzzle found"}
    
    # Update all assignments to use this puzzle_id
    result = await assignments_collection.update_many(
        {},
        {"$set": {"puzzle_id": published_puzzle["puzzle_id"]}}
    )
    
    return {
        "message": f"Updated {result.modified_count} assignments",
        "puzzle_id": published_puzzle["puzzle_id"],
        "puzzle_title": published_puzzle.get("title", "Unknown")
    }
