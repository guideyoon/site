from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List, Any, Dict
import requests
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
    print(f"DEBUG: Login attempt for user '{form_data.username}'")
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user:
        print(f"DEBUG: Login failed - User '{form_data.username}' not found in DB")
    else:
        is_valid = verify_password(form_data.password, user.hashed_password)
        print(f"DEBUG: User found. ID: {user.id}, Role: {user.role}")
        print(f"DEBUG: Password check result: {is_valid}")
        # print(f"DEBUG: Input: {form_data.password}, Hash: {user.hashed_password}") # Uncomment for extreme debug only
    
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


@router.get("/api-balance/{provider}")
async def get_api_balance(
    provider: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get API balance for a specific provider.
    """
    if provider == "openai":
        key = current_user.openai_api_key
        if not key:
            raise HTTPException(status_code=400, detail="OpenAI API key matches not found")
        
        try:
            # Note: This is a best-effort check using semi-official endpoints. 
            # Traditional API keys (sk-...) might not have permission for the dashboard billing API.
            # We'll try the usage endpoint as a fallback or indicator.
            headers = {"Authorization": f"Bearer {key}"}
            
            # 1. Use the official usage endpoint to verify the key
            # Standard API keys (sk-...) CANNOT view USD balance due to OpenAI security policies (2024/2025 updated).
            import datetime
            today = datetime.date.today()
            
            # This endpoint confirms if the key is valid and working
            usage_res = requests.get(
                f"https://api.openai.com/v1/usage?date={today}",
                headers=headers,
                timeout=5
            )
            
            if usage_res.status_code == 200:
                return {
                    "provider": "openai",
                    "status": "success",
                    "message": "API 키가 활성화되어 있습니다. (금액은 정책상 빌링 페이지에서만 확인 가능)",
                    "billing_url": "https://platform.openai.com/settings/organization/billing/overview"
                }

            return {
                "provider": "openai",
                "status": "restricted",
                "message": "사용량 정보를 가져올 수 없습니다. 빌링 페이지에서 확인해 주세요.",
                "billing_url": "https://platform.openai.com/settings/organization/billing/overview"
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
            
    elif provider == "gemini":
        return {
            "provider": "gemini",
            "status": "unsupported",
            "message": "Gemini는 API를 통한 직접 잔액 조회를 지원하지 않습니다.",
            "billing_url": "https://aistudio.google.com/app/billing"
        }
    
    elif provider == "perplexity":
        return {
            "provider": "perplexity",
            "status": "unsupported",
            "message": "Perplexity는 API를 통한 직접 잔액 조회를 지원하지 않습니다.",
            "billing_url": "https://www.perplexity.ai/settings/api"
        }
    
    else:
        raise HTTPException(status_code=404, detail="Unknown provider")


class GoogleLoginRequest(BaseModel):
    id_token: str


GOOGLE_CLIENT_ID = "112977498602-ec7c5f4061cred2utcdajk614388igd8.apps.googleusercontent.com"


@router.post("/google", response_model=Token)
async def google_login(
    request: GoogleLoginRequest,
    db: Session = Depends(get_db)
):
    """Google Social Login"""
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    
    print(f"DEBUG: Received Google Token (length: {len(request.id_token)})")
    try:
        # 1. Try to verify as ID Token first (JWT)
        try:
            print("DEBUG: Attempting ID Token verification...")
            idinfo = id_token.verify_oauth2_token(
                request.id_token, 
                google_requests.Request(), 
                GOOGLE_CLIENT_ID
            )
            print(f"DEBUG: ID Token verification success for {idinfo.get('email')}")
            email = idinfo['email']
        except Exception as e:
            print(f"DEBUG: ID Token verification failed: {str(e)}")
            # 2. If ID Token verification fails, assume it's an Access Token (implicit flow)
            print("DEBUG: Attempting Access Token (userinfo) verification...")
            userinfo_res = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                params={"access_token": request.id_token}
            )
            if not userinfo_res.ok:
                print(f"DEBUG: Userinfo request failed: {userinfo_res.status_code} - {userinfo_res.text}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid Google token ({userinfo_res.status_code})"
                )
            userinfo = userinfo_res.json()
            email = userinfo.get('email')
            print(f"DEBUG: Access Token verification success for {email}")
            if not email:
                print("DEBUG: No email in userinfo response")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not retrieve email from Google"
                )
        
        # Check if user already exists
        user = db.query(User).filter(User.username == email).first()
        
        if not user:
            # Create new user for social login
            from datetime import datetime, timezone, timedelta
            import secrets
            import string
            
            # Generate a random password for social users (they won't use it, but DB requires it)
            random_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(20))
            expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            
            user = User(
                username=email,
                hashed_password=get_password_hash(random_password),
                role="viewer",
                expires_at=expires_at
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Create JWT token
        access_token = create_access_token(data={"sub": user.username})
        
        # Update login stats
        from sqlalchemy.sql import func
        user.login_count = (user.login_count or 0) + 1
        user.last_login_at = func.now()
        db.commit()
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except ValueError as e:
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google ID token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
