#!/usr/bin/env python
import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartspend.settings')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

django.setup()

from api.models import Category
from api.defaults import ensure_default_categories

print("Creating default categories...")
ensure_default_categories()

print("\n✅ Categories created/verified:")
categories = Category.objects.all()
for cat in categories:
    print(f"   - {cat.name} ({cat.id})")

print(f"\nTotal categories: {categories.count()}")
