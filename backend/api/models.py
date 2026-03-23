"""
SmartSpend - Database Models
Data-Driven Design for Analytics-Ready Schema
"""

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from decimal import Decimal


class User(AbstractUser):
    """
    Extended User model with role-based access
    """
    ROLE_CHOICES = [
        ('employee', 'Employee'),
        ('manager', 'Manager'),
        ('admin', 'Admin'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    department = models.CharField(max_length=100, blank=True)
    employee_id = models.CharField(max_length=50, unique=True, null=True)
    phone_number = models.CharField(max_length=15, blank=True)
    manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    
    # Analytics metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['role', 'department']),
            models.Index(fields=['employee_id']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"


class Category(models.Model):
    """
    Expense categories for classification and analytics
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=10, blank=True)  # Emoji or icon identifier
    is_active = models.BooleanField(default=True)
    
    # Budget limits (optional)
    monthly_limit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'Categories'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Expense(models.Model):
    """
    Core expense model - Designed for analytics and reporting
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('upi', 'UPI'),
    ]
    
    # Core fields
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='expenses')
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='expenses')
    
    # Expense details
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    currency = models.CharField(max_length=3, default='INR')
    expense_date = models.DateField()
    merchant = models.CharField(max_length=200)
    description = models.TextField()
    
    # Payment information
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    
    # Receipt handling
    receipt_file = models.FileField(upload_to='receipts/%Y/%m/', null=True, blank=True)
    receipt_ocr_data = models.JSONField(null=True, blank=True)  # Extracted OCR data
    
    # Approval workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_expenses')
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    # Analytics metadata
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Data quality flags
    is_duplicate = models.BooleanField(default=False)
    is_anomaly = models.BooleanField(default=False)  # For ML-based anomaly detection
    
    class Meta:
        db_table = 'expenses'
        ordering = ['-expense_date', '-submitted_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['category', 'expense_date']),
            models.Index(fields=['status', 'submitted_at']),
            models.Index(fields=['expense_date']),
            models.Index(fields=['-amount']),  # For top expenses queries
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.category.name} - ₹{self.amount}"
    
    @property
    def processing_time(self):
        """Calculate processing time in days"""
        if self.approved_at:
            return (self.approved_at - self.submitted_at).days
        return None


class ExpenseComment(models.Model):
    """
    Comments/notes on expenses for communication
    """
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'expense_comments'
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.user.username} on Expense #{self.expense.id}"


class ExpenseDraft(models.Model):
    """
    Draft expenses saved by users before submission
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='expense_drafts')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Draft details
    merchant = models.CharField(max_length=200, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    expense_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    
    # Metadata
    draft_name = models.CharField(max_length=100, blank=True, help_text="Optional name for the draft")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'expense_drafts'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', '-updated_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.merchant or 'Untitled Draft'}"


class ExpensePolicy(models.Model):
    """
    Policy rules for automated validation and compliance
    """
    name = models.CharField(max_length=200)
    description = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.CASCADE, null=True, blank=True)
    
    # Policy rules (stored as JSON for flexibility)
    rules = models.JSONField(help_text="JSON format: {max_amount: 5000, requires_receipt: true, ...}")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'expense_policies'
        verbose_name_plural = 'Expense Policies'
    
    def __str__(self):
        return self.name


class AuditLog(models.Model):
    """
    Audit trail for compliance and analytics
    """
    ACTION_CHOICES = [
        ('create', 'Created'),
        ('update', 'Updated'),
        ('approve', 'Approved'),
        ('reject', 'Rejected'),
        ('delete', 'Deleted'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, null=True, blank=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    details = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['expense', 'action']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.action} - {self.timestamp}"


class FinancialGoal(models.Model):
    """User savings goal for AI goal projection."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='financial_goals')
    name = models.CharField(max_length=120)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('1'))])
    target_date = models.DateField(null=True, blank=True)
    monthly_target = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'financial_goals'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.name}"


class InsightFeedback(models.Model):
    """Feedback collected for AI insight quality and drift monitoring."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='insight_feedback')
    expense = models.ForeignKey(Expense, on_delete=models.SET_NULL, null=True, blank=True, related_name='insight_feedback')
    insight_type = models.CharField(max_length=60)
    insight_key = models.CharField(max_length=120)
    is_useful = models.BooleanField(null=True, blank=True)
    corrected_value = models.JSONField(null=True, blank=True)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'insight_feedback'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['insight_type', 'created_at']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.insight_type}"


class Budget(models.Model):
    """Budget management for departments and categories."""
    
    PERIOD_CHOICES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]
    
    department = models.CharField(max_length=100, db_index=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, null=True, blank=True, related_name='budgets')
    period = models.CharField(max_length=20, choices=PERIOD_CHOICES, default='monthly')
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    alert_threshold = models.IntegerField(default=80, help_text="Alert when spending reaches X% of budget")
    
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'budgets'
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['department', 'start_date']),
            models.Index(fields=['category', 'period']),
        ]
    
    def __str__(self):
        return f"{self.department} - {self.period.capitalize()} Budget - ₹{self.amount}"


class AdminSetting(models.Model):
    """Singleton-like admin configuration used by backend workflows."""

    company_name = models.CharField(max_length=120, default='SmartSpend')
    default_currency = models.CharField(max_length=3, default='INR')
    budget_alert_threshold = models.IntegerField(default=80, help_text='Global budget alert threshold (%)')
    email_notifications = models.BooleanField(default=True)
    daily_digest = models.BooleanField(default=True)
    notification_refresh_minutes = models.IntegerField(default=2)
    auto_approve_limit = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    require_receipt_above = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('50000.00'))
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'admin_settings'

    def __str__(self):
        return f"Admin Settings ({self.company_name})"

    @classmethod
    def get_settings(cls):
        settings_obj, _ = cls.objects.get_or_create(pk=1)
        return settings_obj


class NotificationLog(models.Model):
    """Track notifications sent to users."""
    
    NOTIFICATION_TYPE_CHOICES = [
        ('approval_pending', 'Approval Pending'),
        ('approval_approved', 'Approval Approved'),
        ('approval_rejected', 'Approval Rejected'),
        ('budget_alert', 'Budget Alert'),
        ('budget_exceeded', 'Budget Exceeded'),
        ('expense_submitted', 'Expense Submitted'),
        ('system', 'System Notification'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    expense = models.ForeignKey(Expense, on_delete=models.SET_NULL, null=True, blank=True)
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPE_CHOICES)
    subject = models.CharField(max_length=255)
    message = models.TextField()
    recipient_email = models.EmailField()
    
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    failed_reason = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notification_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_sent']),
            models.Index(fields=['notification_type', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.notification_type} to {self.recipient_email}"
