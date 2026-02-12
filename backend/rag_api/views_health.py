import psutil
from django.db import connection
from django.http import JsonResponse
from django.conf import settings

def health_check(request):
    """
    System health check endpoint.
    Returns status of Django, database, and disk usage.
    """
    status = {
        "status": "ok",
        "services": {
            "django": "ok",
            "database": "unknown"
        }
    }

    # --- Database check ---
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            status["services"]["database"] = "ok"
    except Exception:
        status["services"]["database"] = "failed"
        status["status"] = "degraded"

    # --- Disk usage (optional) ---
    try:
        disk = psutil.disk_usage('/')
        status["disk"] = {
            "total": disk.total,
            "used": disk.used,
            "free": disk.free,
            "percent": disk.percent
        }
    except Exception:
        status["disk"] = None

    return JsonResponse(status)