# ── Windows WMI hang fix ─────────────────────────────────────────────────────
# pymongo 4.x calls platform._wmi_query() (a PowerShell subprocess) to build
# client handshake metadata.  On some Windows 11 builds this hangs forever.
# Patching it before the motor import prevents the hang with no runtime impact.
import platform as _platform
# Patch win32_ver to avoid a hanging WMI/PowerShell subprocess call that
# pymongo triggers on some Windows 11 builds when building client metadata.
_platform.win32_ver = lambda release='', version='', csd='', ptype='': ('11', '10.0.26200', '', '')  # type: ignore[attr-defined]
if hasattr(_platform, '_wmi_query'):
    _platform._wmi_query = lambda table, *keys: ('' for _ in keys)  # type: ignore[attr-defined]

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from typing import Optional

class Database:
    client: Optional[AsyncIOMotorClient] = None
    
    @classmethod
    async def connect_db(cls):
        """Connect to MongoDB"""
        cls.client = AsyncIOMotorClient(settings.MONGODB_URI)
        print(f"Connected to MongoDB at {settings.MONGODB_URI}")
    
    @classmethod
    async def close_db(cls):
        """Close MongoDB connection"""
        if cls.client:
            cls.client.close()
            print("Closed MongoDB connection")
    
    @classmethod
    def get_db(cls):
        """Get database instance"""
        if cls.client is None:
            raise Exception("Database not connected")
        return cls.client[settings.MONGODB_DB_NAME]
    
    @classmethod
    async def init_db(cls):
        """Initialize database with collections and indexes"""
        db = cls.get_db()
        
        # User indexes
        users = db["users"]
        await users.create_index("email", unique=True)
        
        # Puzzle indexes
        puzzles = db["puzzles"]
        await puzzles.create_index("puzzle_id", unique=True)
        
        # Assignment indexes
        assignments = db["assignments"]
        await assignments.create_index("assignment_id", unique=True)
        await assignments.create_index("cohort_id")
        await assignments.create_index("puzzle_id")
        
        # Attempt indexes
        attempts = db["attempts"]
        await attempts.create_index("attempt_id", unique=True)
        await attempts.create_index("user_id")
        await attempts.create_index("assignment_id")
        
        # Puzzle Block indexes
        puzzle_blocks = db["puzzle_blocks"]
        await puzzle_blocks.create_index("puzzle_id")
        
        print(f"Database {settings.MONGODB_DB_NAME} initialized with 5 collections")
        
# Collection getters
def get_users_collection():
    return Database.get_db()["users"]

def get_puzzles_collection():
    return Database.get_db()["puzzles"]

def get_puzzle_blocks_collection():
    return Database.get_db()["puzzle_blocks"]

def get_assignments_collection():
    return Database.get_db()["assignments"]

def get_attempts_collection():
    return Database.get_db()["attempts"]
