"""
WSGI config for smartspend project.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartspend.settings')
application = get_wsgi_application()
