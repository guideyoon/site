import sys
import os

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import engine, Base
from app.models.user import User
from app.models.source import Source
from app.models.item import Item
from app.models.queue import Queue

def init_db():
    print("데이터베이스 테이블 생성 중...")
    Base.metadata.create_all(bind=engine)
    print("완료!")

if __name__ == "__main__":
    init_db()
