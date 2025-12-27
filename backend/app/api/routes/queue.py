from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.models.queue import Queue
from app.models.item import Item
from app.auth import get_current_user, require_role
from app.models.user import User
from app.services.template_service import generate_cafe_post
from pydantic import BaseModel

router = APIRouter()


class QueueResponse(BaseModel):
    id: int
    item_id: int
    scheduled_at: datetime | None
    approved_by: int | None
    approved_at: datetime | None
    note_editor: str | None
    export_format: str
    item_title: str
    item_category: str | None
    
    class Config:
        from_attributes = True


class ApproveRequest(BaseModel):
    note: str | None = None


@router.get("", response_model=List[QueueResponse])
async def list_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all items in queue"""
    query = db.query(Queue).join(Item)
    if current_user.role != "admin":
        query = query.filter(Item.user_id == current_user.id)
    queue_items = query.all()
    
    result = []
    for q in queue_items:
        item = db.query(Item).filter(Item.id == q.item_id).first()
        result.append({
            "id": q.id,
            "item_id": q.item_id,
            "scheduled_at": q.scheduled_at,
            "approved_by": q.approved_by,
            "approved_at": q.approved_at,
            "note_editor": q.note_editor,
            "export_format": q.export_format,
            "item_title": item.title if item else "",
            "item_category": item.category if item else None
        })
    
    return result


@router.post("/{queue_id}/approve")
async def approve_queue_item(
    queue_id: int,
    request: ApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve a queue item and generate export payload"""
    queue_item = db.query(Queue).filter(Queue.id == queue_id).first()
    if not queue_item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    
    item = db.query(Item).filter(Item.id == queue_item.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Data Isolation check
    if current_user.role != "admin" and item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Generate cafe post
    payload = generate_cafe_post(item)
    
    # Update queue
    queue_item.approved_by = current_user.id
    queue_item.approved_at = datetime.utcnow()
    queue_item.note_editor = request.note
    queue_item.payload_text = payload
    
    # Update item status
    item.status = "approved"
    
    db.commit()
    
    return {
        "message": "Item approved",
        "queue_id": queue_id,
        "payload_text": payload
    }


@router.post("/{queue_id}/reject")
async def reject_queue_item(
    queue_id: int,
    request: ApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject a queue item"""
    queue_item = db.query(Queue).filter(Queue.id == queue_id).first()
    if not queue_item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    
    item = db.query(Item).filter(Item.id == queue_item.item_id).first()
    if item:
        # Data Isolation check
        if current_user.role != "admin" and item.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Permission denied")
        item.status = "rejected"
    
    queue_item.note_editor = request.note
    
    db.delete(queue_item)
    db.commit()
    
    return {"message": "Item rejected", "queue_id": queue_id}


@router.get("/export/{queue_id}")
async def export_queue_item(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get export payload for approved item"""
    queue_item = db.query(Queue).filter(Queue.id == queue_id).first()
    if not queue_item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    
    if not queue_item.payload_text:
        item = db.query(Item).filter(Item.id == queue_item.item_id).first()
        if item:
            # Data Isolation check
            if current_user.role != "admin" and item.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Permission denied")
            payload = generate_cafe_post(item)
            queue_item.payload_text = payload
            db.commit()
        else:
            raise HTTPException(status_code=404, detail="Item not found")
    else:
        # Check ownership even if payload exists
        item = db.query(Item).filter(Item.id == queue_item.item_id).first()
        if item and current_user.role != "admin" and item.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Permission denied")
    
    return {
        "queue_id": queue_id,
        "payload_text": queue_item.payload_text,
        "export_format": queue_item.export_format
    }
