from django.urls import path
from .views import (
    HealthCheckView, SearchView, FiltersView,
    bookmarks_view, bookmark_delete_view, bookmark_delete_by_file_view,
    research_history_view, research_history_delete_view,
    feedback_view
)

urlpatterns = [
    # Support both with and without trailing slashes
    path('health/', HealthCheckView.as_view(), name='health'),
    path('health', HealthCheckView.as_view(), name='health-no-slash'),
    path('search/', SearchView.as_view(), name='search'),
    path('search', SearchView.as_view(), name='search-no-slash'),
    path('filters/', FiltersView.as_view(), name='filters'),
    path('filters', FiltersView.as_view(), name='filters-no-slash'),
    
    # Bookmarks
    path('bookmarks/', bookmarks_view, name='bookmarks'),
    path('bookmarks', bookmarks_view, name='bookmarks-no-slash'),
    path('bookmarks/<int:bookmark_id>/', bookmark_delete_view, name='bookmark-delete'),
    path('bookmarks/delete-by-file/', bookmark_delete_by_file_view, name='bookmark-delete-by-file'),
    
    # Research History
    path('research-history/', research_history_view, name='research-history'),
    path('research-history', research_history_view, name='research-history-no-slash'),
    path('research-history/<str:session_id>/', research_history_delete_view, name='research-history-delete'),
    
    # Feedback
    path('feedback/', feedback_view, name='feedback'),
    path('feedback', feedback_view, name='feedback-no-slash'),
]
