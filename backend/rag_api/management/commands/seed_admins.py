"""
Management command to create initial admin users
Usage: python manage.py seed_admins
"""
from django.core.management.base import BaseCommand
from rag_api.models import AdminUser

class Command(BaseCommand):
    help = 'Creates initial admin users for the system'

    def handle(self, *args, **options):
        # Define initial admin users
        initial_admins = [
            {
                'email': 'admin@litpath.com',
                'password': 'admin123456',
                'full_name': 'System Administrator',
                'is_active': True
            },
            {
                'email': 'librarian@dost.gov.ph',
                'password': 'librarian123',
                'full_name': 'DOST Librarian',
                'is_active': True
            }
        ]
        
        created_count = 0
        skipped_count = 0
        
        for admin_data in initial_admins:
            email = admin_data['email']
            
            # Check if admin already exists
            if AdminUser.objects.filter(email=email).exists():
                self.stdout.write(
                    self.style.WARNING(f'Admin already exists: {email}')
                )
                skipped_count += 1
                continue
            
            # Create new admin
            admin = AdminUser(
                email=admin_data['email'],
                full_name=admin_data['full_name'],
                is_active=admin_data['is_active']
            )
            admin.set_password(admin_data['password'])
            admin.save()
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Created admin: {email}')
            )
            created_count += 1
        
        self.stdout.write('\n' + '='*50)
        self.stdout.write(f'Created: {created_count} | Skipped: {skipped_count}')
        self.stdout.write('='*50 + '\n')
        
        if created_count > 0:
            self.stdout.write(self.style.SUCCESS('Default credentials:'))
            self.stdout.write('  Email: admin@litpath.com | Password: admin123456')
            self.stdout.write('  Email: librarian@dost.gov.ph | Password: librarian123')
            self.stdout.write(self.style.WARNING('\n⚠️  Change these passwords in production!'))
