from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.source import Source
from app.auth import get_current_user, require_role
from app.models.user import User
from app.models.item import Item
from app.models.queue import Queue
from pydantic import BaseModel

router = APIRouter()


class SourceResponse(BaseModel):
    id: int
    name: str
    type: str
    base_url: str
    enabled: bool
    collect_interval: int
    last_collected_at: Optional[datetime] = None
    crawl_policy: Optional[str] = None
    
    class Config:
        from_attributes = True


class SourceCreate(BaseModel):
    name: str
    type: str
    base_url: str
    collect_interval: int = 60
    crawl_policy: str | None = None


@router.get("", response_model=List[SourceResponse])
async def list_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all sources"""
    query = db.query(Source)
    if current_user.role != "admin":
        query = query.filter(Source.user_id == current_user.id)
    return query.all()


from app.models.duplicate import Duplicate

@router.post("", response_model=SourceResponse)
async def create_source(
    source_data: SourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new source (admin only)"""
    # Check for duplicates
    existing_source = db.query(Source).filter(
        Source.base_url == source_data.base_url,
        Source.user_id == current_user.id
    ).first()
    
    if existing_source:
        raise HTTPException(status_code=400, detail="이미 등록된 출처 URL입니다.")

    new_source = Source(
        name=source_data.name,
        type=source_data.type,
        base_url=source_data.base_url,
        collect_interval=source_data.collect_interval,
        crawl_policy=source_data.crawl_policy,
        enabled=False,
        user_id=current_user.id
    )
    db.add(new_source)
    db.commit()
    db.refresh(new_source)
    return new_source


@router.patch("/{source_id}")
async def toggle_source(
    source_id: int,
    enabled: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enable or disable a source (admin only)"""
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Data Isolation check
    if current_user.role != "admin" and source.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    source.enabled = enabled
    db.commit()
    
    return {"message": f"Source {'enabled' if enabled else 'disabled'}", "source_id": source_id}


class SourceUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    base_url: str | None = None
    collect_interval: int | None = None
    crawl_policy: str | None = None
    enabled: bool | None = None


@router.patch("/{source_id}/update", response_model=SourceResponse)
async def update_source(
    source_id: int,
    source_data: SourceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update source details (admin only)"""
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Data Isolation check
    if current_user.role != "admin" and source.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    update_data = source_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(source, key, value)
    
    db.commit()
    db.refresh(source)
    return source


@router.delete("/{source_id}")
async def delete_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a source (admin only)"""
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Data Isolation check
    if current_user.role != "admin" and source.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Delete related items and their queue entries manually before deleting source
    items = db.query(Item).filter(Item.source_id == source_id).all()
    item_ids = [item.id for item in items]
    
    if item_ids:
        # Delete related duplicates
        db.query(Duplicate).filter(
            (Duplicate.item_id.in_(item_ids)) | (Duplicate.duplicate_of_item_id.in_(item_ids))
        ).delete(synchronize_session=False)

        db.query(Queue).filter(Queue.item_id.in_(item_ids)).delete(synchronize_session=False)
        db.query(Item).filter(Item.source_id == source_id).delete(synchronize_session=False)
    
    db.delete(source)
    db.commit()
    
    return {"message": "Source deleted successfully", "source_id": source_id}


@router.post("/{source_id}/collect")
async def trigger_collection(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually trigger collection for a source (admin only)"""
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Data Isolation check
    if current_user.role != "admin" and source.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Set source to enabled on manual trigger
    if not source.enabled:
        source.enabled = True
        db.commit()
    
    try:
        # Import here to avoid circular dependency
        from worker.tasks.collection import collect_source
        from worker.celery_app import celery_app
        import logging
        
        _logger = logging.getLogger(__name__)
        _logger.info(f"Triggering collection for source {source_id} using broker: {celery_app.conf.broker_url}")
        
        task = collect_source.delay(source_id)
        
        return {
            "message": "Collection task triggered",
            "source_id": source_id,
            "task_id": task.id
        }
    except Exception as e:
        import logging
        import socket
        from kombu.exceptions import OperationalError
        
        _logger = logging.getLogger(__name__)
        _logger.error(f"Failed to trigger collection for source {source_id}: {e}")
        
        # More robust checking for Redis/Broker/Connection errors
        error_str = str(e).lower()
        is_conn_error = (
            isinstance(e, (OperationalError, socket.gaierror, ConnectionError)) or
            "connection" in error_str or 
            "refused" in error_str or 
            "timeout" in error_str or 
            "host" in error_str or
            "redis" in error_str
        )
        
        if is_conn_error:
            raise HTTPException(
                status_code=503, 
                detail="Redis 서버에 연결할 수 없습니다. .env 파일의 REDIS_URL이 'localhost'로 되어 있는지, Redis 서비스가 실행 중인지 확인해주세요."
            )
        
        import traceback
        tb = traceback.format_exc()
        raise HTTPException(
            status_code=500,
            detail=f"수집 작업 예약 중 오류가 발생했습니다: {str(e)}\n\nTraceback:\n{tb}"
        )


@router.post("/collect-all")
async def trigger_collect_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trigger collection for all enabled sources (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")
    
    from worker.tasks.collection import collect_all_sources
    collect_all_sources.delay()
    return {"message": "Global collection triggered"}
