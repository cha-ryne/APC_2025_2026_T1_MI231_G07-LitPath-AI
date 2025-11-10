from django.urls import path
from .views import HealthCheckView, SearchView

urlpatterns = [
    # Support both with and without trailing slashes
    path('health/', HealthCheckView.as_view(), name='health'),
    path('health', HealthCheckView.as_view(), name='health-no-slash'),
    path('search/', SearchView.as_view(), name='search'),
    path('search', SearchView.as_view(), name='search-no-slash'),
]
