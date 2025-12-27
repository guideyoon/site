from celery.schedules import crontab
from app.config import settings

# Celery Beat schedule
beat_schedule = {
    'collect-all-sources': {
        'task': 'worker.tasks.collection.collect_all_sources',
        'schedule': settings.COLLECT_INTERVAL_MINUTES * 60.0,  # Convert to seconds
    },
}
