import re
from django.db import models
from django_tenants.models import DomainMixin, TenantMixin


def generate_client_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[\s\-\.]+", "_", slug)
    slug = re.sub(r"[^a-z0-9_]", "", slug)
    slug = re.sub(r"_+", "_", slug)
    slug = slug.strip("_")
    return slug or "default_client"


class Tenant(TenantMixin):
    name = models.CharField(max_length=255, unique=True)
    client_slug = models.CharField(max_length=255, unique=True, blank=True, db_index=True)
    created_on = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    auto_create_schema = True
    auto_drop_schema = False

    def save(self, *args, **kwargs):
        if not self.client_slug:
            self.client_slug = generate_client_slug(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Domain(DomainMixin):
    pass
