from django.urls import path
from .views import HealthCheckView, SearchView, FiltersView

urlpatterns = [
    # Support both with and without trailing slashes
    path('health/', HealthCheckView.as_view(), name='health'),
    path('health', HealthCheckView.as_view(), name='health-no-slash'),
    path('search/', SearchView.as_view(), name='search'),
    path('search', SearchView.as_view(), name='search-no-slash'),
    path('filters/', FiltersView.as_view(), name='filters'),
    path('filters', FiltersView.as_view(), name='filters-no-slash'),
]
