import io
import os
from functools import lru_cache

from minio import Minio

MINIO_BUCKET = os.environ.get("MINIO_BUCKET", "avia-data")


@lru_cache
def get_minio_client() -> Minio:
    return Minio(
        os.environ.get("MINIO_ENDPOINT", "minio:9000"),
        access_key=os.environ.get("MINIO_ACCESS_KEY", "aviadmin"),
        secret_key=os.environ.get("MINIO_SECRET_KEY", "aviadmin123"),
        secure=os.environ.get("MINIO_SECURE", "false").lower() in ("true", "1"),
    )


def download_bytes(object_name: str) -> bytes:
    client = get_minio_client()
    response = client.get_object(MINIO_BUCKET, object_name)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def upload_bytes(object_name: str, data: bytes, content_type: str = "application/octet-stream"):
    client = get_minio_client()
    if not client.bucket_exists(MINIO_BUCKET):
        client.make_bucket(MINIO_BUCKET)
    client.put_object(MINIO_BUCKET, object_name, io.BytesIO(data), length=len(data), content_type=content_type)
