from datetime import datetime
from typing import Any, Optional
from uuid import uuid4

from pymongo import MongoClient

from core.config import settings

COLLECTION_NAME = "compiler_execution_code"
_db: Optional[MongoClient] = None


def get_database():
    global _db
    if _db is None:
        _db = MongoClient(settings.mongo_uri)
    return _db.get_default_database()


def create_execution(
    *,
    execution_id: str,
    code: str,
    input_objects: list[str],
    client_name: str,
    app_name: str,
    project_name: str,
    cell_id: str = "",
    policy_snapshot: Optional[dict] = None,
) -> dict[str, Any]:
    doc = {
        "execution_id": execution_id,
        "status": "queued",
        "code": code,
        "input_objects": input_objects,
        "client_name": client_name,
        "app_name": app_name,
        "project_name": project_name,
        "cell_id": cell_id or str(uuid4()),
        "policy_snapshot": policy_snapshot or {"timeout": 30, "memory_mb": 2048},
        "created_at": datetime.utcnow(),
    }
    get_database()[COLLECTION_NAME].insert_one(doc)
    return doc


def get_execution(execution_id: str) -> Optional[dict[str, Any]]:
    return get_database()[COLLECTION_NAME].find_one({"execution_id": execution_id})
