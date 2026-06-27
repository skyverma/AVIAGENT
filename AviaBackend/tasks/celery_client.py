from uuid import uuid4

from celery import Celery

from core.config import settings

celery_app = Celery("avia", broker=settings.celery_broker_url, backend=settings.celery_broker_url)
celery_app.conf.task_routes = {
    "avia.tasks.run_execution": {"queue": settings.celery_execution_queue},
}
