from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context

from apps.accounts.models import UserTenant
from apps.tenants.models import Domain, Tenant

User = get_user_model()


class Command(BaseCommand):
    help = "Seed demo tenant and user"

    def handle(self, *args, **options):
        tenant, created = Tenant.objects.get_or_create(
            schema_name="demo_corp",
            defaults={"name": "Demo Corp"},
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created tenant {tenant.name}"))
        Domain.objects.get_or_create(
            domain="demo.localhost",
            tenant=tenant,
            defaults={"is_primary": True},
        )
        Domain.objects.get_or_create(
            domain="localhost",
            tenant=tenant,
            defaults={"is_primary": False},
        )
        user, ucreated = User.objects.get_or_create(
            username="demo",
            defaults={"email": "demo@aviagent.local"},
        )
        if ucreated:
            user.set_password("demo1234")
            user.save()
            self.stdout.write(self.style.SUCCESS("Created demo user demo/demo1234"))
        UserTenant.objects.get_or_create(user=user, tenant=tenant, defaults={"is_primary": True})
        with schema_context(tenant.schema_name):
            from apps.projects.models import Project
            Project.objects.get_or_create(
                slug="default",
                defaults={"name": "Default Project", "client_slug": tenant.client_slug},
            )
