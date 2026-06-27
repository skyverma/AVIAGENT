import hashlib
import os
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

QDRANT_URL = os.environ.get("QDRANT_URL", "http://qdrant:6333")
COLLECTION = "avia_compiler_memory"
# sha384 digest = 48 bytes -> 48-dim vector. Keep collection in sync with this.
VECTOR_SIZE = 48
_client: Optional[QdrantClient] = None


def _get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=QDRANT_URL)
        _ensure_collection(_client)
    return _client


def _ensure_collection(client: QdrantClient) -> None:
    try:
        info = client.get_collection(COLLECTION)
        existing = info.config.params.vectors.size  # type: ignore[union-attr]
        if existing != VECTOR_SIZE:
            client.recreate_collection(
                collection_name=COLLECTION,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            )
    except Exception:
        client.recreate_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )


def _hash_vector(text: str) -> list[float]:
    h = hashlib.sha384(text.encode()).digest()
    return [b / 255.0 for b in h]


def store_memory(session_id: str, content: str, metadata: Optional[dict] = None) -> None:
    try:
        client = _get_client()
        point_id = int(hashlib.md5(f"{session_id}:{content[:200]}".encode()).hexdigest()[:12], 16)
        client.upsert(
            collection_name=COLLECTION,
            points=[
                PointStruct(
                    id=point_id,
                    vector=_hash_vector(content),
                    payload={"session_id": session_id, "content": content, **(metadata or {})},
                )
            ],
        )
    except Exception:
        # Memory is best-effort; never fail the request because of it.
        pass


def retrieve_memory(session_id: str, query: str, limit: int = 5) -> list[str]:
    try:
        client = _get_client()
        hits = client.search(collection_name=COLLECTION, query_vector=_hash_vector(query), limit=limit)
        return [h.payload.get("content", "") for h in hits if h.payload.get("session_id") == session_id]
    except Exception:
        return []
