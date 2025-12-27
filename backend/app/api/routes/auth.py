from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List, Any
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.auth import verify_password, create_access_token, get_password_hash, get_current_user, check_user_expiration
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class Token(BaseModel):
    access_token: str
    token_type: str


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "viewer"


class UserSettingsUpdate(BaseModel):
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    perplexity_api_key: Optional[str] = None
    naver_client_id: Optional[str] = None
    naver_client_secret: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    perplexity_api_key: Optional[str] = None
    
    class Config:
        from_attributes = True


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login and get JWT token"""
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username})
    
    # Check if account has expired (block login)
    check_user_expiration(user)
    
    # Update login stats
    from sqlalchemy.sql import func
    user.login_count = (user.login_count or 0) + 1
    user.last_login_at = func.now()
    db.commit()
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=dict)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user (for initial setup)"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Create new user
    from datetime import datetime, timezone, timedelta
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    
    new_user = User(
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role,
        expires_at=expires_at
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User created successfully", "username": new_user.username}



@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Get current user.
    """
    return current_user


@router.patch("/settings", response_model=UserResponse)
async def update_settings(
    settings: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user settings (API keys, etc.)
    """
    if settings.openai_api_key is not None:
        current_user.openai_api_key = settings.openai_api_key
    if settings.gemini_api_key is not None:
        current_user.gemini_api_key = settings.gemini_api_key
    if settings.perplexity_api_key is not None:
        current_user.perplexity_api_key = settings.perplexity_api_key
    
    db.commit()
    db.refresh(current_user)
    return current_user
