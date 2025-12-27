import sys
import os
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Set dummy environment variables for Pydantic Settings
os.environ["DATABASE_URL"] = "sqlite:///./test_multitenancy.db"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["SECRET_KEY"] = "testsecretkey"

from app.main import app
from app.database import Base, get_db
from app.auth import get_password_hash, create_access_token
from app.models.user import User
from app.models.source import Source
from app.models.item import Item
from app.models.queue import Queue

# Use a test SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_multitenancy.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Create Admin
    admin = User(
        username="admin",
        hashed_password=get_password_hash("admin123"),
        role="admin"
    )
    db.add(admin)
    
    # Create User A
    user_a = User(
        username="user_a",
        hashed_password=get_password_hash("user123"),
        role="editor"
    )
    db.add(user_a)
    
    # Create User B (as a 'viewer' to test role relaxation)
    user_b = User(
        username="user_b",
        hashed_password=get_password_hash("user123"),
        role="viewer"
    )
    db.add(user_b)
    
    # Create Expired User
    expired_user = User(
        username="expired",
        hashed_password=get_password_hash("user123"),
        role="viewer",
        expires_at=datetime.now(timezone.utc) - timedelta(days=1)
    )
    db.add(expired_user)
    
    db.commit()
    db.refresh(admin)
    db.refresh(user_a)
    db.refresh(user_b)
    db.refresh(expired_user)
    
    # Create Source for User A
    source_a = Source(
        name="Source A",
        type="rss",
        base_url="https://example.com/rss",
        user_id=user_a.id
    )
    db.add(source_a)
    
    # Create Source for User B
    source_b = Source(
        name="Source B",
        type="rss",
        base_url="https://example.com/rss2",
        user_id=user_b.id
    )
    db.add(source_b)
    
    db.commit()
    db.refresh(source_a)
    db.refresh(source_b)
    
    # Create Item for User A
    item_a = Item(
        title="Item A",
        url="https://example.com/a",
        source_id=source_a.id,
        user_id=user_a.id,
        status="collected"
    )
    db.add(item_a)
    
    # Create Item for User B
    item_b = Item(
        title="Item B",
        url="https://example.com/b",
        source_id=source_b.id,
        user_id=user_b.id,
        status="collected"
    )
    db.add(item_b)
    
    db.commit()
    admin_id = admin.id
    user_a_id = user_a.id
    user_b_id = user_b.id
    expired_user_id = expired_user.id
    db.close()
    return admin_id, user_a_id, user_b_id, expired_user_id

def get_token(username):
    return create_access_token(data={"sub": username})

def verify():
    print("Setting up test database...")
    admin_id, user_a_id, user_b_id, expired_user_id = setup_db()
    
    token_a = get_token("user_a")
    token_b = get_token("user_b")
    token_admin = get_token("admin")
    token_expired = get_token("expired")
    
    print("\n1. Testing Data Isolation in Sources API")
    # User A sees only Source A
    resp_a = client.get("/api/sources", headers={"Authorization": f"Bearer {token_a}"})
    sources_a = resp_a.json()
    print(f"User A sees {len(sources_a)} sources. (Expected: 1)")
    assert len(sources_a) == 1
    assert sources_a[0]["name"] == "Source A"
    
    # User B sees only Source B
    resp_b = client.get("/api/sources", headers={"Authorization": f"Bearer {token_b}"})
    sources_b = resp_b.json()
    print(f"User B sees {len(sources_b)} sources. (Expected: 1)")
    assert len(sources_b) == 1
    assert sources_b[0]["name"] == "Source B"
    
    # Admin sees both
    resp_admin = client.get("/api/sources", headers={"Authorization": f"Bearer {token_admin}"})
    sources_admin = resp_admin.json()
    print(f"Admin sees {len(sources_admin)} sources. (Expected: 2)")
    assert len(sources_admin) >= 2
    
    print("\n2. Testing Data Isolation in Items API")
    # User A sees only Item A
    resp_a = client.get("/api/items", headers={"Authorization": f"Bearer {token_a}"})
    items_a = resp_a.json()
    print(f"User A sees {len(items_a)} items. (Expected: 1)")
    assert len(items_a) == 1
    assert items_a[0]["title"] == "Item A"
    
    # User B tries to access Item A detail
    item_a_id = items_a[0]["id"]
    resp_b_detail = client.get(f"/api/items/{item_a_id}", headers={"Authorization": f"Bearer {token_b}"})
    print(f"User B accessing Item A detail: {resp_b_detail.status_code} (Expected: 403)")
    assert resp_b_detail.status_code == 403
    
    print("\n3. Testing Access Expiration")
    resp_expired = client.get("/api/items", headers={"Authorization": f"Bearer {token_expired}"})
    print(f"Expired user accessing API: {resp_expired.status_code} (Expected: 403)")
    assert resp_expired.status_code == 403
    assert "expired" in resp_expired.json()["detail"].lower()
    
    print("\n4. Testing Admin Management of Expiration")
    # Admin extends expiration for user A
    new_expiry = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    resp_update = client.patch(f"/api/users/{user_a_id}", 
                               json={"expires_at": new_expiry},
                               headers={"Authorization": f"Bearer {token_admin}"})
    print(f"Admin updating User A expiry: {resp_update.status_code} (Expected: 200)")
    assert resp_update.status_code == 200
    assert resp_update.json()["expires_at"] is not None
    
    print("\nAll tests passed successfully!")

if __name__ == "__main__":
    try:
        verify()
    finally:
        if os.path.exists("./test_multitenancy.db"):
            os.remove("./test_multitenancy.db")
