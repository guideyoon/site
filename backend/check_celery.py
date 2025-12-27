from celery import Celery
import sys

# Minimal Celery app config
app = Celery('test', broker='redis://localhost:6379/0')

@app.task
def test_task():
    pass

try:
    # Try to send a task
    # broker_connection_timeout is available in newer celery versions
    res = test_task.apply_async(expires=5)
    print("Task sent")
except Exception as e:
    print(f"Exception Type: {type(e).__name__}")
    print(f"Exception Message: {str(e)}")
    import traceback
    traceback.print_exc()
