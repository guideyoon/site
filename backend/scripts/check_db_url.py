import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.database import engine
from sqlalchemy import text

def check():
    print("----- DEBUG DB CONNECTION -----")
    print(f"ENV DATABASE_URL: {os.getenv('DATABASE_URL')}")
    print(f"SETTINGS DATABASE_URL: {settings.DATABASE_URL}")
    print(f"ENGINE URL: {engine.url}")
    
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT count(*) FROM users"))
            print(f"USER COUNT: {result.scalar()}")
            
            # Check for admin specifically
            result = connection.execute(text("SELECT username, role, hashed_password FROM users WHERE username = 'admin'"))
            row = result.first()
            if row:
                print(f"ADMIN FOUND: {row}")
            else:
                print("ADMIN NOT FOUND in this DB")
    except Exception as e:
        print(f"DB CONNECTION ERROR: {e}")
    print("-------------------------------")

if __name__ == "__main__":
    check()
