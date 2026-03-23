"""
SmartSpend Django App Configuration
"""

from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    verbose_name = 'SmartSpend API'

    def ready(self):
        from . import signals  # noqa: F401
