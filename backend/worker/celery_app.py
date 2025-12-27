from celery import Celery
from app.config import settings

# Create Celery app
celery_app = Celery(
    "navercafe_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Seoul',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    broker_connection_timeout=2.0,  # 2 seconds timeout for faster feedback
    broker_connection_retry_on_startup=False,
    include=[
        'worker.tasks.collection',
        'worker.tasks.processing',
    ]
)

# Auto-discover tasks
celery_app.autodiscover_tasks(['worker.tasks.collection', 'worker.tasks.processing'])

# Celery Beat Schedule - periodic tasks
celery_app.conf.beat_schedule = {
    'collect-all-sources-periodically': {
        'task': 'worker.tasks.collection.collect_all_sources',
        'schedule': 300.0,  # Every 5 minutes (300 seconds)
    },
}
