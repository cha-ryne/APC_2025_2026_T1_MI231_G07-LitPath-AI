# Django Backend for LitPath AI

This is the Django-based backend for the LitPath AI thesis search system.

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Set Environment Variables

Create a `.env` file in the `backend` directory:

```env
DJANGO_SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
GEMINI_API_KEY=your-gemini-api-key-here
```

### 3. Run Migrations

```bash
python manage.py migrate
```

### 4. Start the Development Server

```bash
python manage.py runserver
```

The backend will be available at `http://localhost:8000`

## API Endpoints

### Health Check
```
GET /api/health/
```

Returns the health status of the RAG system:
```json
{
  "status": "healthy",
  "total_documents": 15,
  "total_chunks": 1250,
  "total_txt_files": 15
}
```

### Search
```
POST /api/search/
Content-Type: application/json

{
  "question": "What is the impact of climate change on rice production?"
}
```

Returns:
```json
{
  "overview": "AI-generated overview with references [1][2][3]...",
  "documents": [
    {
      "title": "Climate Impact on Rice",
      "author": "Juan Dela Cruz",
      "publication_year": "2023",
      "abstract": "This study investigates...",
      "file": "thesis_rice_2023.txt",
      "degree": "Master of Science",
      "call_no": "SB191.R5 D45 2023",
      "subjects": "Agriculture, Climate Change",
      "university": "University of the Philippines"
    }
  ],
  "related_questions": []
}
```

## Project Structure

```
backend/
├── manage.py                   # Django management script
├── requirements.txt            # Python dependencies
├── litpath_backend/           # Main Django project
│   ├── __init__.py
│   ├── settings.py            # Django settings
│   ├── urls.py                # Main URL routing
│   ├── wsgi.py                # WSGI application
│   └── asgi.py                # ASGI application
└── rag_api/                   # RAG API Django app
    ├── __init__.py
    ├── apps.py                # App configuration
    ├── urls.py                # API URL routing
    ├── views.py               # API views (endpoints)
    └── rag_service.py         # RAG core logic
```

## Frontend Integration

Update your React frontend (`my-app/src/LitPathAI.jsx`) to use the new Django backend:

```javascript
// Change from:
const API_BASE_URL = 'http://localhost:5000';

// To:
const API_BASE_URL = 'http://localhost:8000/api';
```

The endpoints remain the same:
- Health check: `GET /api/health/`
- Search: `POST /api/search/`

## Migration from Old Backend

The old `RAG/multi_thesis_rag.py` HTTP server is replaced by this Django backend. 

**Key improvements:**
- ✅ Production-ready framework
- ✅ Better error handling
- ✅ Built-in CORS support
- ✅ RESTful API structure
- ✅ Easier to extend with new features
- ✅ Database support (for future features)
- ✅ Admin panel (`/admin/`)
- ✅ Better logging and debugging

## Adding Database Models (Future)

When ready to add database persistence:

1. Create models in `rag_api/models.py`
2. Run migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

Example models for your ERD:
```python
from django.db import models

class SearchHistory(models.Model):
    session_id = models.CharField(max_length=36)
    query_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    # ... more fields

class Bookmark(models.Model):
    session_id = models.CharField(max_length=36)
    document_cache = models.ForeignKey('DocumentCache', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    # ... more fields
```

## Development Tips

### Run with auto-reload
```bash
python manage.py runserver
```

### Create superuser for admin panel
```bash
python manage.py createsuperuser
```

### Check for issues
```bash
python manage.py check
```

### Run tests
```bash
python manage.py test
```

## Production Deployment

For production, you'll need:
1. Set `DEBUG=False` in `.env`
2. Configure proper `SECRET_KEY`
3. Set up PostgreSQL/MySQL database
4. Use `gunicorn` or `uwsgi` as WSGI server
5. Set up `nginx` as reverse proxy
6. Configure static files serving
7. Enable HTTPS

Example with gunicorn:
```bash
gunicorn litpath_backend.wsgi:application --bind 0.0.0.0:8000
```
