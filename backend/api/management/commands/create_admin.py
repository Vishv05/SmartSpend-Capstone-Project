"""
Management command to create a demo admin user
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Creates a demo admin user for testing'

    def handle(self, *args, **kwargs):
        # Check if admin user already exists
        if User.objects.filter(email='admin@smartspend.com').exists():
            self.stdout.write(self.style.WARNING('Admin user already exists'))
            return

        # Create admin user
        admin = User.objects.create_user(
            username='admin',
            email='admin@smartspend.com',
            password='admin123',
            first_name='Admin',
            last_name='User',
            role='admin',
            is_staff=True,
            is_superuser=True,
            department='Management'
        )
        
        self.stdout.write(self.style.SUCCESS(
            f'Successfully created admin user: {admin.email}'
        ))
        self.stdout.write(self.style.SUCCESS(
            'Login with: admin@smartspend.com / admin123'
        ))
