"""Sandbox runner for Celery worker."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import time
from typing import Any

from storage import download_bytes, upload_bytes

DEFAULT_TIMEOUT_SECONDS = 30


class ExecutionError(Exception):
    def __init__(self, message: str, stdout: str = "", stderr: str = ""):
        super().__init__(message)
        self.stdout = stdout
        self.stderr = stderr


def build_ai_created_cell_output_prefix(client_slug: str, project_slug: str, cell_id: str, execution_id: str) -> str:
    return f"{client_slug.strip()}/{project_slug.strip()}/ai_created/{cell_id}/{execution_id}"


def _download_inputs(input_objects: list[str], workspace: str) -> None:
    for idx, object_name in enumerate(input_objects, start=1):
        data = download_bytes(object_name)
        with open(os.path.join(workspace, f"input_{idx}.parquet"), "wb") as f:
            f.write(data)


def _generate_script(user_code: str, num_inputs: int, script_path: str) -> None:
    load_lines = [
        f'df{i} = pd.read_parquet("input_{i}.parquet", engine="pyarrow")'
        for i in range(1, num_inputs + 1)
    ]
    load_block = "\n".join(load_lines)
    header = f'''import json
import pandas as pd
import numpy as np
{load_block}
'''
    footer = '''
_exclude = {"pd", "np", "json"}
outputs = []
_used = {}
for name, obj in sorted(globals().items(), key=lambda x: x[0]):
    if name.startswith("_") or name in _exclude:
        continue
    if not isinstance(obj, pd.DataFrame):
        continue
    safe = "".join(c if c.isalnum() or c == "_" else "_" for c in str(name))[:80] or "unnamed"
    base = safe
    idx = 1
    while safe in _used:
        safe = f"{base}_{idx}"
        idx += 1
    _used[safe] = True
    fname = f"{safe}.parquet"
    obj.to_parquet(fname, engine="pyarrow")
    outputs.append({"name": name, "file": fname, "rows": len(obj), "cols": len(obj.columns)})
with open("outputs.json", "w") as f:
    json.dump(outputs, f)
'''
    script = header + "\n# User code\n" + user_code + footer
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(script)


def run_sandbox(execution: dict) -> dict[str, Any]:
    workspace = tempfile.mkdtemp(prefix="avia_sandbox_")
    try:
        input_objects = execution.get("input_objects") or []
        _download_inputs(input_objects, workspace)
        policy = execution.get("policy_snapshot") or {}
        timeout = int(policy.get("timeout", DEFAULT_TIMEOUT_SECONDS))
        user_code = execution.get("code") or ""
        script_path = os.path.join(workspace, "run.py")
        _generate_script(user_code, len(input_objects), script_path)
        t0 = time.perf_counter()
        try:
            result = subprocess.run(
                ["python", "run.py"],
                cwd=workspace,
                capture_output=True,
                text=True,
                timeout=timeout,
                env={"PATH": os.environ.get("PATH", "/usr/bin"), "PYTHONIOENCODING": "utf-8"},
            )
        except subprocess.TimeoutExpired as e:
            raise ExecutionError("Execution timed out", stderr=str(e)) from e
        elapsed = time.perf_counter() - t0
        stdout_str = (result.stdout or "").strip()
        stderr_str = (result.stderr or "").strip()
        if result.returncode != 0:
            raise ExecutionError(f"Runtime error (code {result.returncode})", stdout_str, stderr_str)
        outputs_path = os.path.join(workspace, "outputs.json")
        outputs_meta = []
        if os.path.exists(outputs_path):
            with open(outputs_path, encoding="utf-8") as f:
                outputs_meta = json.load(f)
        client_slug = execution.get("client_name", "")
        project_name = execution.get("project_name", "default")
        cell_id = execution.get("cell_id", "")
        execution_id = execution.get("execution_id", "")
        prefix = build_ai_created_cell_output_prefix(client_slug, project_name, cell_id, execution_id)
        output_objects: list[str] = []
        output_metadata: list[dict] = []
        previews: dict[str, Any] = {}
        for item in outputs_meta:
            local_file = os.path.join(workspace, item["file"])
            if not os.path.exists(local_file):
                continue
            object_name = f"{prefix}/{item['file']}"
            with open(local_file, "rb") as f:
                upload_bytes(object_name, f.read(), "application/octet-stream")
            output_objects.append(object_name)
            output_metadata.append({
                "object_name": object_name,
                "variable_name": item.get("name"),
                "rows": item.get("rows"),
                "cols": item.get("cols"),
            })
            try:
                import pandas as pd
                df = pd.read_parquet(local_file)
                previews[object_name] = df.head(20).to_dict(orient="records")
            except Exception:
                pass
        return {
            "output_objects": output_objects,
            "output_metadata": output_metadata,
            "manifest_path": f"{prefix}/manifest.json",
            "run_prefix": prefix,
            "previews": previews,
            "resource_usage": {"execution_time_seconds": elapsed},
            "stdout": stdout_str,
            "stderr": stderr_str,
        }
    finally:
        shutil.rmtree(workspace, ignore_errors=True)
