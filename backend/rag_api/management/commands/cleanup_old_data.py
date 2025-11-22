from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from rag_api.models import Bookmark, ResearchHistory, Feedback


class Command(BaseCommand):
    help = 'Delete bookmarks, research history, and feedback older than 30 days'

    def handle(self, *args, **options):
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Delete old bookmarks
        deleted_bookmarks, _ = Bookmark.objects.filter(
            bookmarked_at__lt=thirty_days_ago
        ).delete()
        
        # Delete old research history
        deleted_history, _ = ResearchHistory.objects.filter(
            created_at__lt=thirty_days_ago
        ).delete()
        
        # Delete old feedback
        deleted_feedback, _ = Feedback.objects.filter(
            created_at__lt=thirty_days_ago
        ).delete()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully deleted:\n'
                f'  - {deleted_bookmarks} bookmark(s)\n'
                f'  - {deleted_history} research history session(s)\n'
                f'  - {deleted_feedback} feedback record(s)'
            )
        )
