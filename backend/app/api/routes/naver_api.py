from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.auth import get_current_user
import requests
import json
from datetime import datetime

router = APIRouter()

BASE_URL = "https://openapi.naver.com/v1/cafe"

def refresh_token_if_needed(user: User, db: Session):
    """
    Refreshes Naver Access Token if expired or about to expire.
    """
    if not user.naver_token_expires_at or user.naver_token_expires_at < datetime.utcnow():
        # Refresh logic
        if not user.naver_refresh_token:
            raise HTTPException(status_code=401, detail="Naver login required (no refresh token)")
            
        params = {
            "grant_type": "refresh_token",
            "client_id": user.naver_client_id,
            "client_secret": user.naver_client_secret,
            "refresh_token": user.naver_refresh_token
        }
        resp = requests.post("https://nid.naver.com/oauth2.0/token", params=params)
        data = resp.json()
        
        if "access_token" in data:
            user.naver_access_token = data['access_token']
            # Some refresh responses might update refresh_token too
            if 'refresh_token' in data:
                user.naver_refresh_token = data['refresh_token']
            
            # Update expiry (if provided, otherwise assume 1 hour)
            expires_in = int(data.get('expires_in', 3600))
            user.naver_token_expires_at = datetime.utcnow() + datetime.timedelta(seconds=expires_in)
            db.commit()
        else:
             raise HTTPException(status_code=401, detail="Failed to refresh Naver token")

@router.post("/{club_id}/menu/{menu_id}/articles")
def write_post(
    club_id: str, 
    menu_id: str, 
    subject: str = Form(...),
    content: str = Form(...),
    images: List[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Writes a post to Naver Cafe.
    Multipart request to support images.
    """
    refresh_token_if_needed(current_user, db)
    
    url = f"{BASE_URL}/{club_id}/menu/{menu_id}/articles"
    headers = {"Authorization": f"Bearer {current_user.naver_access_token}"}
    
    # Naver API format:
    # subject: URL encoded + MS949 (managed by logic or just standard?)
    # Official docs say: subject/content params. 
    # For multipart: 'image' fields. limits: 10MB per image.
    
    # NOTE: Python requests automatic multipart handles encoding usually. 
    # But Naver docs specify subject/content in the multipart form data.
    
    data = {
        "subject": subject,
        "content": content
    }
    
    files = []
    if images:
        for img in images:
            # ('image', (filename, file_obj, content_type))
            files.append(('image', (img.filename, img.file, img.content_type)))
            
    # Naver API allows up to certain number of images.
    
    try:
        response = requests.post(url, headers=headers, data=data, files=files)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        error_detail = response.text
        try:
            error_json = response.json()
            error_detail = error_json.get('errorMessage', error_detail)
            error_code = error_json.get('errorCode', '')
            if error_code == '024':
                 raise HTTPException(status_code=403, detail="Authentication failed (Check API permissions)")
        except:
            pass
        raise HTTPException(status_code=400, detail=f"Naver API Error: {error_detail}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
def check_status(current_user: User = Depends(get_current_user)):
    """
    Checks if Naver is connected.
    """
    connected = False
    if current_user.naver_access_token:
        connected = True # Simple check
    
    return {
        "connected": connected,
        "client_id_configured": bool(current_user.naver_client_id)
    }
