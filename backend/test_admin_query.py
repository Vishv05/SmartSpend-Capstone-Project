#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartspend.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import Expense
from api.views import ExpenseViewSet
from django.test import RequestFactory
from rest_framework.request import Request

User = get_user_model()

print("=" * 60)
print("DATABASE STATE CHECK")
print("=" * 60)

# Check all expenses
print("\nAll expenses in database:")
expenses = Expense.objects.all()
print(f"Total: {expenses.count()}")
for e in expenses:
    print(f"  ID={e.id}, User={e.user.username}, Amount=₹{e.amount}, Status={e.status}")

# Check admin user
print("\nAdmin user:")
admin = User.objects.get(email='admin@smartspend.com')
print(f"  Username: {admin.username}")
print(f"  is_authenticated: {admin.is_authenticated}")
print(f"  is_staff: {admin.is_staff}")
print(f"  role: {admin.role}")

# Test ExpenseViewSet queryset
print("\n" + "=" * 60)
print("TESTING ExpenseViewSet.get_queryset()")
print("=" * 60)

factory = RequestFactory()
request = factory.get('/api/expenses/')
request.user = admin
api_request = Request(request)

viewset = ExpenseViewSet()
viewset.request = api_request

# Debug the user object
print("\nRequest user details:")
print(f"  user: {api_request.user}")
print(f"  is_authenticated: {api_request.user.is_authenticated}")
print(f"  is_staff: {api_request.user.is_staff}")
print(f"  has 'role' attr: {hasattr(api_request.user, 'role')}")
if hasattr(api_request.user, 'role'):
    print(f"  role: {api_request.user.role}")

queryset = viewset.get_queryset()
print(f"\nExpenses visible to admin via viewset: {queryset.count()}")
for e in queryset:
    print(f"  ID={e.id}, User={e.user.username}, Amount=₹{e.amount}, Status={e.status}")

print("\n" + "=" * 60)
