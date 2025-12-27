import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from worker.tasks.collection import collect_source

def trigger_collection():
    print("울산광역시청 수집 작업 시작...")
    result = collect_source.delay(1)  # source_id = 1
    print(f"작업 ID: {result.id}")
    print("Celery Worker 로그를 확인하세요.")

if __name__ == "__main__":
    trigger_collection()
