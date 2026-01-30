from django.urls import path

from .views import (
    HealthCheckView, SearchView, FiltersView,
    bookmarks_view, bookmark_delete_view, bookmark_delete_by_file_view,
    research_history_view, research_history_delete_view,
    feedback_view, feedback_detail
)
from .admin_views import admin_login_view, admin_users_view, admin_user_delete_view
from .auth_views import (
    auth_login_view, auth_register_view, auth_guest_session_view,
    auth_validate_session_view, auth_logout_view, auth_delete_guest_data_view,
    auth_me_view, auth_change_password_view, auth_delete_account_view,
    auth_update_profile_view, auth_password_reset_request_view, auth_reset_password_view
)

from . import views 
urlpatterns = [
    path('auth/update-profile/', auth_update_profile_view, name='auth-update-profile'),
    path('auth/update-profile', auth_update_profile_view, name='auth-update-profile-no-slash'),
    path('auth/password-reset-request/', auth_password_reset_request_view, name='auth-password-reset-request'),
    path('auth/password-reset-request', auth_password_reset_request_view, name='auth-password-reset-request-no-slash'),
    path('auth/reset-password/', auth_reset_password_view, name='auth-reset-password'),
    path('auth/reset-password', auth_reset_password_view, name='auth-reset-password-no-slash'),
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
    path('feedback/<uuid:pk>/', feedback_detail, name='feedback-detail'),
    
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
    path('auth/delete-account/', auth_delete_account_view, name='auth-delete-account'),
    path('auth/delete-account', auth_delete_account_view, name='auth-delete-account-no-slash'),
    
    # Admin Authentication & Management (Legacy - kept for backward compatibility)
    path('admin/login/', admin_login_view, name='admin-login'),
    path('admin/login', admin_login_view, name='admin-login-no-slash'),
    path('admin/users/', admin_users_view, name='admin-users'),
    path('admin/users', admin_users_view, name='admin-users-no-slash'),
    path('admin/users/<uuid:admin_id>/', admin_user_delete_view, name='admin-user-delete'),

    # Material Views (Most Browsed)
    path('track-view/', views.track_material_view, name='track_material_view'),
    path('most-browsed/', views.get_most_browsed, name='get_most_browsed'),
]
