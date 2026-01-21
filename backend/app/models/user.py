from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum
from uuid import uuid4


class UserRole(str, Enum):
    STUDENT = "STUDENT"
    INSTRUCTOR = "INSTRUCTOR"
    ADMIN = "ADMIN"


class UserStatus(str, Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    DELETED = "DELETED"


class UserProfile(BaseModel):
    institution: Optional[str] = None
    department: Optional[str] = None
    student_roll: Optional[str] = None
    cohort_id: Optional[str] = None
    preferences: Optional[dict] = {}


class User(BaseModel):
    user_id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    email: EmailStr
    password_hash: str
    role: UserRole = UserRole.STUDENT
    status: UserStatus = UserStatus.ACTIVE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: Optional[datetime] = None
    profile: UserProfile = Field(default_factory=UserProfile)
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "role": "STUDENT"
            }
        }


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.STUDENT
    profile: Optional[UserProfile] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    user_id: str
    name: str
    email: EmailStr
    role: UserRole
    status: UserStatus
    created_at: datetime
    profile: UserProfile
