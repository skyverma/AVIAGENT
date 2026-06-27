from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from features.normal.routes import router as normal_router
from features.notebook.routes import router as notebook_router
from features.python_compiler.routes import router as compiler_router
from features.uploads.routes import router as uploads_router
from storage.minio_client import ensure_bucket


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        ensure_bucket()
    except Exception:
        pass
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(compiler_router, prefix="/api")
app.include_router(normal_router, prefix="/api")
app.include_router(notebook_router, prefix="/api")
app.include_router(uploads_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "service": "avia-backend"}
