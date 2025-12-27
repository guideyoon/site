#!/usr/bin/env python3
"""
Initialize the Ulsan Content Collection Platform

This script creates an initial admin user for the platform.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User
from app.auth import get_password_hash
import argparse


def create_admin(username: str, password: str):
    """Create an admin user"""
    db = SessionLocal()
    try:
        # Check if user already exists
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            print(f"❌ User '{username}' already exists!")
            return False
        
        # Create new admin user
        new_user = User(
            username=username,
            hashed_password=get_password_hash(password),
            role="admin"
        )
        db.add(new_user)
        db.commit()
        
        print(f"✅ Admin user '{username}' created successfully!")
        print(f"   Role: admin")
        print(f"   You can now login at http://localhost:3000/login")
        return True
        
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        db.rollback()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create an admin user for the platform")
    parser.add_argument("--username", default="admin", help="Admin username (default: admin)")
    parser.add_argument("--password", default="admin123", help="Admin password (default: admin123)")
    
    args = parser.parse_args()
    
    print("==========================================")
    print("Ulsan Content Collection Platform - Admin User Setup")
    print("==========================================\n")
    
    success = create_admin(args.username, args.password)
    sys.exit(0 if success else 1)
