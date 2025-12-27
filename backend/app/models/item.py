from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base


class Item(Base):
    __tablename__ = "items"
    
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=False)
    source_item_id = Column(String(200))  # 원문 식별자
    title = Column(String(500), nullable=False)
    published_at = Column(DateTime(timezone=True))
    collected_at = Column(DateTime(timezone=True), server_default=func.now())
    url = Column(String(1000), nullable=False)
    raw_text = Column(Text)
    summary_text = Column(Text)
    category = Column(String(50))  # 행사, 공지, 채용, 지원사업, 안전, 교통, 문화, 축제, 복지, 교육, 환경, 산업
    region = Column(String(100))  # 울산 전체, 중구, 남구, 동구, 북구, 울주군
    tags = Column(JSON)  # Array of tags
    status = Column(String(50), default="collected")  # collected, queued, approved, rejected, posted
    hash_content = Column(String(64), index=True)  # SHA-256 hash for dedup
    hash_url = Column(String(64), index=True)  # URL hash
    image_urls = Column(JSON)  # Array of image URLs
    meta_json = Column(JSON)  # Additional metadata
    score_priority = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
