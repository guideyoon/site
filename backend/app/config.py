from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str
    
    # OpenAI (optional)
    OPENAI_API_KEY: Optional[str] = None
    
    # Summarization
    SUMMARY_MODE: str = "rule"  # 'rule' or 'llm'
    
    # Collection
    COLLECT_INTERVAL_MINUTES: int = 5
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    class Config:
        # Look for .env in current directory, parent directory, and backend directory
        # This handles running from root, running from backend/, and Docker
        env_file = [".env", "../.env", "backend/.env"]
        case_sensitive = False
        extra = "ignore"


settings = Settings()
