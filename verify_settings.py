import sys
import os

# Add backend directory to sys.path
backend_path = os.path.join(os.getcwd(), 'backend')
sys.path.append(backend_path)

try:
    from app.config import settings
    print(f"LOADED_DATABASE_URL: {settings.DATABASE_URL}")
    print(f"LOADED_REDIS_URL: {settings.REDIS_URL}")
except Exception as e:
    print(f"ERROR_LOADING_SETTINGS: {e}")
    import traceback
    traceback.print_exc()
