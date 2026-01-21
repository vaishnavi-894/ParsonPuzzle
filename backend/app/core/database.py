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


# Collection getters
def get_users_collection():
    return Database.get_db()["users"]

def get_cohorts_collection():
    return Database.get_db()["cohorts"]

def get_puzzles_collection():
    return Database.get_db()["puzzles"]

def get_puzzle_blocks_collection():
    return Database.get_db()["puzzle_blocks"]

def get_assignments_collection():
    return Database.get_db()["assignments"]

def get_attempts_collection():
    return Database.get_db()["attempts"]
