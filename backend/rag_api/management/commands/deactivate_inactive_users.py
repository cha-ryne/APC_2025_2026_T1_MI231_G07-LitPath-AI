from django.core.management.base import BaseCommand
from rag_api.models import UserAccount
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Deactivate user accounts with 1 year of inactivity (last_login > 1 year ago)'

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=365)
        users = UserAccount.objects.filter(is_active=True, last_login__lt=cutoff)
        count = users.update(is_active=False)
        self.stdout.write(self.style.SUCCESS(f'Deactivated {count} user(s) inactive for over 1 year.'))
