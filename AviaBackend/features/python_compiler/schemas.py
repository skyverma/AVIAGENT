from pydantic import BaseModel, Field
from typing import Any, Optional


class RunRequest(BaseModel):
    code: str
    input_objects: list[str] = Field(default_factory=list)
    cell_id: str = ""
    project_slug: str = "default"
    policy_snapshot: Optional[dict[str, Any]] = None


class RunResponse(BaseModel):
    status: str
    execution_id: str


class ExecutionStatusResponse(BaseModel):
    execution_id: str
    status: str
    logs: str = ""
    output_objects: list[str] = Field(default_factory=list)
    output_metadata: list[dict[str, Any]] = Field(default_factory=list)
    previews: dict[str, Any] = Field(default_factory=dict)
    error: Optional[Any] = None
