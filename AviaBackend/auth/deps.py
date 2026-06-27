import json
from dataclasses import dataclass
from typing import Optional

import httpx
import redis
from fastapi import Cookie, HTTPException, Request

from core.config import settings


@dataclass
class TenantContext:
    user_id: int
    username: str
    client_slug: str
    schema_name: str
    tenant_name: str
    project_slug: str = "default"


def _redis():
    return redis.from_url(settings.redis_url, decode_responses=True)


async def resolve_session_context(sessionid: Optional[str]) -> TenantContext:
    if not sessionid:
        raise HTTPException(status_code=401, detail="Not authenticated")
    cache_key = f"avia:session:{sessionid}"
    try:
        cached = _redis().get(cache_key)
        if cached:
            data = json.loads(cached)
            return TenantContext(**data)
    except Exception:
        pass
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{settings.auth_service_url}/auth/api/session-context/",
            cookies={"sessionid": sessionid},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = resp.json()
    ctx = TenantContext(
        user_id=data["user_id"],
        username=data["username"],
        client_slug=data["client_slug"],
        schema_name=data["schema_name"],
        tenant_name=data["tenant_name"],
    )
    try:
        _redis().setex(cache_key, 3600, json.dumps(ctx.__dict__))
    except Exception:
        pass
    return ctx


async def get_tenant_context(
    request: Request,
    sessionid: Optional[str] = Cookie(default=None),
) -> TenantContext:
    internal = request.headers.get("X-Avia-Internal")
    client_slug = request.headers.get("X-Client-Slug", "demo_corp")
    if internal == "1":
        return TenantContext(
            user_id=0,
            username="system",
            client_slug=client_slug,
            schema_name="demo_corp",
            tenant_name="Internal",
        )
    return await resolve_session_context(sessionid)
