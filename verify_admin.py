#!/usr/bin/env python
import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartspend.settings')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Check admin user
admin = User.objects.filter(username='admin').first()

if admin:
    print("✅ Admin User Found:")
    print(f"   Username: {admin.username}")
    print(f"   Email: {admin.email}")
    print(f"   Role: {admin.role}")
    print(f"   is_staff: {admin.is_staff}")
    print(f"   is_superuser: {admin.is_superuser}")
else:
    print("❌ Admin user not found!")

# Check all users
print("\n📋 All Users:")
all_users = User.objects.all()
for user in all_users:
    print(f"   - {user.username} ({user.role}) - is_staff: {user.is_staff}")
