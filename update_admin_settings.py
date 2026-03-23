#!/usr/bin/env python
import os
import sys
import django
from decimal import Decimal

# Add backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartspend.settings')
django.setup()

from api.models import AdminSetting

settings, created = AdminSetting.objects.get_or_create(pk=1)
print(f"Before: require_receipt_above = ₹{settings.require_receipt_above}")

settings.require_receipt_above = Decimal('50000.00')
settings.save()

print(f"After: require_receipt_above = ₹{settings.require_receipt_above}")
print("✓ Updated successfully!")

