# LitPath AI - Intelligent Thesis Search System

**PBL Team:**
- **Project Lead:** Jenine Elaine Dulay
- **QA Tester:** Tracie Tomon
- **Developer:** Charijoy Cempron
- **Developer:** Marielle Kloie Concepcion

---

## 🚀 Quick Start

### ⚠️ First Time Setup - IMPORTANT!

**1. Setup Environment Variables:**
```powershell
# Copy the example file
Copy-Item backend\.env.example backend\.env

# Edit backend\.env with your own credentials:
# - Get Gemini API key from: https://aistudio.google.com/app/apikey
# - Get Supabase credentials from your Supabase dashboard
```

**🔒 SECURITY WARNING:** Never commit `.env` files to git! See `SECURITY_SETUP.md` for details.

### Backend (Django)
```powershell
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_admins  # Create default admin accounts
python manage.py runserver
```
Backend runs at: `http://localhost:8000`

### Frontend (React + Vite)
```powershell
cd my-app
npm install
npm run dev
```
Frontend runs at: `http://localhost:5173`

**Or use the startup script:**
```powershell
.\start-backend.ps1
```

---

## 📁 Project Structure

```
LitPath-AI/
├── backend/                    # Django backend (NEW!)
│   ├── manage.py
│   ├── requirements.txt
│   ├── litpath_backend/       # Django project settings
│   └── rag_api/               # RAG API app
│       ├── views.py           # API endpoints
│       ├── rag_service.py     # RAG core logic
│       └── urls.py
├── my-app/                    # React frontend
│   ├── src/
│   │   ├── LitPathAI.jsx     # Main component
│   │   └── components/
│   └── package.json
├── RAG/                       # RAG system files
│   ├── theses/               # PDF thesis files
│   ├── chromadb_data/        # Vector database
│   ├── extract_metadata.py   # Metadata extraction
│   └── multi_thesis_rag.py   # Legacy (replaced by Django)
└── docs/                      # Documentation

```

---

## 🔄 Recent Changes

### ✅ Migrated to Django Framework
- Replaced custom HTTP server with Django
- Better code organization and scalability
- Built-in admin panel at `/admin/`
- Database ORM ready for your ERD
- Production-ready architecture

**See:** `DJANGO_MIGRATION_SUMMARY.md` and `MIGRATION_GUIDE.md`

---

## 🎯 Features

- **AI-Powered Search**: Semantic search using ChromaDB vector database
- **Intelligent Summaries**: Gemini AI generates comprehensive overviews
- **Document References**: Citations linked to source theses
- **Metadata Extraction**: Automatic thesis metadata extraction
- **Subject Filtering**: 37 controlled subject categories
- **RESTful API**: Clean Django REST Framework endpoints

---

## 📊 API Endpoints

### Health Check
```
GET http://localhost:8000/api/health/
```

### Search
```
POST http://localhost:8000/api/search/
Content-Type: application/json

{
  "question": "What is the impact of climate change on rice production?"
}
```

---

## 🗂️ Database Schema

See your ERD implementation in `backend/rag_api/models.py` (ready to add):
- `DocumentCache` - Cached thesis metadata
- `SearchHistory` - User search tracking
- `Bookmark` - Saved documents
- `UsageStatistics` - Action tracking
- `FeedbackLog` - User feedback
- `StaffAccount` - Admin users

---

## 🛠️ Tech Stack

**Frontend:**
- React 18
- Vite
- Tailwind CSS

**Backend:**
- Django 5.0
- Django REST Framework
- ChromaDB (Vector DB)
- SentenceTransformers
- Google Gemini AI

**Data Processing:**
- PyPDF2 (PDF extraction)
- Tesseract OCR (fallback)
- Custom metadata extraction

---

## 📚 Documentation

- `backend/README.md` - Django backend setup
- `DJANGO_MIGRATION_SUMMARY.md` - Migration overview
- `MIGRATION_GUIDE.md` - Detailed migration guide
- `docs/` - Project documentation

---

## 🔧 Development

### Run Tests
```powershell
cd backend
python manage.py test
```

### Create Admin User
```powershell
python manage.py createsuperuser
```

### Database Migrations
```powershell
python manage.py makemigrations
python manage.py migrate
```

---

## 🚀 Deployment

Ready for production with:
- PostgreSQL/MySQL database
- Gunicorn WSGI server
- Nginx reverse proxy
- HTTPS with Let's Encrypt

See deployment checklist in `backend/README.md`

---

## 📝 Team Roles

- **Project Lead** - Project management and coordination
- **QA Tester** - Quality assurance and testing
- **Developers** - Full-stack development

---
