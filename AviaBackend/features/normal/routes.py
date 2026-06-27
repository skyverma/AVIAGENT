import json
from datetime import datetime
from typing import Any, Optional
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from auth.deps import TenantContext, get_tenant_context
from core.config import settings
from features.python_compiler import execution_record
from tasks.celery_client import celery_app

router = APIRouter(prefix="/normal", tags=["normal"])


class AnalyzeRequest(BaseModel):
    user_prompt: str
    agent_instruction: str = ""
    dataframe_path: str = ""
    project_slug: str = "default"
    session_id: str = ""
    model: str = ""


async def _sse_event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


@router.post("/analyze")
async def analyze(body: AnalyzeRequest, ctx: TenantContext = Depends(get_tenant_context)):
    session_id = body.session_id or str(uuid4())

    async def stream():
        steps: list[dict[str, Any]] = []

        async def on_step(step: dict):
            steps.append(step)
            yield await _sse_event({"type": "step", "step": step})

        yield await _sse_event({"type": "start", "session_id": session_id})
        payload = {
            "user_prompt": body.user_prompt,
            "agent_instruction": body.agent_instruction,
            "dataframe_name": body.dataframe_path,
            "session_id": session_id,
            "client_slug": ctx.client_slug,
            "project_slug": body.project_slug,
            "user_id": ctx.user_id,
            "task_type": "quick_analysis",
            "model": body.model,
        }
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(f"{settings.ai_service_url}/orchestrator/run", json=payload)
            result = resp.json()
        for step in result.get("steps", []):
            yield await _sse_event({"type": "step", "step": step})
        yield await _sse_event({"type": "complete", "result": result})

    return StreamingResponse(stream(), media_type="text/event-stream")
