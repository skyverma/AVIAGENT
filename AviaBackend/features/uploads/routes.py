import io
from uuid import uuid4

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from auth.deps import TenantContext, get_tenant_context
from features.python_compiler.storage_path import tenant_prefix
from storage.minio_client import upload_bytes

router = APIRouter(prefix="/uploads", tags=["uploads"])

MAX_UPLOAD_BYTES = 200 * 1024 * 1024  # 200 MB


@router.post("/dataframe")
async def upload_dataframe(
    file: UploadFile = File(...),
    project_slug: str = Form("default"),
    ctx: TenantContext = Depends(get_tenant_context),
):
    name = (file.filename or "upload.csv").strip()
    lower = name.lower()
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 200 MB)")

    prefix = tenant_prefix(ctx.client_slug, project_slug)
    base_object = f"{prefix}/uploads/{uuid4()}_{name}"

    try:
        if lower.endswith((".csv", ".txt")):
            df = pd.read_csv(io.BytesIO(content))
        elif lower.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        elif lower.endswith(".parquet"):
            df = pd.read_parquet(io.BytesIO(content), engine="pyarrow")
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Upload CSV, XLSX, XLS or Parquet.",
            )
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Could not parse file: {e}") from e

    if df.empty:
        raise HTTPException(status_code=400, detail="Parsed file has no rows")

    parquet_name = base_object.rsplit(".", 1)[0] + ".parquet"
    buf = io.BytesIO()
    try:
        df.to_parquet(buf, engine="pyarrow")
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Could not convert to parquet: {e}") from e
    upload_bytes(parquet_name, buf.getvalue(), "application/octet-stream")

    return {
        "object_name": parquet_name,
        "label": name,
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "column_names": [str(c) for c in df.columns][:50],
    }
