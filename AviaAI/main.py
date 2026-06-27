from typing import Any, Optional

import os
from fastapi import FastAPI
from pydantic import BaseModel

from llm_service import critic_evaluate, direct_answer, final_answer, generate_code
from memory_service import retrieve_memory, store_memory
from orchestrator import run_compiler_pipeline_sync

app = FastAPI(title="AviaAI")


class GenerateRequest(BaseModel):
    prompt: str
    context: str = ""
    critic_feedback: str = ""
    session_id: str = ""
    use_memory: bool = False
    model: str = ""


class DirectAnswerRequest(BaseModel):
    prompt: str
    context: str = ""
    session_id: str = ""
    model: str = ""


class OrchestratorRequest(BaseModel):
    user_prompt: str
    agent_instruction: str = ""
    dataframe_name: str = ""
    session_id: str = ""
    client_slug: str = ""
    project_slug: str = "default"
    user_id: Optional[int] = None
    task_type: str = "quick_analysis"
    use_compiler_qdrant_memory: bool = False
    model: str = ""


@app.get("/health")
def health():
    return {"status": "ok", "service": "avia-ai"}


@app.get("/models")
def list_gemini_models():
    from gemini_models import list_models
    return {"models": list_models(), "default": os.environ.get("GEMINI_DEFAULT_MODEL", "gemini-3-flash")}


@app.post("/python-compiler/generate")
def codegen(body: GenerateRequest):
    ctx = body.context
    if body.use_memory and body.session_id:
        mem = retrieve_memory(body.session_id, body.prompt)
        if mem:
            ctx = (ctx + "\n" + "\n".join(mem)).strip()
    result = generate_code(body.prompt, context=ctx, critic_feedback=body.critic_feedback, model=body.model or None)
    if body.use_memory and body.session_id:
        store_memory(body.session_id, f"Generated code for: {body.prompt[:200]}")
    return result


@app.post("/direct-answer")
def direct_ans(body: DirectAnswerRequest):
    return direct_answer(body.prompt, context=body.context, model=body.model or None)


@app.post("/python-compiler/critic-evaluate")
def critic(body: dict[str, Any]):
    return critic_evaluate(body.get("code", ""), body.get("run_result", {}), body.get("prompt", ""), model=body.get("model"))


@app.post("/python-compiler/final-answer")
def final_ans(body: dict[str, Any]):
    return final_answer(body.get("prompt", ""), body.get("run_result", {}), model=body.get("model"))


@app.post("/python-compiler/generate-charts")
def charts(body: dict[str, Any]):
    return {"chart_objects": final_answer(body.get("prompt", ""), body.get("run_result", {})).get("chart_objects", [])}


@app.post("/orchestrator/run")
def orchestrator_run(body: OrchestratorRequest):
    use_memory = body.use_compiler_qdrant_memory or body.task_type != "quick_analysis"
    result = run_compiler_pipeline_sync(
        user_prompt=body.user_prompt,
        agent_instruction=body.agent_instruction,
        dataframe_name=body.dataframe_name,
        session_id=body.session_id,
        client_slug=body.client_slug,
        project_slug=body.project_slug,
        use_compiler_qdrant_memory=use_memory,
        model=body.model or None,
    )
    return result
