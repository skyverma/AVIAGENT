import os
from datetime import datetime

from celery import Celery
from pymongo import MongoClient

from sandbox import ExecutionError, run_sandbox
from storage import MINIO_BUCKET, get_minio_client

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://root:aviaroot@mongo:27017/avia_dev?authSource=admin")
BROKER = os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/0")
COLLECTION = "compiler_execution_code"

celery_app = Celery("avia", broker=BROKER, backend=BROKER)


def _db():
    return MongoClient(MONGO_URI).get_default_database()


@celery_app.task(name="avia.tasks.run_execution", bind=True)
def run_execution(self, execution_id: str) -> None:
    db = _db()
    execution = db[COLLECTION].find_one({"execution_id": execution_id})
    if not execution or execution.get("status") != "queued":
        return
    db[COLLECTION].update_one(
        {"execution_id": execution_id, "status": "queued"},
        {"$set": {"status": "running", "started_at": datetime.utcnow()}},
    )
    execution = db[COLLECTION].find_one({"execution_id": execution_id})
    try:
        result = run_sandbox(execution)
    except ExecutionError as e:
        db[COLLECTION].update_one(
            {"execution_id": execution_id},
            {"$set": {
                "status": "failed",
                "completed_at": datetime.utcnow(),
                "error": {"message": str(e)},
                "logs": (e.stdout or "") + "\n" + (e.stderr or ""),
            }},
        )
        return
    except Exception as e:
        db[COLLECTION].update_one(
            {"execution_id": execution_id},
            {"$set": {"status": "failed", "completed_at": datetime.utcnow(), "error": {"message": str(e)}}},
        )
        return
    logs = (result.get("stdout") or "") + ("\n" + result.get("stderr") if result.get("stderr") else "")
    db[COLLECTION].update_one(
        {"execution_id": execution_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.utcnow(),
            "output_objects": result.get("output_objects", []),
            "output_metadata": result.get("output_metadata", []),
            "previews": result.get("previews", {}),
            "logs": logs.strip(),
        }},
    )
