from django.apps import AppConfig
import os


class RagApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'rag_api'
    
    def ready(self):
        """Initialize RAG system when Django starts"""
        # Skip initialization in the reloader process
        if os.environ.get('RUN_MAIN') != 'true':
            return
        
        # Initialize RAG system on startup
        from .rag_service import RAGService
        RAGService.initialize()
