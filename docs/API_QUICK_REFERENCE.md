# Quick Reference: Django Backend APIs

## Base URL
```
http://localhost:8000/api
```

## Bookmarks API

### List Bookmarks
```bash
GET /api/bookmarks/?user_id=USER_ID
```

### Create Bookmark
```bash
POST /api/bookmarks/
Content-Type: application/json

{
  "user_id": "user123",
  "title": "Paper Title",
  "author": "Author Name",
  "year": "2023",
  "abstract": "Abstract text",
  "file": "path/to/file.txt",
  "degree": "Master's Thesis",
  "subjects": "Computer Science",
  "school": "University"
}
```

### Delete Bookmark by ID
```bash
DELETE /api/bookmarks/123/
```

### Delete Bookmark by File
```bash
DELETE /api/bookmarks/delete-by-file/?user_id=USER_ID&file=FILE_PATH
```

---

## Research History API

### List History
```bash
GET /api/research-history/?user_id=USER_ID
```

### Create History
```bash
POST /api/research-history/
Content-Type: application/json

{
  "session_id": "session_abc123",
  "user_id": "user123",
  "main_query": "Find research about AI",
  "all_queries": ["Query 1", "Query 2"],
  "conversation_data": {...},
  "sources_count": 5,
  "conversation_length": 2,
  "subjects": "Computer Science",
  "date_filter": "Last year"
}
```

### Delete History
```bash
DELETE /api/research-history/session_abc123/
```

---

## Feedback API

### List All Feedback (Analytics)
```bash
GET /api/feedback/
```

### List User Feedback
```bash
GET /api/feedback/?user_id=USER_ID
```

### Submit Feedback
```bash
POST /api/feedback/
Content-Type: application/json

{
  "user_id": "user123",
  "query": "Search query",
  "rating": 4,
  "relevant": true,
  "comment": "Very helpful"
}
```

---

## Auto-Deletion

All data automatically deleted after **30 days**:
- Bookmarks: based on `bookmarked_at`
- Research History: based on `created_at`
- Feedback: based on `created_at`

### Manual Cleanup
```bash
python manage.py cleanup_old_data
```

---

## Setup Steps

1. **Run Migrations**
```bash
python manage.py makemigrations
python manage.py migrate
```

2. **Start Server**
```bash
python manage.py runserver
```

3. **Test API**
```bash
curl http://localhost:8000/api/health/
```

4. **Update React** (see FRONTEND_UPDATE_GUIDE.md)
