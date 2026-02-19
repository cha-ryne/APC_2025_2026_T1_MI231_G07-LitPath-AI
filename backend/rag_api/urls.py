from django.urls import path

from . views import (
    HealthCheckView, SearchView, StreamingSearchView, FiltersView, RAGEvaluationView,
    bookmarks_view, bookmark_delete_view, bookmark_delete_by_file_view,
    research_history_view, research_history_delete_view, 
    feedback_view, feedback_detail,
    get_most_browsed, get_source_ratings, get_material_rating_detail, get_sources_stats, 
    csm_feedback_view, csm_feedback_detail, 
    dashboard_kpi, dashboard_trending_topics, dashboard_failed_queries_count, 
    dashboard_usage_by_category, dashboard_age_distribution, 
    dashboard_monthly_trends, dashboard_weekly_trends, dashboard_daily_trends, 
    track_citation_copy, dashboard_citation_stats, dashboard_citation_monthly, dashboard_citation_weekly, dashboard_citation_daily
)
from . admin_views import admin_login_view, admin_users_view, admin_user_delete_view
from . auth_views import (
    auth_login_view, auth_register_view, auth_guest_session_view,
    auth_validate_session_view, auth_logout_view, auth_delete_guest_data_view,
    auth_me_view, auth_change_password_view,
    auth_update_profile_view
)
from . views import request_password_reset, reset_password
from . views import reset_password

