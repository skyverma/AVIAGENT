from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException

from auth.deps import TenantContext, get_tenant_context
from core.config import settings
from features.python_compiler import ast_validator, execution_record
from features.python_compiler.schemas import ExecutionStatusResponse, RunRequest, RunResponse
from tasks.celery_client import celery_app

router = APIRouter(prefix="/python-compiler", tags=["python-compiler"])


@router.post("/run", response_model=RunResponse)
async def run_code(body: RunRequest, ctx: TenantContext = Depends(get_tenant_context)):
    try:
        ast_validator.validate_code(body.code)
    except ast_validator.CodeValidationError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    execution_id = str(uuid4())
    execution_record.create_execution(
        execution_id=execution_id,
        code=body.code,
        input_objects=body.input_objects,
        client_name=ctx.client_slug,
        app_name="aviagent",
        project_name=body.project_slug or ctx.project_slug,
        cell_id=body.cell_id,
        policy_snapshot=body.policy_snapshot,
    )
    celery_app.send_task("avia.tasks.run_execution", args=[execution_id], queue=settings.celery_execution_queue)
    return RunResponse(status="queued", execution_id=execution_id)


@router.get("/executions/{execution_id}", response_model=ExecutionStatusResponse)
async def get_execution(execution_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    doc = execution_record.get_execution(execution_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Execution not found")
    if doc.get("client_name") != ctx.client_slug:
        raise HTTPException(status_code=403, detail="Forbidden")
    return ExecutionStatusResponse(
        execution_id=execution_id,
        status=doc.get("status", "unknown"),
        logs=doc.get("logs", ""),
        output_objects=doc.get("output_objects", []),
        output_metadata=doc.get("output_metadata", []),
        previews=doc.get("previews", {}),
        error=doc.get("error"),
    )


@router.post("/critic-evaluate")
async def critic_evaluate(body: dict, ctx: TenantContext = Depends(get_tenant_context)):
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{settings.ai_service_url}/python-compiler/critic-evaluate", json=body)
    return resp.json()


@router.post("/final-answer")
async def final_answer(body: dict, ctx: TenantContext = Depends(get_tenant_context)):
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{settings.ai_service_url}/python-compiler/final-answer", json=body)
    return resp.json()


@router.post("/generate-charts")
async def generate_charts(body: dict, ctx: TenantContext = Depends(get_tenant_context)):
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{settings.ai_service_url}/python-compiler/generate-charts", json=body)
    return resp.json()
