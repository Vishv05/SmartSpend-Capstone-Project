"""
SmartSpend API - Signals
Ensure default categories exist after migrations and send email notifications.
"""

from django.db.models.signals import post_migrate, post_save
from django.dispatch import receiver

from .defaults import ensure_default_categories
from .models import Expense


@receiver(post_migrate)
def seed_default_categories(sender, **kwargs):
    if getattr(sender, "label", None) != "api":
        return

    ensure_default_categories()


@receiver(post_save, sender=Expense)
def expense_status_change(sender, instance, created, **kwargs):
    """Send email notifications on expense creation or status change"""
    from .email_notifications import (
        notify_expense_submitted,
        notify_expense_approved,
        notify_expense_rejected
    )
    
    # New expense submitted
    if created:
        notify_expense_submitted(instance)
    
    # Expense approved or rejected
    elif instance.status == 'approved' and instance.approved_at:
        notify_expense_approved(instance)
    elif instance.status == 'rejected':
        notify_expense_rejected(instance)
