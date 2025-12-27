import hashlib
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models.item import Item
from app.models.duplicate import Duplicate


def generate_url_hash(url: str) -> str:
    """Generate SHA-256 hash of URL"""
    return hashlib.sha256(url.encode('utf-8')).hexdigest()


def generate_content_hash(text: str) -> str:
    """Generate SHA-256 hash of content"""
    # Normalize text: remove whitespace, lowercase
    normalized = ''.join(text.split()).lower()
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()


def calculate_similarity(text1: str, text2: str) -> float:
    """
    Calculate simple similarity between two texts
    Using character-level intersection over union
    """
    if not text1 or not text2:
        return 0.0
    
    # Simple character set comparison
    set1 = set(text1.lower())
    set2 = set(text2.lower())
    
    intersection = len(set1 & set2)
    union = len(set1 | set2)
    
    if union == 0:
        return 0.0
    
    return intersection / union


def find_duplicates(db: Session, item: Item, similarity_threshold: float = 0.8) -> List[Tuple[int, float]]:
    """
    Find duplicate candidates for an item
    Returns list of (item_id, similarity) tuples
    """
    duplicates = []
    
    # First check URL hash (exact match)
    url_match = db.query(Item).filter(
        Item.hash_url == item.hash_url,
        Item.id != item.id
    ).first()
    
    if url_match:
        duplicates.append((url_match.id, 1.0))
        return duplicates
    
    # Check content hash (exact match)
    content_match = db.query(Item).filter(
        Item.hash_content == item.hash_content,
        Item.id != item.id
    ).first()
    
    if content_match:
        duplicates.append((content_match.id, 1.0))
        return duplicates
    
    # Check by title similarity (more expensive)
    recent_items = db.query(Item).filter(
        Item.id != item.id,
        Item.source_id == item.source_id  # Same source
    ).order_by(Item.collected_at.desc()).limit(100).all()
    
    for other_item in recent_items:
        similarity = calculate_similarity(item.title, other_item.title)
        if similarity >= similarity_threshold:
            duplicates.append((other_item.id, similarity))
    
    return duplicates


def process_deduplication(db: Session, item: Item) -> int:
    """
    Process deduplication for an item
    Returns number of duplicates found
    """
    duplicates = find_duplicates(db, item)
    
    for duplicate_id, similarity in duplicates:
        # Check if already recorded
        existing = db.query(Duplicate).filter(
            Duplicate.item_id == item.id,
            Duplicate.duplicate_of_item_id == duplicate_id
        ).first()
        
        if not existing:
            dup_record = Duplicate(
                item_id=item.id,
                duplicate_of_item_id=duplicate_id,
                similarity=similarity
            )
            db.add(dup_record)
    
    db.commit()
    return len(duplicates)
