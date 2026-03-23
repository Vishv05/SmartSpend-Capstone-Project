"""
SmartSpend API Management Command - Initialize Database
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import Category

User = get_user_model()

class Command(BaseCommand):
    help = 'Initialize database with default data'

    def handle(self, *args, **options):
        # Create default categories
        categories_data = [
            {'name': 'Travel', 'description': 'Flight, train, taxi', 'icon': '✈️'},
            {'name': 'Meals', 'description': 'Food and beverages', 'icon': '🍽️'},
            {'name': 'Accommodation', 'description': 'Hotel, lodging', 'icon': '🏨'},
            {'name': 'Transportation', 'description': 'Uber, taxi, parking', 'icon': '🚗'},
            {'name': 'Office Supplies', 'description': 'Stationery, equipment', 'icon': '📦'},
            {'name': 'Software', 'description': 'Subscriptions, licenses', 'icon': '💻'},
            {'name': 'Training', 'description': 'Courses, conferences', 'icon': '📚'},
        ]

        for cat_data in categories_data:
            Category.objects.get_or_create(
                name=cat_data['name'],
                defaults={
                    'description': cat_data['description'],
                    'icon': cat_data['icon'],
                }
            )
        
        self.stdout.write(self.style.SUCCESS('✓ Default categories created'))

        # Create demo users (optional)
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@smartspend.com', 'admin123')
            self.stdout.write(self.style.SUCCESS('✓ Admin user created (admin/admin123)'))
        
        if not User.objects.filter(username='manager').exists():
            User.objects.create_user(
                username='manager',
                email='manager@smartspend.com',
                password='manager123',
                first_name='John',
                last_name='Smith',
                role='manager',
                department='Finance'
            )
            self.stdout.write(self.style.SUCCESS('✓ Manager user created (manager/manager123)'))
        
        if not User.objects.filter(username='employee').exists():
            User.objects.create_user(
                username='employee',
                email='employee@smartspend.com',
                password='employee123',
                first_name='Aarav',
                last_name='Patel',
                role='employee',
                department='Engineering'
            )
            self.stdout.write(self.style.SUCCESS('✓ Employee user created (employee/employee123)'))

        self.stdout.write(self.style.SUCCESS('✓ Database initialization complete!'))
