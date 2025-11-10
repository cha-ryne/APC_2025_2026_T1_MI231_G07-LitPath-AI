from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .rag_service import RAGService


class HealthCheckView(APIView):
    """
    GET /api/health/
    Returns health status of the RAG system
    """
    
    def get(self, request):
        try:
            from django.conf import settings
            import os
            import glob
            
            theses_folder = settings.RAG_THESES_FOLDER
            txt_files = glob.glob(os.path.join(theses_folder, '*.txt'))
            pdf_files = glob.glob(os.path.join(theses_folder, '*.pdf'))
            
            # Get detailed stats if RAG is initialized
            if RAGService._initialized:
                rag = RAGService()
                detailed_status = rag.get_health_status()
                health_data = {
                    "status": "healthy",
                    "message": "Backend is running",
                    "total_documents": detailed_status["total_documents"],
                    "total_chunks": detailed_status["total_chunks"],
                    "txt_files": len(txt_files),
                    "pdf_files": len(pdf_files),
                    "rag_initialized": True
                }
            else:
                health_data = {
                    "status": "healthy",
                    "message": "Backend is running",
                    "total_documents": 0,
                    "total_chunks": 0,
                    "txt_files": len(txt_files),
                    "pdf_files": len(pdf_files),
                    "rag_initialized": False
                }
            
            return Response(health_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"status": "unhealthy", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SearchView(APIView):
    """
    POST /api/search/
    Search for relevant theses and generate AI overview
    
    Request body:
    {
        "question": "What is the impact of climate change on rice production?"
    }
    
    Response:
    {
        "overview": "AI-generated overview with references...",
        "documents": [
            {
                "title": "...",
                "author": "...",
                "publication_year": "...",
                "abstract": "...",
                "file": "...",
                ...
            }
        ],
        "related_questions": []
    }
    """
    
    def post(self, request):
        try:
            question = request.data.get("question", "").strip()
            
            if not question:
                return Response(
                    {"error": "Missing question parameter"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # RAG system is already initialized on startup
            rag = RAGService()
            
            # Search for relevant chunks
            top_chunks, documents, distance_threshold = rag.search(question)
            
            # Generate AI overview
            overview = rag.generate_overview(top_chunks, question, distance_threshold)
            
            # If no relevant chunks, clean up
            if not any(c["score"] < distance_threshold for c in top_chunks):
                documents = []
                import re
                overview = re.sub(r"\[\d+\]", "", overview)
            
            response_data = {
                "overview": overview,
                "documents": documents,
                "related_questions": []  # Placeholder for future feature
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
