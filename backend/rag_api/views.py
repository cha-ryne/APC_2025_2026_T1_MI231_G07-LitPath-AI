from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .rag_service import RAGService
import time


class FiltersView(APIView):
    """
    GET /api/filters/
    Returns available filter options (subjects and years)
    
    Response:
    {
        "subjects": ["Agriculture", "Computer Science", ...],
        "years": ["2023", "2022", "2021", ...]
    }
    """
    
    def get(self, request):
        try:
            if not RAGService._initialized:
                return Response(
                    {"subjects": [], "years": [], "message": "RAG system not initialized yet"},
                    status=status.HTTP_200_OK
                )
            
            rag = RAGService()
            filters = rag.get_available_filters()
            
            return Response(filters, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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
        "question": "What is the impact of climate change on rice production?",
        "filters": {
            "subjects": ["Agriculture", "Environmental Science"],  // Optional: filter by subjects (OR logic)
            "year": 2022,  // Optional: filter by specific year
            "year_start": 2020,  // Optional: start of year range
            "year_end": 2023  // Optional: end of year range
        }
    }
    
    Note: Use either 'year' for a specific year, or 'year_start'/'year_end' for a range.
    
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
        "related_questions": [],
        "filters_applied": {"subjects": [...], "year": ..., "year_range": [start, end]}
    }
    """
    
    def post(self, request):
        try:
            question = request.data.get("question", "").strip()
            filters = request.data.get("filters", {})
            conversation_history = request.data.get("conversation_history", [])
            
            if not question:
                return Response(
                    {"error": "Missing question parameter"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Extract filter parameters
            subjects = filters.get("subjects", [])
            year = filters.get("year")
            year_start = filters.get("year_start")
            year_end = filters.get("year_end")
            
            # Validate filter parameters
            if subjects and not isinstance(subjects, list):
                return Response(
                    {"error": "'subjects' must be a list"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # RAG system is already initialized on startup
            rag = RAGService()
            
            # Track timing
            start_time = time.time()
            
            # Resolve pronouns in query using conversation history
            # This enhances the search query with entities from previous turns
            from .conversation_utils import conversation_manager
            enhanced_question = conversation_manager.resolve_pronouns(question, conversation_history)
            
            # Search for relevant chunks with filters (using enhanced query)
            search_start = time.time()
            top_chunks, documents, distance_threshold = rag.search(
                enhanced_question,  # Use enhanced query for better search
                subjects=subjects if subjects else None,
                year=year,
                year_start=year_start,
                year_end=year_end
            )
            search_time = time.time() - search_start
            print(f"[RAG] Search took {search_time:.2f}s")
            
            # Generate AI overview with conversation history for context
            # (Pass original question so AI sees what user actually asked)
            generate_start = time.time()
            overview = rag.generate_overview(top_chunks, question, distance_threshold, conversation_history)
            generate_time = time.time() - generate_start
            print(f"[RAG] AI generation took {generate_time:.2f}s")
            
            total_time = time.time() - start_time
            print(f"[RAG] Total time: {total_time:.2f}s")
            
            # Calculate accuracy metrics
            search_metrics = rag.calculate_search_metrics(top_chunks, distance_threshold)
            citation_metrics = rag.verify_citations(overview, top_chunks)
            
            # Hallucination detection (keyword-based for performance)
            from .accuracy_metrics import accuracy_metrics
            source_texts = [c["chunk"] for c in top_chunks[:5]]
            hallucination_metrics = accuracy_metrics.detect_hallucinations_keyword(overview, source_texts)
            
            # Log metrics for monitoring
            print(f"[RAG] Search Metrics: {search_metrics['documents_returned']} docs, avg_distance={search_metrics['avg_distance']}")
            print(f"[RAG] Citation Verification: {citation_metrics['verified_citations']}/{citation_metrics['total_citations']} ({citation_metrics['verification_rate']}%)")
            print(f"[RAG] Factual Accuracy: {hallucination_metrics['factual_accuracy']}%")
            
            # If no relevant chunks, clean up
            if not any(c["score"] < distance_threshold for c in top_chunks):
                documents = []
                import re
                overview = re.sub(r"\[\d+\]", "", overview)
            
            # Build filters_applied summary
            filters_applied = {}
            if subjects:
                filters_applied["subjects"] = subjects
            if year:
                filters_applied["year"] = year
            if year_start or year_end:
                filters_applied["year_range"] = [year_start, year_end]
            
            response_data = {
                "overview": overview,
                "documents": documents,
                "related_questions": [],  # Placeholder for future feature
                "filters_applied": filters_applied if filters_applied else None,
                "accuracy_metrics": {
                    "search": search_metrics,
                    "citation_verification": citation_metrics,
                    "hallucination_detection": {
                        "method": hallucination_metrics.get("method"),
                        "factual_accuracy": hallucination_metrics.get("factual_accuracy"),
                        "hallucination_rate": hallucination_metrics.get("hallucination_rate"),
                        "sentences_analyzed": hallucination_metrics.get("total_sentences")
                    }
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============= Bookmark Views =============
from rest_framework.decorators import api_view
from .models import Bookmark, ResearchHistory, Feedback
from .serializers import BookmarkSerializer, ResearchHistorySerializer, FeedbackSerializer
@api_view(['GET', 'POST'])
def bookmarks_view(request):
    """
    GET: List all bookmarks for a user
    POST: Create a new bookmark
    """
    user_id = request.query_params.get('user_id') or request.data.get('user_id')
    
    if not user_id:
        return Response(
            {"error": "user_id is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if request.method == 'GET':
        bookmarks = Bookmark.objects.filter(user_id=user_id)
        serializer = BookmarkSerializer(bookmarks, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        serializer = BookmarkSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
def bookmark_delete_view(request, bookmark_id):
    """Delete a specific bookmark"""
    try:
        bookmark = Bookmark.objects.get(id=bookmark_id)
        bookmark.delete()
        return Response(
            {"message": "Bookmark deleted successfully"},
            status=status.HTTP_200_OK
        )
    except Bookmark.DoesNotExist:
        return Response(
            {"error": "Bookmark not found"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['DELETE'])
def bookmark_delete_by_file_view(request):
    """Delete bookmark by file path"""
    user_id = request.query_params.get('user_id')
    file = request.query_params.get('file')
    
    if not user_id or not file:
        return Response(
            {"error": "user_id and file are required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    deleted_count, _ = Bookmark.objects.filter(user_id=user_id, file=file).delete()
    
    return Response(
        {"message": f"{deleted_count} bookmark(s) deleted"},
        status=status.HTTP_200_OK
    )


# ============= Research History Views =============

@api_view(['GET', 'POST'])
def research_history_view(request):
    """
    GET: List all research history for a user
    POST: Create a new research history session
    """
    user_id = request.query_params.get('user_id') or request.data.get('user_id')
    
    if not user_id:
        return Response(
            {"error": "user_id is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if request.method == 'GET':
        history = ResearchHistory.objects.filter(user_id=user_id).order_by('-created_at')
        serializer = ResearchHistorySerializer(history, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        serializer = ResearchHistorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
def research_history_delete_view(request, session_id):
    """Delete a specific research history session"""
    try:
        history = ResearchHistory.objects.get(session_id=session_id)
        history.delete()
        return Response(
            {"message": "Research history deleted successfully"},
            status=status.HTTP_200_OK
        )
    except ResearchHistory.DoesNotExist:
        return Response(
            {"error": "Research history not found"},
            status=status.HTTP_404_NOT_FOUND
        )


# ============= Feedback Views =============

@api_view(['GET', 'POST'])
def feedback_view(request):
    """
    GET: List all feedback (for analytics)
    POST: Submit new feedback
    """
    if request.method == 'GET':
        # Optional: filter by user_id for user-specific feedback
        user_id = request.query_params.get('user_id')
        if user_id:
            feedback = Feedback.objects.filter(user_id=user_id)
        else:
            # For admin analytics - get all feedback
            feedback = Feedback.objects.all()
        
        serializer = FeedbackSerializer(feedback, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        serializer = FeedbackSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
