from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
from uuid import uuid4
from datetime import datetime

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "static", "uploads")

@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    """Upload an image file and return its URL"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Create upload directory if it doesn't exist
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{datetime.now().strftime('%Y%m%d')}_{uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Return URL relative to server root
        return {"url": f"/static/uploads/{filename}", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
