"""
Django management command to seed test user accounts.
Creates demo accounts for testing the unified user system.
"""
from django.core.management.base import BaseCommand
from rag_api.models import UserAccount, UserRole


class Command(BaseCommand):
    help = 'Seed test user accounts for development'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete all existing user accounts before seeding',
        )

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write('Deleting all user accounts...')
            UserAccount.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('All user accounts deleted.'))

        # Test users to create
        test_users = [
            {
                'email': 'admin@litpath.com',
                'username': 'admin',
                'full_name': 'System Administrator',
                'password': 'admin123',
                'role': UserRole.ADMIN,
            },
            {
                'email': 'staff@litpath.com',
                'username': 'staff',
                'full_name': 'Library Staff',
                'password': 'staff123',
                'role': UserRole.STAFF,
            },
            {
                'email': 'user@litpath.com',
                'username': 'testuser',
                'full_name': 'Test User',
                'password': 'user123',
                'role': UserRole.USER,
            },
        ]

        created_count = 0
        for user_data in test_users:
            email = user_data['email']
            
            # Check if user already exists
            if UserAccount.objects.filter(email=email).exists():
                self.stdout.write(f'User {email} already exists, skipping.')
                continue

            # Create new user
            user = UserAccount(
                email=email,
                username=user_data['username'],
                full_name=user_data['full_name'],
                role=user_data['role'],
            )
            user.set_password(user_data['password'])
            user.save()

            created_count += 1
            self.stdout.write(
                self.style.SUCCESS(f'Created {user_data["role"]} user: {email}')
            )

        self.stdout.write(self.style.SUCCESS(f'\nTotal users created: {created_count}'))
        self.stdout.write('\nTest credentials:')
        self.stdout.write('  Admin:  admin@litpath.com / admin123')
        self.stdout.write('  Staff:  staff@litpath.com / staff123')
        self.stdout.write('  User:   user@litpath.com / user123')
