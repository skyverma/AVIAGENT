import hashlib
import os
from typing import Any, Optional

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

QDRANT_URL = os.environ.get("QDRANT_URL", "http://qdrant:6333")
COLLECTION = "avia_compiler_memory"
_client: Optional[QdrantClient] = None


def _get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=QDRANT_URL)
        try:
            _client.get_collection(COLLECTION)
        except Exception:
            _client.create_collection(
                collection_name=COLLECTION,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )
    return _client


def _hash_vector(text: str) -> list[float]:
    h = hashlib.sha384(text.encode()).digest()
    return [b / 255.0 for b in h]


def store_memory(session_id: str, content: str, metadata: Optional[dict] = None) -> None:
    client = _get_client()
    point_id = int(hashlib.md5(f"{session_id}:{content[:200]}".encode()).hexdigest()[:12], 16)
    client.upsert(
        collection_name=COLLECTION,
        points=[PointStruct(id=point_id, vector=_hash_vector(content), payload={"session_id": session_id, "content": content, **(metadata or {})})],
    )


def retrieve_memory(session_id: str, query: str, limit: int = 5) -> list[str]:
    client = _get_client()
    try:
        hits = client.search(collection_name=COLLECTION, query_vector=_hash_vector(query), limit=limit)
        return [h.payload.get("content", "") for h in hits if h.payload.get("session_id") == session_id]
    except Exception:
        return []
