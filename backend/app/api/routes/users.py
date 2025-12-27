from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from app.database import get_db
from app.models.user import User
from app.auth import get_current_user, require_role
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    login_count: int = 0

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    role: Optional[str] = None
    expires_at: Optional[Any] = None # Allow strings or datetimes

@router.get("/", response_model=List[UserResponse])
async def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """List all users (Admin only)"""
    return db.query(User).all()

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Update user role and expiration (Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.model_dump(exclude_unset=True)
    
    if "role" in update_data:
        role = update_data["role"]
        if role not in ["admin", "editor", "viewer"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        user.role = role
    
    if "expires_at" in update_data:
        val = update_data["expires_at"]
        if isinstance(val, str) and val:
            try:
                # Handle ISO format from frontend (e.g. 2025-12-24T23:59:59)
                from datetime import datetime, timezone
                dt = datetime.fromisoformat(val)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                user.expires_at = dt
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format")
        else:
            user.expires_at = val
        
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Delete a user (Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}
