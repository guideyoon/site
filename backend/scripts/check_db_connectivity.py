#!/usr/bin/env python3
import sys
import os
import time

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("Starting DB connection test...")
try:
    from app.database import engine
    from sqlalchemy import text
    
    print("Engine created. Attempting to connect...")
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print(f"Connection successful! Result: {result.fetchone()}")
        
except Exception as e:
    print(f"❌ Connection failed: {e}")
    sys.exit(1)

print("✅ DB Check complete.")
sys.exit(0)
