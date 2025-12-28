from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Source(Base):
    __tablename__ = "sources"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    type = Column(String(50), nullable=False)  # 기관사이트, rss, api, instagram
    base_url = Column(String(500), nullable=False)
    enabled = Column(Boolean, default=False)
    collect_interval = Column(Integer, default=60)  # minutes
    last_collected_at = Column(DateTime(timezone=True), nullable=True)
    crawl_policy = Column(Text)  # JSON string for crawl configuration
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
