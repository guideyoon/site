from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    import hashlib
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password


def get_password_hash(password: str) -> str:
    """Hash a password"""
    import hashlib
    # Simple SHA256 hash for development (not production-grade)
    return hashlib.sha256(password.encode()).hexdigest()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def check_user_expiration(user: User):
    """Check if a user account has expired"""
    print(f"DEBUG: Checking expiration for {user.username}. expires_at: {user.expires_at}")
    if user.expires_at:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        expires_at = user.expires_at
        
        # Ensure expires_at is aware
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        print(f"DEBUG: now={now}, expires_at={expires_at}")
        if now > expires_at:
            print(f"DEBUG: {user.username} EXPIRED!")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="사용 기간이 만료되었습니다. 관리자에게 문의하세요. (Your account has expired. Please contact the administrator.)"
            )
        else:
            print(f"DEBUG: {user.username} NOT EXPIRED")
    else:
        print(f"DEBUG: {user.username} has NO expiration date")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    
    # Check if account has expired
    check_user_expiration(user)
            
    return user


def require_role(required_role: str):
    """Dependency to check if user has required role"""
    async def role_checker(current_user: User = Depends(get_current_user)):
        role_hierarchy = {"viewer": 0, "editor": 1, "admin": 2}
        if role_hierarchy.get(current_user.role, 0) < role_hierarchy.get(required_role, 999):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker
