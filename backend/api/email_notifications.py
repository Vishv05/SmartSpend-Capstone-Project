"""
SmartSpend - Email Notification Service
Send email notifications for expense approvals, budget alerts, etc.
"""

from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from .models import NotificationLog


def send_notification_email(user, notification_type, subject, message, expense=None):
    """
    Send email notification and log it
    """
    recipient_email = user.email
    
    # Create notification log
    notification = NotificationLog.objects.create(
        user=user,
        expense=expense,
        notification_type=notification_type,
        subject=subject,
        message=message,
        recipient_email=recipient_email
    )
    
    try:
        # Send email
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        
        # Mark as sent
        notification.is_sent = True
        notification.sent_at = timezone.now()
        notification.save()
        
        return True
    except Exception as e:
        # Log failure
        notification.failed_reason = str(e)
        notification.save()
        return False


def notify_expense_submitted(expense):
    """Notify admin/manager when expense is submitted"""
    # Find approver (manager or admin)
    approver = expense.user.manager
    if not approver:
        # Find any admin
        from .models import User
        approver = User.objects.filter(role='admin', is_staff=True).first()
    
    if approver:
        subject = f"New Expense Submitted: ₹{expense.amount} - {expense.category.name}"
        message = f"""
Hello {approver.first_name or approver.username},

A new expense has been submitted and requires your approval:

User: {expense.user.get_full_name() or expense.user.username}
Amount: ₹{expense.amount}
Category: {expense.category.name}
Merchant: {expense.merchant}
Date: {expense.expense_date}
Description: {expense.description}

Please log in to SmartSpend to review and approve/reject this expense.

Thank you,
SmartSpend Team
        """
        send_notification_email(approver, 'approval_pending', subject, message, expense)


def notify_expense_approved(expense):
    """Notify user when their expense is approved"""
    subject = f"Expense Approved: ₹{expense.amount} - {expense.category.name}"
    message = f"""
Hello {expense.user.first_name or expense.user.username},

Good news! Your expense has been approved:

Amount: ₹{expense.amount}
Category: {expense.category.name}
Merchant: {expense.merchant}
Date: {expense.expense_date}
Approved by: {expense.approved_by.get_full_name() or expense.approved_by.username}
Approved on: {expense.approved_at}

Thank you,
SmartSpend Team
    """
    send_notification_email(expense.user, 'approval_approved', subject, message, expense)


def notify_expense_rejected(expense):
    """Notify user when their expense is rejected"""
    subject = f"Expense Rejected: ₹{expense.amount} - {expense.category.name}"
    message = f"""
Hello {expense.user.first_name or expense.user.username},

Your expense has been rejected:

Amount: ₹{expense.amount}
Category: {expense.category.name}
Merchant: {expense.merchant}
Date: {expense.expense_date}
Rejected by: {expense.approved_by.get_full_name() or expense.approved_by.username if expense.approved_by else 'Admin'}

Reason: {expense.rejection_reason}

Please contact your manager if you have any questions.

Thank you,
SmartSpend Team
    """
    send_notification_email(expense.user, 'approval_rejected', subject, message, expense)


def notify_budget_alert(user, budget, spent, percentage):
    """Notify when budget threshold is reached"""
    category_name = budget.category.name if budget.category else 'All Categories'
    subject = f"Budget Alert: {budget.department} - {category_name}"
    message = f"""
Hello {user.first_name or user.username},

Budget alert for {budget.department}:

Budget Amount: ₹{budget.amount}
Spent: ₹{spent}
Remaining: ₹{budget.amount - spent}
Usage: {percentage}%
Period: {budget.start_date} to {budget.end_date}

Alert threshold: {budget.alert_threshold}%

Please review spending and take appropriate action.

Thank you,
SmartSpend Team
    """
    send_notification_email(user, 'budget_alert', subject, message)
