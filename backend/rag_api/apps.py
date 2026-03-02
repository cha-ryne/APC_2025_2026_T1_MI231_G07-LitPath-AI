from django.apps import AppConfig
import os
import sys


class RagApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'rag_api'
    
    def ready(self):
        """RAG system uses lazy initialization now.
        
        Previously we initialized here on startup, but that caused OOM on
        Railway because --preload duplicated ChromaDB memory across master
        and worker.  Now RAG initializes on the first search request.
        """
        # For local dev convenience, still auto-init when using runserver
        if 'runserver' in sys.argv and os.environ.get('RUN_MAIN') == 'true':
            from .rag_service import RAGService
            RAGService.initialize()
