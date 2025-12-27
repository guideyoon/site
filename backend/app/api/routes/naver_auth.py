from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.auth import get_current_user
import requests
import secrets
import urllib.parse
from datetime import datetime, timedelta
from fastapi.responses import RedirectResponse
import os

router = APIRouter()

NAVER_AUTH_URL = "https://nid.naver.com/oauth2.0/authorize"
NAVER_TOKEN_URL = "https://nid.naver.com/oauth2.0/token"

@router.get("/login")
def login_naver(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Redirects user to Naver Login page.
    Requires user to have configured Client ID/Secret in Dashboard.
    """
    if not current_user.naver_client_id:
        raise HTTPException(status_code=400, detail="Naver Client ID not configured")
    
    state = secrets.token_urlsafe(16)
    # Store state if necessary, or just rely on simple validation
    
    # Callback URL: Assume standard localhost for now, or configured env
    # For production this should be env var
    redirect_uri = os.getenv("NAVER_CALLBACK_URL", "http://localhost:8000/api/auth/naver/callback")
    
    params = {
        "response_type": "code",
        "client_id": current_user.naver_client_id,
        "redirect_uri": redirect_uri,
        "state": f"{state}:{current_user.id}" # Pass user_id in state to identify user in callback if stateless
    }
    
    url = f"{NAVER_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return {"url": url}

@router.get("/callback")
def callback_naver(code: str, state: str, db: Session = Depends(get_db)):
    """
    Handles Naver OAuth Callback.
    Since this is a backend redirect, we might not have 'current_user' from header easily 
    if browser handles the redirect chain without auth headers.
    
    Strategy: 
    1. Parse user_id from 'state'.
    2. Fetch user.
    3. Exchange token.
    4. Save to DB.
    5. Redirect to Frontend Dashboard.
    """
    try:
        state_token, user_id_str = state.split(":")
        user_id = int(user_id_str)
    except:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    redirect_uri = os.getenv("NAVER_CALLBACK_URL", "http://localhost:8000/api/auth/naver/callback")
    
    # Exchange code for token
    token_params = {
        "grant_type": "authorization_code",
        "client_id": user.naver_client_id,
        "client_secret": user.naver_client_secret,
        "code": code,
        "state": state_token
    }
    
    response = requests.post(NAVER_TOKEN_URL, params=token_params)
    data = response.json()
    
    if "error" in data:
        return RedirectResponse(url=f"http://localhost:3000/dashboard?error={data['error_description']}")
        
    # Save tokens
    user.naver_access_token = data['access_token']
    user.naver_refresh_token = data.get('refresh_token')
    # expires_in is seconds
    user.naver_token_expires_at = datetime.utcnow() + timedelta(seconds=int(data['expires_in']))
    
    db.commit()
    
    return RedirectResponse(url="http://localhost:3000/dashboard?naver_connected=true")

@router.post("/disconnect")
def disconnect_naver(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Disconnects Naver account (clears tokens).
    """
    current_user.naver_access_token = None
    current_user.naver_refresh_token = None
    current_user.naver_token_expires_at = None
    db.commit()
    return {"status": "disconnected"}
