import json
from typing import Any
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth.deps import TenantContext, get_tenant_context
from core.config import settings

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
        yield await _sse_event({"type": "start", "session_id": session_id})
        dataframe_path = body.dataframe_path.strip()

        if not dataframe_path:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    f"{settings.ai_service_url}/direct-answer",
                    json={
                        "prompt": body.user_prompt,
                        "context": body.agent_instruction,
                        "session_id": session_id,
                        "model": body.model,
                    },
                )
                resp.raise_for_status()
                result = resp.json()
            result.update({"session_id": session_id, "mode": "direct", "steps": []})
            yield await _sse_event({"type": "complete", "result": result})
            return

        yield await _sse_event({
            "type": "mode",
            "mode": "compiler",
            "detail": "Dataset attached; running compiler, critic, final answer, and chart synthesis.",
        })
        payload = {
            "user_prompt": body.user_prompt,
            "agent_instruction": body.agent_instruction,
            "dataframe_name": dataframe_path,
            "session_id": session_id,
            "client_slug": ctx.client_slug,
            "project_slug": body.project_slug,
            "user_id": ctx.user_id,
            "task_type": "quick_analysis",
            "model": body.model,
        }
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(f"{settings.ai_service_url}/orchestrator/run", json=payload)
            resp.raise_for_status()
            result = resp.json()
        result.update({"session_id": session_id, "mode": "compiler", "active_dataframe_path": dataframe_path})
        for step in result.get("steps", []):
            yield await _sse_event({"type": "step", "step": step})
        yield await _sse_event({"type": "complete", "result": result})

    return StreamingResponse(stream(), media_type="text/event-stream")
