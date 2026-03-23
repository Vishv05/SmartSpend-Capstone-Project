#!/usr/bin/env python
"""Test API endpoints with authentication"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartspend.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.test import RequestFactory
from rest_framework.test import force_authenticate
from api.views import UserViewSet, ExpenseViewSet, CategoryViewSet

User = get_user_model()

# Get an admin user
admin = User.objects.filter(role='admin', is_staff=True).first()
print(f"Testing with admin user: {admin.email}")
print(f"  is_staff: {admin.is_staff}")
print(f"  role: {admin.role}")
print(f"  is_authenticated: {admin.is_authenticated}")
print()

# Create request factory
factory = RequestFactory()

# Test Users endpoint
print("=" * 60)
print("Testing /api/users/ endpoint")
print("=" * 60)
request = factory.get('/api/users/')
force_authenticate(request, user=admin)
view = UserViewSet.as_view({'get': 'list'})
response = view(request)
print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    data = response.data
    if isinstance(data, dict) and 'results' in data:
        # Paginated response
        print(f"Users Count: {len(data['results'])}")
        print(f"Total: {data.get('count', 'N/A')}")
        print(f"Sample: {data['results'][0]['email'] if data['results'] else 'Empty'}")
    elif isinstance(data, list):
        # Non-paginated response
        print(f"Users Count: {len(data)}")
        print(f"Sample: {data[0]['email'] if data else 'Empty'}")
    else:
        print(f"Data type: {type(data)}")
        print(f"Data: {data}")
else:
    print(f"Error: {response.data}")
print()

# Test Expenses endpoint
print("=" * 60)
print("Testing /api/expenses/ endpoint")
print("=" * 60)
request = factory.get('/api/expenses/')
force_authenticate(request, user=admin)
view = ExpenseViewSet.as_view({'get': 'list'})
response = view(request)
print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    data = response.data
    if isinstance(data, dict) and 'results' in data:
        # Paginated response
        print(f"Expenses Count: {len(data['results'])}")
        print(f"Total: {data.get('count', 'N/A')}")
        print(f"Sample: {data['results'][0]['description'][:50] if data['results'] else 'Empty'}")
    elif isinstance(data, list):
        # Non-paginated response
        print(f"Expenses Count: {len(data)}")
        print(f"Sample: {data[0]['description'][:50] if data else 'Empty'}")
    else:
        print(f"Data type: {type(data)}")
        print(f"Data: {data}")
else:
    print(f"Error: {response.data}")
print()

# Test Categories endpoint
print("=" * 60)
print("Testing /api/categories/ endpoint")
print("=" * 60)
request = factory.get('/api/categories/')
force_authenticate(request, user=admin)
view = CategoryViewSet.as_view({'get': 'list'})
response = view(request)
print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    data = response.data
    if isinstance(data, dict) and 'results' in data:
        # Paginated response
        print(f"Categories Count: {len(data['results'])}")
        print(f"Total: {data.get('count', 'N/A')}")
        print(f"Sample: {data['results'][0]['name'] if data['results'] else 'Empty'}")
    elif isinstance(data, list):
        # Non-paginated response
        print(f"Categories Count: {len(data)}")
        print(f"Sample: {data[0]['name'] if data else 'Empty'}")
    else:
        print(f"Data type: {type(data)}")
        print(f"Data: {data}")
else:
    print(f"Error: {response.data}")
