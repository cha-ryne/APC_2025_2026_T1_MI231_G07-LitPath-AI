web: cd backend && python manage.py collectstatic --noinput && python -m gunicorn litpath_backend.wsgi:application --bind 0.0.0.0:$PORT --timeout 300 --workers 1 --preload
