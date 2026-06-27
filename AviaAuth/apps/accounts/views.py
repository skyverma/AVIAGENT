import json

import redis
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from apps.accounts.models import UserTenant


def _redis():
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def _tenant_context(user):
    mapping = UserTenant.objects.filter(user=user, is_primary=True).select_related("tenant").first()
    if not mapping:
        mapping = UserTenant.objects.filter(user=user).select_related("tenant").first()
    if not mapping:
        return None
    tenant = mapping.tenant
    return {
        "tenant_id": tenant.id,
        "tenant_name": tenant.name,
        "client_slug": tenant.client_slug,
        "schema_name": tenant.schema_name,
    }


def _cache_user_context(user_id: int, ctx: dict):
    try:
        _redis().setex(f"avia:user:{user_id}", 3600, json.dumps(ctx))
    except Exception:
        pass


@ensure_csrf_cookie
@require_http_methods(["GET"])
def csrf(request):
    return JsonResponse({"ok": True})


@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    try:
        body = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"error": "Invalid credentials"}, status=401)
    login(request, user)
    ctx = _tenant_context(user)
    if ctx:
        _cache_user_context(user.id, {**ctx, "user_id": user.id, "username": user.username})
    return JsonResponse({
        "user": {"id": user.id, "username": user.username},
        "tenant": ctx,
    })


@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return JsonResponse({"ok": True})


@require_http_methods(["GET"])
def me_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)
    ctx = _tenant_context(request.user)
    return JsonResponse({
        "user": {"id": request.user.id, "username": request.user.username},
        "tenant": ctx,
    })


@require_http_methods(["GET"])
def session_context_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)
    ctx = _tenant_context(request.user)
    if not ctx:
        return JsonResponse({"error": "No tenant"}, status=403)
    payload = {
        "user_id": request.user.id,
        "username": request.user.username,
        **ctx,
    }
    _cache_user_context(request.user.id, payload)
    return JsonResponse(payload)
