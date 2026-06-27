"""Quick Analysis orchestrator — generate → run → critic → final answer."""
from __future__ import annotations

import os
from typing import Any, Callable, Optional
from uuid import uuid4

import httpx

from llm_service import critic_evaluate, final_answer, generate_code
from memory_service import retrieve_memory, store_memory

API_SERVICE_URL = os.environ.get("API_SERVICE_URL", "http://api:8011")
MAX_CRITIC_ATTEMPTS = 4


async def _run_and_wait(code: str, dataframe_path: str, client_slug: str, project_slug: str, cell_id: str) -> dict:
    payload = {
        "code": code,
        "input_objects": [dataframe_path] if dataframe_path else [],
        "cell_id": cell_id,
        "project_slug": project_slug,
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        # Internal call — in production use service token; for dev use direct API
        run_resp = await client.post(
            f"{API_SERVICE_URL}/api/python-compiler/run",
            json=payload,
            headers={"X-Avia-Internal": "1", "X-Client-Slug": client_slug},
        )
        if run_resp.status_code == 401:
            # Fallback: enqueue via worker path without auth in orchestrator context
            return {"status": "failed", "logs": "Auth required for execution", "error": {"message": "auth"}}
        data = run_resp.json()
        execution_id = data["execution_id"]
        for _ in range(400):
            status_resp = await client.get(
                f"{API_SERVICE_URL}/api/python-compiler/executions/{execution_id}",
                headers={"X-Avia-Internal": "1", "X-Client-Slug": client_slug},
            )
            result = status_resp.json()
            if result.get("status") in ("completed", "failed"):
                return result
            import asyncio
            await asyncio.sleep(0.8)
    return {"status": "failed", "logs": "Timeout waiting for execution"}


def run_compiler_pipeline_sync(
    *,
    user_prompt: str,
    agent_instruction: str = "",
    dataframe_name: str = "",
    session_id: str = "",
    client_slug: str = "",
    project_slug: str = "default",
    use_compiler_qdrant_memory: bool = False,
    on_step: Optional[Callable[[dict], None]] = None,
    model: Optional[str] = None,
) -> dict[str, Any]:
    import asyncio

    async def _run():
        steps: list[dict] = []
        cell_id = str(uuid4())
        memory_ctx = ""
        if use_compiler_qdrant_memory and session_id:
            snippets = retrieve_memory(session_id, user_prompt)
            memory_ctx = "\n".join(snippets)
        context = agent_instruction
        if memory_ctx:
            context = f"{context}\n\nPrior context:\n{memory_ctx}".strip()
        critic_feedback = ""
        code = ""
        run_result: dict = {}
        for attempt in range(1, MAX_CRITIC_ATTEMPTS + 1):
            step = {"id": "codegen", "name": "Codegen", "status": "running", "detail": f"attempt {attempt}"}
            steps.append(step)
            if on_step:
                on_step(step)
            gen = generate_code(user_prompt, context=context, critic_feedback=critic_feedback, model=model)
            code = gen["code"]
            step["status"] = "completed"
            if on_step:
                on_step(step)
            step = {"id": "run", "name": "Run", "status": "running"}
            steps.append(step)
            if on_step:
                on_step(step)
            run_result = await _run_and_wait(code, dataframe_name, client_slug, project_slug, cell_id)
            step["status"] = run_result.get("status", "failed")
            if on_step:
                on_step(step)
            step = {"id": "critic", "name": "Critic", "status": "running"}
            steps.append(step)
            if on_step:
                on_step(step)
            critic = critic_evaluate(code, run_result, user_prompt, model=model)
            step["status"] = "completed"
            if on_step:
                on_step(step)
            if critic.get("approved"):
                break
            critic_feedback = critic.get("feedback", "")
        step = {"id": "final_answer", "name": "Final answer", "status": "running"}
        steps.append(step)
        if on_step:
            on_step(step)
        answer = final_answer(user_prompt, run_result, model=model)
        step["status"] = "completed"
        if on_step:
            on_step(step)
        if use_compiler_qdrant_memory and session_id:
            store_memory(session_id, f"Q: {user_prompt}\nA: {answer.get('final_answer','')[:500]}")
        return {
            "steps": steps,
            "code": code,
            "run_result": run_result,
            "final_answer": answer.get("final_answer", ""),
            "chart_objects": answer.get("chart_objects", []),
            "cell_id": cell_id,
        }

    return asyncio.run(_run())
