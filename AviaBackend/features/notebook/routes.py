from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from pymongo import MongoClient

from auth.deps import TenantContext, get_tenant_context
from core.config import settings

router = APIRouter(prefix="/notebook", tags=["notebook"])
COLLECTION = "avia_notebook_sessions"
_client: MongoClient | None = None


def _get_db():
    global _client
    if _client is None:
        _client = MongoClient(settings.mongo_uri)
    return _client.get_default_database()


class NotebookSession(BaseModel):
    session_id: str
    generation_history: list[dict[str, Any]] = Field(default_factory=list)
    settings: dict[str, Any] = Field(default_factory=dict)


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    doc = _get_db()[COLLECTION].find_one({
        "session_id": session_id,
        "client_slug": ctx.client_slug,
        "user_id": ctx.user_id,
    })
    if not doc:
        return NotebookSession(session_id=session_id)
    return NotebookSession(
        session_id=session_id,
        generation_history=doc.get("generation_history", []),
        settings=doc.get("settings", {}),
    )


@router.put("/sessions/{session_id}")
async def save_session(session_id: str, body: NotebookSession, ctx: TenantContext = Depends(get_tenant_context)):
    _get_db()[COLLECTION].update_one(
        {"session_id": session_id, "client_slug": ctx.client_slug, "user_id": ctx.user_id},
        {
            "$set": {
                "generation_history": body.generation_history,
                "settings": body.settings,
                "updated_at": datetime.utcnow(),
            },
            "$setOnInsert": {
                "created_at": datetime.utcnow(),
                "client_slug": ctx.client_slug,
                "user_id": ctx.user_id,
            },
        },
        upsert=True,
    )
    return {"ok": True}
