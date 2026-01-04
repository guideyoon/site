from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import requests
import re
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.item import Item
from app.models.source import Source
from app.models.queue import Queue
from app.models.duplicate import Duplicate
from app.auth import get_current_user, require_role
from app.models.user import User
from pydantic import BaseModel

router = APIRouter()


class ItemResponse(BaseModel):
    id: int
    source_id: int
    source_name: Optional[str]
    title: str
    published_at: Optional[datetime]
    collected_at: datetime
    url: str
    summary_text: Optional[str]
    category: Optional[str]
    source_type: Optional[str]
    region: Optional[str]
    tags: Optional[list]
    status: str
    image_urls: Optional[list]
    thumbnail_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class ItemDetail(ItemResponse):
    source_url: str
    raw_text: Optional[str]
    source_item_id: Optional[str]
    hash_content: Optional[str]
    meta_json: Optional[dict]
    score_priority: int
    duplicates: List[dict] = []
    
    class Config:
        from_attributes = True


class ItemUpdate(BaseModel):
    title: Optional[str] = None
    summary_text: Optional[str] = None
    category: Optional[str] = None
    region: Optional[str] = None
    tags: Optional[list] = None


class BulkDeleteRequest(BaseModel):
    item_ids: List[int]


@router.get("/stats")
async def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get collection statistics for the dashboard"""
    from sqlalchemy import func
    import datetime
    from datetime import timedelta
    
    # We define 'today' as the last 24 hours to be safe against timezone shifts 
    # and ensure the user sees recent progress.
    now = datetime.datetime.now()
    twenty_four_hours_ago = now - timedelta(hours=24)
    
    # Base query for the current user (Isolation)
    base_query = db.query(Item)
    if current_user.role != "admin":
        base_query = base_query.filter(Item.user_id == current_user.id)
        
    # Today's collected items (within last 24h)
    collected_today = base_query.filter(Item.collected_at >= twenty_four_hours_ago).count()
    
    # Failed items (total)
    failed_count = base_query.filter(Item.status == "failed").count()
    
    return {
        "collected_today": collected_today,
        "failed": failed_count,
        "pending_approval": 0 # Kept for compatibility but we will remove from UI
    }


@router.get("", response_model=List[ItemResponse])
async def list_items(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    type: Optional[str] = Query(None), # Source type filter
    region: Optional[str] = Query(None),
    source_id: Optional[int] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    q: Optional[str] = Query(None),  # Search query
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of items with optional filters"""
    query = db.query(Item, Source.name.label('source_name'), Source.type.label('source_type')).outerjoin(Source, Item.source_id == Source.id)
    
    # Apply filters
    if status:
        query = query.filter(Item.status == status)
    else:
        # Default: Exclude deleted items
        query = query.filter(Item.status != "deleted")
        
    if category:
        query = query.filter(Item.category == category)
    if type:
        query = query.filter(Source.type == type)
    if region:
        query = query.filter(Item.region == region)
    if source_id:
        query = query.filter(Item.source_id == source_id)
    if date_from:
        query = query.filter(Item.published_at >= date_from)
    if date_to:
        query = query.filter(Item.published_at <= date_to)
    if q:
        query = query.filter(Item.title.ilike(f"%{q}%"))
    
    # Data Isolation: Filter by current user
    # Admin can see everything, others only their own
    if current_user.role != "admin":
        query = query.filter(Item.user_id == current_user.id)
    
    # Order by published_at descending (newest first), then collected_at
    query = query.order_by(Item.published_at.desc().nullslast(), Item.collected_at.desc())
    
    print(f"[DEBUG API] User: {current_user.username} (ID: {current_user.id}, Role: {current_user.role})")
    print(f"[DEBUG API] Filtering for User ID: {current_user.id if current_user.role != 'admin' else 'ALL'}")
    
    results = query.offset(skip).limit(limit).all()
    print(f"[DEBUG API] Results Count: {len(results)}")
    if results:
        print(f"[DEBUG API] First Item ID: {results[0][0].id}, Title: {results[0][0].title}")
    
    # Format response
    items_response = []
    for item, source_name, source_type in results:
        # Get thumbnail from first image
        thumbnail = None
        if item.image_urls and len(item.image_urls) > 0:
            thumbnail = item.image_urls[0]

        item_dict = {
            "id": item.id,
            "source_id": item.source_id,
            "source_name": source_name or "삭제된 출처",
            "source_type": source_type or "알 수 없음",
            "title": item.title,
            "published_at": item.published_at,
            "collected_at": item.collected_at,
            "url": item.url,
            "summary_text": item.summary_text,
            "category": item.category,
            "region": item.region,
            "tags": item.tags,
            "status": item.status,
            "image_urls": item.image_urls,
            "thumbnail_url": thumbnail
        }
        items_response.append(item_dict)
    
    return items_response


