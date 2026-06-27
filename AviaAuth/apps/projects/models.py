from django.db import models


class Project(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=128)
    client_slug = models.CharField(max_length=255, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("client_slug", "slug")

    def __str__(self):
        return self.name
