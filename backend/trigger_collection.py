import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Set environment variables before importing app modules
os.environ['DATABASE_URL'] = 'postgresql://navercafe:navercafe123@localhost:5432/navercafe'
os.environ['REDIS_URL'] = 'redis://localhost:6379/0'
os.environ['SECRET_KEY'] = 'ulsan-navercafe-platform-secret-key-2025-development'
os.environ['ALGORITHM'] = 'HS256'
os.environ['ACCESS_TOKEN_EXPIRE_MINUTES'] = '1440'

from worker.tasks.collection import collect_source

def trigger_collection():
    source_id = 3
    print(f"Triggering collection for source {source_id}...")
    try:
        result = collect_source.delay(source_id)
        print(f"Task ID: {result.id}")
        print("Collection task has been queued successfully.")
        print("Check the worker logs for results.")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    os.chdir(os.path.join(os.getcwd(), 'backend'))
    trigger_collection()