@router.get("/download-proxy")
async def download_proxy(
    url: str,
    filename: Optional[str] = Query(None),
    referer: Optional[str] = Query(None)
):
    """Proxy for downloading external files to avoid CORS and force attachment"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Save whether filename was explicitly requested
    is_download = filename is not None
    
    try:
        # Auto-detect referer if not provided
        if not referer:
            if "pstatic.net" in url or "naver.com" in url:
                referer = "https://m.blog.naver.com/"
            elif "ulsan.go.kr" in url:
                referer = "https://www.ulsan.go.kr/"
            elif "cdninstagram.com" in url:
                referer = "https://www.threads.net/"

        # Handle Ulsan HHBbs links
        if "HHBbs.EncDownFile" in url:
            logger.info(f"Detected HHBbs link: {url}")
            match = re.search(r"HHBbs\.EncDownFile\('.+?','(.+?)','(.+?)','(.+?)'\)", url)
            if match:
                bbs_id, atch_file_id, file_sn = match.groups()
                url = f"https://www.ulsan.go.kr/u/enc/media/bbsFileDown.do?bbsId={bbs_id}&atchFileId={atch_file_id}&fileSn={file_sn}"
                logger.info(f"Resolved HHBbs link to: {url}")
        
        # Ensure URL is absolute for Ulsan
        if url.startswith("/"):
            url = f"https://www.ulsan.go.kr{url}"
        
        logger.info(f"Proxying: {url} (Referer: {referer}, Download: {is_download})")
        
        # Threads images specifically often like no referer or specific referer
        # If referer is provided from query, we use it.
        
        # Add a proper User-Agent and Referer to avoid being blocked
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": referer if referer else ""
        }
        
        # Use a session to handle cookies if needed
        session = requests.Session()
        response = session.get(url, stream=True, timeout=15, headers=headers, verify=False)
        
        if response.status_code != 200:
            logger.error(f"Proxy failed for {url}: status {response.status_code}")
            # Try once without referer as fallback
            if referer:
                logger.info(f"Retrying without referer for {url}")
                del headers["Referer"]
                response = session.get(url, stream=True, timeout=15, headers=headers, verify=False)

        response.raise_for_status()
        logger.info(f"Proxy SUCCESS for {url}: {response.status_code}, Type: {response.headers.get('Content-Type')}")
        
        # Determine filename if not provided (needed for media_type or logs)
        if not filename:
            cd = response.headers.get("Content-Disposition")
            if cd and "filename=" in cd:
                import urllib.parse
                filename_match = re.search(r"filename\*=UTF-8''(.+)", cd)
                if filename_match:
                    filename = urllib.parse.unquote(filename_match.group(1))
                else:
                    filename = re.findall(r'filename="?([^";]+)"?', cd)[0]
            else:
                filename = url.split("/")[-1].split("?")[0] or "download"
        
        filename = filename.replace('"', '').replace("'", "")
        
        # Use inline for images by default or if not explicitly requested
        disposition = "inline"
        if is_download:
            disposition = f'attachment; filename="{filename}"'

        return StreamingResponse(
            response.iter_content(chunk_size=1024 * 64),
            media_type=response.headers.get("Content-Type", "application/octet-stream"),
            headers={
                "Content-Disposition": disposition,
                "Access-Control-Expose-Headers": "Content-Disposition",
                "Cache-Control": "public, max-age=3600"
            }
        )
    except Exception as e:
        logger.error(f"Download proxy error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Download failed: {str(e)}")


@router.get("/{item_id}", response_model=ItemDetail)
async def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get item detail by ID"""
    result = db.query(Item, Source).join(Source, Item.source_id == Source.id).filter(Item.id == item_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item, source = result
    
    # Data Isolation check
    if current_user.role != "admin" and item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Get duplicates
    duplicates = db.query(Duplicate).filter(Duplicate.item_id == item_id).all()
    duplicate_list = []
    for dup in duplicates:
        dup_item = db.query(Item).filter(Item.id == dup.duplicate_of_item_id).first()
        if dup_item:
            duplicate_list.append({
                "id": dup_item.id,
                "title": dup_item.title,
                "url": dup_item.url,
                "similarity": dup.similarity
            })
    
    item_dict = {
        "id": item.id,
        "source_id": item.source_id,
        "source_name": source.name,
        "source_type": source.type,
        "source_url": source.base_url,
        "title": item.title,
        "published_at": item.published_at,
        "collected_at": item.collected_at,
        "url": item.url,
        "summary_text": item.summary_text,
        "category": item.category,
        "region": item.region,
        "tags": item.tags,
        "status": item.status,
        "image_urls": item.image_urls,
        "thumbnail_url": item.image_urls[0] if item.image_urls and len(item.image_urls) > 0 else None,
        "raw_text": item.raw_text,
        "source_item_id": item.source_item_id,
        "hash_content": item.hash_content,
        "meta_json": item.meta_json,
        "score_priority": item.score_priority,
        "duplicates": duplicate_list
    }
    
    return item_dict


@router.patch("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: int,
    item_update: ItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update item fields (requires editor role)"""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Data Isolation check
    if current_user.role != "admin" and item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Update fields
    if item_update.title is not None:
        item.title = item_update.title
    if item_update.summary_text is not None:
        item.summary_text = item_update.summary_text
    if item_update.category is not None:
        item.category = item_update.category
    if item_update.region is not None:
        item.region = item_update.region
    if item_update.tags is not None:
        item.tags = item_update.tags
    
    db.commit()
    db.refresh(item)
    return item


@router.post("/{item_id}/queue")
async def add_to_queue(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add item to approval queue (requires editor role)"""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Data Isolation check
    if current_user.role != "admin" and item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Check if already in queue
    existing = db.query(Queue).filter(Queue.item_id == item_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Item already in queue")
    
    # Create queue entry
    queue_entry = Queue(item_id=item_id)
    db.add(queue_entry)
    
    # Update item status
    item.status = "queued"
    
    db.commit()
    db.refresh(queue_entry)
    
    return {"message": "Item added to queue", "queue_id": queue_entry.id}


@router.delete("/{item_id}")
async def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a single item"""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Data Isolation check
    if current_user.role != "admin" and item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Soft Delete: Update status to 'deleted'
    item.status = "deleted"
    
    # Clean up associated data but keep the Item for dedup check
    # Check if in queue (delete from queue first)
    db.query(Queue).filter(Queue.item_id == item_id).delete()
    # Delete duplicates references
    db.query(Duplicate).filter(Duplicate.item_id == item_id).delete()
    db.query(Duplicate).filter(Duplicate.duplicate_of_item_id == item_id).delete()
    
    db.commit()
    return {"message": "Item deleted successfully"}


@router.post("/bulk-delete")
async def bulk_delete_items(
    request: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete multiple items"""
    items = db.query(Item).filter(Item.id.in_(request.item_ids))
    
    # Data Isolation: Only select items belonging to the user
    if current_user.role != "admin":
        items = items.filter(Item.user_id == current_user.id)
    
    item_list = items.all()
    found_ids = [i.id for i in item_list]
    
    if not found_ids:
        return {"message": "No valid items found to delete", "deleted_count": 0}
    
    # Clean up associated data
    db.query(Queue).filter(Queue.item_id.in_(found_ids)).delete(synchronize_session=False)
    db.query(Duplicate).filter(Duplicate.item_id.in_(found_ids)).delete(synchronize_session=False)
    db.query(Duplicate).filter(Duplicate.duplicate_of_item_id.in_(found_ids)).delete(synchronize_session=False)
    
    # Soft delete: update status
    # We iterate because update with 'in_' and 'synchronize_session=False' is efficient
    deleted_count = items.update({Item.status: "deleted"}, synchronize_session=False)
    db.commit()
    
    return {"message": f"Successfully deleted {deleted_count} items", "deleted_count": deleted_count}


@router.post("/delete-all")
async def delete_all_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all items for the current user"""
    query = db.query(Item)
    
    # Data Isolation: Only delete own items unless admin
    if current_user.role != "admin":
        query = query.filter(Item.user_id == current_user.id)
    
    # Get all matching item IDs for cleanup
    item_ids = [i[0] for i in query.with_entities(Item.id).all()]
    
    if not item_ids:
        return {"message": "No items to delete", "deleted_count": 0}
    
    # Clean up associated data
    db.query(Queue).filter(Queue.item_id.in_(item_ids)).delete(synchronize_session=False)
    db.query(Duplicate).filter(Duplicate.item_id.in_(item_ids)).delete(synchronize_session=False)
    db.query(Duplicate).filter(Duplicate.duplicate_of_item_id.in_(item_ids)).delete(synchronize_session=False)
    
    # Soft delete all
    deleted_count = query.update({Item.status: "deleted"}, synchronize_session=False)
    db.commit()
    
    return {"message": f"Successfully deleted all {deleted_count} items", "deleted_count": deleted_count}
