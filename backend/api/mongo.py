"""
SmartSpend MongoDB helper
"""

from django.conf import settings

try:
    from pymongo import MongoClient
    PYMONGO_AVAILABLE = True
except ImportError:
    PYMONGO_AVAILABLE = False
    MongoClient = None

_client = None


def get_mongo_client():
    global _client
    if not PYMONGO_AVAILABLE:
        raise RuntimeError("pymongo is not installed. Install it with: pip install pymongo")
    if _client is None:
        _client = MongoClient(settings.MONGO_URI)
    return _client


def get_mongo_db():
    if not PYMONGO_AVAILABLE:
        raise RuntimeError("pymongo is not installed. Install it with: pip install pymongo")
    client = get_mongo_client()
    return client[settings.MONGO_DB]
