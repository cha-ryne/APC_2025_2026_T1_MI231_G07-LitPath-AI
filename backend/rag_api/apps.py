from django.apps import AppConfig
import os
import sys


class RagApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'rag_api'
    
    def ready(self):
        """Initialize RAG system when Django starts"""
        # Django dev server (manage.py runserver) spawns two processes.
        # Only initialize in the reloader child (RUN_MAIN=true) to avoid double init.
        # In production (gunicorn), RUN_MAIN is never set, so always initialize.
        if 'runserver' in sys.argv and os.environ.get('RUN_MAIN') != 'true':
            return
        
        # Initialize RAG system on startup
        from .rag_service import RAGService
        RAGService.initialize()
