from django.contrib import admin
from .models import User, Category, Expense, ExpenseComment, ExpensePolicy, AuditLog, FinancialGoal, InsightFeedback, Budget, NotificationLog, ExpenseDraft, AdminSetting

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'department', 'is_active')
    list_filter = ('role', 'department', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'monthly_limit')
    list_filter = ('is_active',)
    search_fields = ('name',)

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'category', 'amount', 'status', 'expense_date')
    list_filter = ('status', 'category', 'expense_date')
    search_fields = ('user__username', 'merchant', 'description')
    readonly_fields = ('submitted_at', 'updated_at')

@admin.register(ExpenseComment)
class ExpenseCommentAdmin(admin.ModelAdmin):
    list_display = ('expense', 'user', 'created_at')
    search_fields = ('expense__id', 'user__username')


@admin.register(ExpenseDraft)
class ExpenseDraftAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'merchant', 'amount', 'category', 'draft_name', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('user__username', 'merchant', 'description', 'draft_name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ExpensePolicy)
class ExpensePolicyAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'timestamp')
    list_filter = ('action', 'timestamp')
    search_fields = ('user__username',)
    readonly_fields = ('timestamp',)


@admin.register(FinancialGoal)
class FinancialGoalAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'target_amount', 'monthly_target', 'target_date', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'user__username')


@admin.register(InsightFeedback)
class InsightFeedbackAdmin(admin.ModelAdmin):
    list_display = ('user', 'insight_type', 'insight_key', 'is_useful', 'created_at')
    list_filter = ('insight_type', 'is_useful', 'created_at')
    search_fields = ('user__username', 'insight_key', 'comment')
    readonly_fields = ('created_at',)


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ('department', 'category', 'period', 'amount', 'alert_threshold', 'start_date', 'end_date', 'is_active')
    list_filter = ('period', 'is_active', 'department')
    search_fields = ('department',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'notification_type', 'recipient_email', 'is_sent', 'sent_at', 'created_at')
    list_filter = ('notification_type', 'is_sent', 'created_at')
    search_fields = ('user__username', 'recipient_email', 'subject')
    readonly_fields = ('created_at', 'sent_at')


@admin.register(AdminSetting)
class AdminSettingAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'default_currency', 'budget_alert_threshold', 'email_notifications', 'daily_digest', 'updated_at')
    readonly_fields = ('updated_at',)
