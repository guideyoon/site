from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Queue(Base):
    __tablename__ = "queue"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False, unique=True)
    scheduled_at = Column(DateTime(timezone=True))
    approved_by = Column(Integer, ForeignKey("users.id"))
    approved_at = Column(DateTime(timezone=True))
    note_editor = Column(Text)  # Editor notes
    export_format = Column(String(50), default="naver_cafe_markdown")
    payload_text = Column(Text)  # Final generated post content
