from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(200), nullable=False)
    role = Column(String(50), default="viewer")  # admin, editor, viewer
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    login_count = Column(Integer, default=0)
    
    # AI API Keys
    openai_api_key = Column(String(200), nullable=True)
    gemini_api_key = Column(String(200), nullable=True)
    perplexity_api_key = Column(String(200), nullable=True)
