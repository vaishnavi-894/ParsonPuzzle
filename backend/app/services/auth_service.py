from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
from typing import Optional
from app.core.config import settings
from app.models.user import User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def decode_access_token(token: str) -> Optional[dict]:
        """Decode and verify a JWT token"""
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            return payload
        except (jwt.InvalidTokenError, jwt.ExpiredSignatureError, jwt.DecodeError):
            return None
    
    @staticmethod
    def check_role_permission(user: User, required_role: UserRole) -> bool:
        """Check if user has required role permission"""
        role_hierarchy = {
            UserRole.ADMIN: 3,
            UserRole.INSTRUCTOR: 2,
            UserRole.STUDENT: 1
        }
        return role_hierarchy.get(user.role, 0) >= role_hierarchy.get(required_role, 0)