from . import views 
urlpatterns = [
    path('auth/update-profile/', auth_update_profile_view, name='auth-update-profile'),
    path('auth/update-profile', auth_update_profile_view, name='auth-update-profile-no-slash'),
    path('auth/password-reset-request/', request_password_reset, name='auth-password-reset-request'),
    path('auth/password-reset-request', request_password_reset, name='auth-password-reset-request-no-slash'),
    path('auth/reset-password/', reset_password, name='auth-reset-password'),
    path('auth/reset-password', reset_password, name='auth-reset-password-no-slash'),

    # Support both with and without trailing slashes
    path('health/', HealthCheckView.as_view(), name='health'),
    path('health', HealthCheckView.as_view(), name='health-no-slash'),
    path('search/', SearchView.as_view(), name='search'),
    path('search', SearchView.as_view(), name='search-no-slash'),
    path('search/stream/', StreamingSearchView.as_view(), name='search-stream'),
    path('search/stream', StreamingSearchView.as_view(), name='search-stream-no-slash'),
    path('filters/', FiltersView.as_view(), name='filters'),
    path('filters', FiltersView.as_view(), name='filters-no-slash'),
    
    # Bookmarks
    path('bookmarks/', bookmarks_view, name='bookmarks'),
    path('bookmarks', bookmarks_view, name='bookmarks-no-slash'),
    path('bookmarks/<int:bookmark_id>/', bookmark_delete_view, name='bookmark-delete'),
    path('bookmarks/delete-by-file/', bookmark_delete_by_file_view, name='bookmark-delete-by-file'),

    # Citation
    path('track-citation/', track_citation_copy, name='track-citation'),
    path('track-citation', track_citation_copy, name='track-citation-no-slash'),
    
    # Research History
    path('research-history/', research_history_view, name='research-history'),
    path('research-history', research_history_view, name='research-history-no-slash'),
    path('research-history/<str:session_id>/', research_history_delete_view, name='research-history-delete'),
    
    # Feedback
    path('feedback/', feedback_view, name='feedback'),
    path('feedback', feedback_view, name='feedback-no-slash'),
    path('feedback/<uuid:pk>/', feedback_detail, name='feedback-detail'),
    
    # CSM Feedback
    path('csm-feedback/', csm_feedback_view, name='csm-feedback'),
    path('csm-feedback', csm_feedback_view, name='csm-feedback-no-slash'),
    path('csm-feedback/<uuid:pk>/', csm_feedback_detail, name='csm-feedback-detail'),
    
    # Authentication (New unified auth system)
    path('auth/login/', auth_login_view, name='auth-login'),
    path('auth/login', auth_login_view, name='auth-login-no-slash'),
    path('auth/register/', auth_register_view, name='auth-register'),
    path('auth/register', auth_register_view, name='auth-register-no-slash'),
    path('auth/guest-session/', auth_guest_session_view, name='auth-guest-session'),
    path('auth/guest-session', auth_guest_session_view, name='auth-guest-session-no-slash'),
    path('auth/validate-session/', auth_validate_session_view, name='auth-validate-session'),
    path('auth/validate-session', auth_validate_session_view, name='auth-validate-session-no-slash'),
    path('auth/logout/', auth_logout_view, name='auth-logout'),
    path('auth/logout', auth_logout_view, name='auth-logout-no-slash'),
    path('auth/delete-guest-data/', auth_delete_guest_data_view, name='auth-delete-guest-data'),
    path('auth/delete-guest-data', auth_delete_guest_data_view, name='auth-delete-guest-data-no-slash'),
    path('auth/me/', auth_me_view, name='auth-me'),
    path('auth/me', auth_me_view, name='auth-me-no-slash'),
    path('auth/change-password/', auth_change_password_view, name='auth-change-password'),
    path('auth/change-password', auth_change_password_view, name='auth-change-password-no-slash'),
    
    # Admin Authentication & Management (Legacy - kept for backward compatibility)
    path('admin/login/', admin_login_view, name='admin-login'),
    path('admin/login', admin_login_view, name='admin-login-no-slash'),
    path('admin/users/', admin_users_view, name='admin-users'),
    path('admin/users', admin_users_view, name='admin-users-no-slash'),
    path('admin/users/<uuid:admin_id>/', admin_user_delete_view, name='admin-user-delete'),

    # Material Views (Most Browsed)
    path('track-view/', views.track_material_view, name='track_material_view'),
    path('most-browsed/', views.get_most_browsed, name='get_most_browsed'),
    
    # Source Ratings
    path('sources/ratings/', views.get_source_ratings, name='get_source_ratings'),
    path('sources/stats/', views.get_sources_stats, name='get_sources_stats'),
    path('materials/rating/', views.get_material_rating_detail, name='get_material_rating_detail'),
    
    # Analytics
    #path('analytics/compact/', analytics_compact, name='analytics_compact'),
    #path('analytics/compact', analytics_compact, name='analytics_compact_no_slash'),
    #path('analytics/compact/', views.get_analytics_summary, name='analytics-summary'),
    
    # RAG Evaluation (LangSmith-style)
    path('evaluate/', RAGEvaluationView.as_view(), name='rag-evaluate'),
    path('evaluate', RAGEvaluationView.as_view(), name='rag-evaluate-no-slash'),

    # Dashboard API (for librarian dashboard)
    path('dashboard/kpi/', dashboard_kpi, name='dashboard-kpi'),
    path('dashboard/kpi', dashboard_kpi, name='dashboard-kpi-no-slash'),
    path('dashboard/top-theses/', get_most_browsed, name='dashboard-top-theses'),
    path('dashboard/top-theses', get_most_browsed, name='dashboard-top-theses-no-slash'),
    path('dashboard/failed-queries-count/', dashboard_failed_queries_count, name='dashboard-failed-queries-count'),
    path('dashboard/failed-queries-count', dashboard_failed_queries_count, name='dashboard-failed-queries-count-no-slash'),
    path('dashboard/trending-topics/', dashboard_trending_topics, name='dashboard-trending-topics'),
    path('dashboard/trending-topics', dashboard_trending_topics, name='dashboard-trending-topics-no-slash'),
    path('dashboard/usage-by-category/', dashboard_usage_by_category, name='dashboard-usage-category'),
    path('dashboard/usage-by-category', dashboard_usage_by_category, name='dashboard-usage-category-no-slash'),
    path('dashboard/age-distribution/', dashboard_age_distribution, name='dashboard-age-distribution'),
    path('dashboard/age-distribution', dashboard_age_distribution, name='dashboard-age-distribution-no-slash'),
    path('dashboard/monthly-trends/', dashboard_monthly_trends, name='dashboard-monthly-trends'),
    path('dashboard/monthly-trends', dashboard_monthly_trends, name='dashboard-monthly-trends-no-slash'),
    path('dashboard/weekly-trends/', dashboard_weekly_trends, name='dashboard-weekly-trends'),
    path('dashboard/weekly-trends', dashboard_weekly_trends, name='dashboard-weekly-trends-no-slash'),
    path('dashboard/daily-trends/', dashboard_daily_trends, name='dashboard-daily-trends'),
    path('dashboard/daily-trends', dashboard_daily_trends, name='dashboard-daily-trends-no-slash'),
    path('dashboard/citation-stats/', dashboard_citation_stats, name='dashboard-citation-stats'),
    path('dashboard/citation-stats', dashboard_citation_stats, name='dashboard-citation-stats-no-slash'),
    path('dashboard/citation-monthly/', dashboard_citation_monthly, name='dashboard-citation-monthly'),
    path('dashboard/citation-monthly', dashboard_citation_monthly, name='dashboard-citation-monthly-no-slash'),
    path('dashboard/citation-weekly/', dashboard_citation_weekly, name='dashboard-citation-weekly'),
    path('dashboard/citation-weekly', dashboard_citation_weekly, name='dashboard-citation-weekly-no-slash'),
    path('dashboard/citation-daily/', dashboard_citation_daily, name='dashboard-citation-daily'),
    path('dashboard/citation-daily', dashboard_citation_daily, name='dashboard-citation-daily-no-slash'),
]


