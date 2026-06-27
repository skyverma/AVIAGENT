from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

urlpatterns = [
    path("healthz/", lambda r: JsonResponse({"status": "ok"})),
    path("admin/", admin.site.urls),
    path("auth/api/", include("apps.accounts.urls")),
]
