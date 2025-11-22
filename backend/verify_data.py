"""
Quick Database Verification Script
Run: python verify_data.py
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'litpath_backend.settings')
django.setup()

from rag_api.models import Bookmark, ResearchHistory, Feedback
from django.utils import timezone
from datetime import timedelta

def main():
    print("=" * 60)
    print("🔍 DJANGO DATABASE VERIFICATION")
    print("=" * 60)
    
    # Check Bookmarks
    bookmark_count = Bookmark.objects.count()
    print(f"\n📚 BOOKMARKS: {bookmark_count} total")
    
    if bookmark_count > 0:
        print("\nRecent Bookmarks:")
        for bookmark in Bookmark.objects.order_by('-bookmarked_at')[:5]:
            print(f"  ✓ {bookmark.title[:60]}...")
            print(f"    User: {bookmark.user_id}")
            print(f"    Date: {bookmark.bookmarked_at.strftime('%Y-%m-%d %H:%M')}")
            print()
    else:
        print("  ⚠️  No bookmarks found. Try bookmarking something in the app!")
    
    # Check Research History
    history_count = ResearchHistory.objects.count()
    print(f"\n🔍 RESEARCH HISTORY: {history_count} total sessions")
    
    if history_count > 0:
        print("\nRecent Sessions:")
        for history in ResearchHistory.objects.order_by('-created_at')[:5]:
            print(f"  ✓ Query: {history.query[:60]}...")
            print(f"    User: {history.user_id}")
            print(f"    Session: {history.session_id}")
            print(f"    Date: {history.created_at.strftime('%Y-%m-%d %H:%M')}")
            print()
    else:
        print("  ⚠️  No research history found. Perform a search in the app!")
    
    # Check Feedback
    feedback_count = Feedback.objects.count()
    print(f"\n💬 FEEDBACK: {feedback_count} total entries")
    
    if feedback_count > 0:
        print("\nRecent Feedback:")
        for feedback in Feedback.objects.order_by('-created_at')[:5]:
            print(f"  ✓ Rating: {'⭐' * (feedback.rating or 0)}")
            print(f"    User: {feedback.user_id}")
            print(f"    Relevant: {'Yes' if feedback.relevant else 'No'}")
            print(f"    Comment: {feedback.comment[:60] if feedback.comment else 'N/A'}...")
            print(f"    Date: {feedback.created_at.strftime('%Y-%m-%d %H:%M')}")
            print()
    else:
        print("  ⚠️  No feedback found. Submit feedback in the app!")
    
    # Check data from last 24 hours
    print("\n" + "=" * 60)
    print("📊 ACTIVITY IN LAST 24 HOURS")
    print("=" * 60)
    
    twenty_four_hours_ago = timezone.now() - timedelta(hours=24)
    
    recent_bookmarks = Bookmark.objects.filter(bookmarked_at__gte=twenty_four_hours_ago).count()
    recent_history = ResearchHistory.objects.filter(created_at__gte=twenty_four_hours_ago).count()
    recent_feedback = Feedback.objects.filter(created_at__gte=twenty_four_hours_ago).count()
    
    print(f"  Bookmarks: {recent_bookmarks}")
    print(f"  Research Sessions: {recent_history}")
    print(f"  Feedback Entries: {recent_feedback}")
    
    # Check old data (>30 days)
    print("\n" + "=" * 60)
    print("⏰ OLD DATA (>30 days - should be auto-deleted)")
    print("=" * 60)
    
    thirty_days_ago = timezone.now() - timedelta(days=30)
    
    old_bookmarks = Bookmark.objects.filter(bookmarked_at__lt=thirty_days_ago).count()
    old_history = ResearchHistory.objects.filter(created_at__lt=thirty_days_ago).count()
    old_feedback = Feedback.objects.filter(created_at__lt=thirty_days_ago).count()
    
    print(f"  Old Bookmarks: {old_bookmarks}")
    print(f"  Old History: {old_history}")
    print(f"  Old Feedback: {old_feedback}")
    
    if old_bookmarks > 0 or old_history > 0 or old_feedback > 0:
        print("\n  ℹ️  Old data found. It will be auto-deleted on next GET request.")
        print("  💡 Or run: python manage.py cleanup_old_data")
    
    print("\n" + "=" * 60)
    print("✅ VERIFICATION COMPLETE")
    print("=" * 60)
    
    # Summary
    total_records = bookmark_count + history_count + feedback_count
    print(f"\n📈 Total records in database: {total_records}")
    
    if total_records == 0:
        print("\n💡 TIP: Use the React app to create some data:")
        print("   1. Go to http://localhost:5173")
        print("   2. Search for a topic")
        print("   3. Bookmark a result")
        print("   4. Submit feedback")
        print("   5. Run this script again!")
    
    print("\n🔗 Quick Links:")
    print("   Bookmarks API: http://localhost:8001/api/bookmarks/?user_id=test_user")
    print("   Feedback API:  http://localhost:8001/api/feedback/")
    print("   History API:   http://localhost:8001/api/research-history/?user_id=test_user")

if __name__ == '__main__':
    main()
