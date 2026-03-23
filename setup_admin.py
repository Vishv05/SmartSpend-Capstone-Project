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

# Delete existing admin user if it exists
User.objects.filter(username='admin').delete()

# Create new superuser
admin_user = User.objects.create_superuser('admin', 'admin@smartspend.com', 'admin123')
admin_user.role = 'admin'
admin_user.save()

print("✅ Admin superuser created successfully!")
print("   Username: admin")
print("   Email: admin@smartspend.com")
print("   Password: admin123")
print("\n   Access Django admin at: http://127.0.0.1:8000/admin/")
