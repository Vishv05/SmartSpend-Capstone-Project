"""
SmartSpend API URLs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import UserViewSet, CategoryViewSet, ExpenseViewSet, ExpenseCommentViewSet, mongo_health, BudgetViewSet, NotificationLogViewSet, ExpenseDraftViewSet, AdminSettingViewSet
from .auth_views import register, login, profile

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'expense-comments', ExpenseCommentViewSet, basename='comment')
router.register(r'budgets', BudgetViewSet, basename='budget')
router.register(r'notifications', NotificationLogViewSet, basename='notification')
router.register(r'drafts', ExpenseDraftViewSet, basename='draft')
router.register(r'admin-settings', AdminSettingViewSet, basename='admin-settings')

urlpatterns = [
    # Authentication
    path('auth/register/', register, name='register'),
    path('auth/login/', login, name='login'),
    path('auth/profile/', profile, name='profile'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API
    path('', include(router.urls)),
    path('mongo/health/', mongo_health, name='mongo_health'),
]
