"""
SmartSpend API - Default seed data helpers.
"""

from django.db.utils import OperationalError, ProgrammingError

from .models import Category

DEFAULT_CATEGORIES = [
    {
        "name": "Travel",
        "description": "Flight, train, taxi",
        "icon": "travel",
    },
    {
        "name": "Meals",
        "description": "Food and beverages",
        "icon": "meals",
    },
    {
        "name": "Accommodation",
        "description": "Hotel, lodging",
        "icon": "hotel",
    },
    {
        "name": "Transportation",
        "description": "Uber, taxi, parking",
        "icon": "transport",
    },
    {
        "name": "Office Supplies",
        "description": "Stationery, equipment",
        "icon": "office",
    },
    {
        "name": "Software",
        "description": "Subscriptions, licenses",
        "icon": "software",
    },
    {
        "name": "Training",
        "description": "Courses, conferences",
        "icon": "training",
    },
]


def ensure_default_categories():
    try:
        if Category.objects.exists():
            return False
    except (OperationalError, ProgrammingError):
        return False

    for category in DEFAULT_CATEGORIES:
        Category.objects.get_or_create(
            name=category["name"],
            defaults={
                "description": category["description"],
                "icon": category["icon"],
            },
        )
    return True
