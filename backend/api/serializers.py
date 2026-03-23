"""
SmartSpend API - Serializers
Django REST Framework serializers for data validation and transformation
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import User, Category, Expense, ExpenseComment, ExpensePolicy, Budget, NotificationLog, ExpenseDraft, AdminSetting

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token with user role and permissions"""
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['role'] = user.role
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        token['email'] = user.email
        token['username'] = user.username
        
        return token


class UserSerializer(serializers.ModelSerializer):
    """User serializer for authentication and profile"""

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'department', 'employee_id', 'phone_number',
            'manager', 'created_at', 'is_staff', 'is_superuser'
        ]
        read_only_fields = ['id', 'created_at', 'is_staff', 'is_superuser']
        extra_kwargs = {'password': {'write_only': True}}


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    department = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'confirm_password',
            'first_name', 'last_name', 'role', 'department', 'phone_number'
        ]

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(**validated_data)
        
        # Automatically grant staff privileges to admin users
        if user.role == 'admin':
            user.is_staff = True
            user.save()
        
        return user


class CategorySerializer(serializers.ModelSerializer):
    """Category serializer"""
    expense_count = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'icon', 'monthly_limit', 'expense_count', 'total_amount']
        read_only_fields = ['id']

    def get_expense_count(self, obj):
        return obj.expenses.count()

    def get_total_amount(self, obj):
        from django.db.models import Sum
        total = obj.expenses.aggregate(Sum('amount'))['amount__sum']
        return float(total) if total else 0.0


class ExpenseCommentSerializer(serializers.ModelSerializer):
    """Expense comment serializer"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = ExpenseComment
        fields = ['id', 'user', 'user_name', 'comment', 'created_at']
        read_only_fields = ['id', 'created_at']


class ExpenseSerializer(serializers.ModelSerializer):
    """
    Main expense serializer with nested relationships
    Designed for analytics-friendly output
    """
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_department = serializers.CharField(source='user.department', read_only=True)

    category_name = serializers.CharField(source='category.name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)

    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)

    comments = ExpenseCommentSerializer(many=True, read_only=True)
    processing_time_days = serializers.IntegerField(source='processing_time', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'user', 'user_name', 'user_email', 'user_department',
            'category', 'category_name', 'category_icon',
            'amount', 'currency', 'expense_date', 'merchant', 'description',
            'payment_method', 'receipt_file', 'receipt_ocr_data',
            'status', 'approved_by', 'approved_by_name', 'approved_at',
            'rejection_reason', 'submitted_at', 'updated_at',
            'is_duplicate', 'is_anomaly',
            'comments', 'processing_time_days'
        ]
        read_only_fields = [
            'id', 'submitted_at', 'updated_at', 'approved_by',
            'approved_at', 'is_duplicate', 'is_anomaly'
        ]

    def validate_amount(self, value):
        """Validate expense amount"""
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero")
        if value > 1000000:
            raise serializers.ValidationError("Amount exceeds maximum limit")
        return value

    def validate_expense_date(self, value):
        """Validate expense date"""
        from datetime import date
        if value > date.today():
            raise serializers.ValidationError("Expense date cannot be in the future")
        return value


class ExpenseCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for expense creation"""

    class Meta:
        model = Expense
        fields = [
            'category', 'amount', 'expense_date', 'merchant',
            'description', 'payment_method', 'receipt_file'
        ]


class ExpenseApprovalSerializer(serializers.Serializer):
    """Serializer for approving/rejecting expenses"""
    status = serializers.ChoiceField(choices=['approved', 'rejected'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if data['status'] == 'rejected' and not data.get('rejection_reason'):
            raise serializers.ValidationError("Rejection reason is required when rejecting an expense")
        return data


class ExpenseAnalyticsSerializer(serializers.Serializer):
    """
    Serializer for analytics data
    Used for aggregated insights and dashboard KPIs
    """
    total_expenses = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    approved_count = serializers.IntegerField()
    pending_count = serializers.IntegerField()
    rejected_count = serializers.IntegerField()
    average_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    category_breakdown = serializers.DictField()
    monthly_trend = serializers.ListField()


class BudgetSerializer(serializers.ModelSerializer):
    """Serializer for budget management"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Budget
        fields = [
            'id', 'department', 'category', 'category_name', 'period',
            'amount', 'alert_threshold', 'start_date', 'end_date',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationLogSerializer(serializers.ModelSerializer):
    """Serializer for notification logs"""
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = NotificationLog
        fields = [
            'id', 'user', 'user_email', 'expense', 'notification_type',
            'subject', 'message', 'recipient_email', 'is_sent',
            'sent_at', 'failed_reason', 'created_at'
        ]
        read_only_fields = ['id', 'is_sent', 'sent_at', 'failed_reason', 'created_at']


class ExpenseDraftSerializer(serializers.ModelSerializer):
    """Serializer for expense drafts"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ExpenseDraft
        fields = [
            'id', 'user', 'user_name', 'category', 'category_name',
            'merchant', 'amount', 'expense_date', 'payment_method',
            'description', 'draft_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class AdminSettingSerializer(serializers.ModelSerializer):
    """Serializer for global admin settings."""

    class Meta:
        model = AdminSetting
        fields = [
            'id',
            'company_name',
            'default_currency',
            'budget_alert_threshold',
            'email_notifications',
            'daily_digest',
            'notification_refresh_minutes',
            'auto_approve_limit',
            'require_receipt_above',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']

    def validate_budget_alert_threshold(self, value):
        if value < 1 or value > 100:
            raise serializers.ValidationError('Budget alert threshold must be between 1 and 100.')
        return value

    def validate_notification_refresh_minutes(self, value):
        if value < 1 or value > 60:
            raise serializers.ValidationError('Notification refresh interval must be between 1 and 60 minutes.')
        return value

    def validate_auto_approve_limit(self, value):
        if value < 0:
            raise serializers.ValidationError('Auto-approve limit cannot be negative.')
        return value

    def validate_require_receipt_above(self, value):
        if value < 0:
            raise serializers.ValidationError('Receipt threshold cannot be negative.')
        return value
