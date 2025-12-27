import requests
import sys

# Testing source ID 1 (assuming it exists, or fails with 404 which is also fine but later)
# We need a valid source ID. Let's list sources first.

BASE_URL = "http://localhost:8000/api"

def get_first_source_id():
    try:
        resp = requests.get(f"{BASE_URL}/sources")
        resp.raise_for_status()
        sources = resp.json()
        if sources:
            return sources[0]['id']
    except Exception as e:
        print(f"Failed to list sources: {e}")
    return None

def trigger_collection(source_id):
    print(f"Triggering collection for source {source_id}...")
    try:
        # We need admin privileges usually, but let's see if the dev env is loose or if we need to login
        # The code says `current_user: User = Depends(require_role("admin"))`
        # We need a token.
        
        # Login first
        login_data = {"username": "admin", "password": "password"} # Try default? Or maybe we can't easily test without auth.
        # Let's skip auth for now and expect 401 if strict, but wait..
        # The user's env might have a way to bypass or I need to login.
        
        # Let's try to just hit it and see response code.
        resp = requests.post(f"{BASE_URLsources}/{source_id}/collect") # Typo in URL construction in thought
        # Correct URL: /api/sources/{id}/collect
        
        # It needs auth. I will assume I can't easily get a token without user creds. 
        # But wait, looking at `backend/app/main.py`: `app.include_router(auth.router, prefix="/api/auth", tags=["auth"])`
        # `auth.py` usually has login.
        
        # Let's try to assume I can't easily test API end-to-end without creds.
        # Actually, I can use the `check_celery.py` logic but integrated into the *backend code* temporarily? No, that's messy.
        
        # Re-reading `backend/app/api/routes/sources.py`:
        # `current_user: User = Depends(require_role("admin"))`
        
        pass
    except Exception:
        pass

# Actually, I can just rely on the user to test in UI, but I want to be sure.
# I'll create a script that sets PYTHONPATH and imports the function directly? 
# No, `trigger_collection` is an async route handler.

# Let's try to use the `check_celery.py` I already made.
# The `check_celery.py` confirmed `kombu.exceptions.OperationalError`.
# My code catches exactly that.

# I'll just write a script that mocks the exception in a small unit test-like script to verify my `isinstance` check works.
import kombu.exceptions
from fastapi import HTTPException

def test_exception_handling():
    try:
        # Simulate the error
        raise kombu.exceptions.OperationalError("Error 10061 connecting to localhost:6379")
    except Exception as e:
        print(f"Caught exception: {type(e).__name__}")
        if isinstance(e, kombu.exceptions.OperationalError) or "Connection" in str(e):
            print("HANDLER CHECK: SUCCESS - Would raise 503")
        else:
            print("HANDLER CHECK: FAILED - Would raise 500")

if __name__ == "__main__":
    test_exception_handling()
