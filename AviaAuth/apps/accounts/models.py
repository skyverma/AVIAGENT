from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    preferences = models.JSONField(blank=True, null=True)

    def get_primary_tenant(self):
        mapping = self.tenant_mappings.filter(is_primary=True).select_related("tenant").first()
        return mapping.tenant if mapping else None


class UserTenant(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tenant_mappings")
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="user_mappings")
    is_primary = models.BooleanField(default=False)

    class Meta:
        unique_together = ("user", "tenant")
