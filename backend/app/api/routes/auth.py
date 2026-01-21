from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.user import User, UserCreate, UserLogin, UserResponse, UserRole
from app.services.auth_service import AuthService
from app.core.database import get_users_collection
from datetime import datetime
from typing import Optional
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    payload = AuthService.decode_access_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    collection = get_users_collection()
    user_data = await collection.find_one({"user_id": user_id})
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return User(**user_data)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user"""
    collection = get_users_collection()
    
    # Check if user already exists
    existing_user = await collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    password_hash = AuthService.hash_password(user_data.password)
    
    # Create user document
    profile_data = user_data.profile or {}
    if user_data.role == UserRole.STUDENT:
        profile_data["cohort_id"] = "default-cohort"

    user_doc = {
        "user_id": str(uuid.uuid4()),
        "name": user_data.name,
        "email": user_data.email,
        "password_hash": password_hash,
        "role": user_data.role,
        "status": "ACTIVE",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "last_login_at": None,
        "profile": profile_data
    }
    
    await collection.insert_one(user_doc)
    
    return UserResponse(**user_doc)


@router.post("/login")
async def login(credentials: UserLogin):
    """Login and get access token"""
    collection = get_users_collection()
    
    # Find user by email
    user_data = await collection.find_one({"email": credentials.email})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    user = User(**user_data)
    
    # Verify password
    if not AuthService.verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Update last login
    await collection.update_one(
        {"user_id": user.user_id},
        {"$set": {"last_login_at": datetime.utcnow()}}
    )
    
    # Create access token
    access_token = AuthService.create_access_token(
        data={"sub": user.user_id, "role": user.role}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(**user.model_dump())
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(**current_user.model_dump())
