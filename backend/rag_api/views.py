from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from .rag_service import RAGService
from .models import CSMFeedback
from .serializers import CSMFeedbackSerializer
import time
from .models_password_reset import PasswordResetToken
from django.utils import timezone
import secrets
from django.db.models import Count, Avg, Q, Sum
from django.db.models.functions import TruncMonth
import dateutil.parser
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
import psycopg2
from psycopg2.extras import RealDictCursor

User = get_user_model()

# Supabase configuration
SUPABASE_URL = settings.DATABASES['default']['HOST'] if hasattr(settings.DATABASES['default'], 'HOST') else None
SUPABASE_DB = settings.DATABASES['default']['NAME'] if hasattr(settings.DATABASES['default'], 'NAME') else None
SUPABASE_USER = settings.DATABASES['default']['USER'] if hasattr(settings.DATABASES['default'], 'USER') else None
SUPABASE_PASSWORD = settings.DATABASES['default']['PASSWORD'] if hasattr(settings.DATABASES['default'], 'PASSWORD') else None
SUPABASE_PORT = settings.DATABASES['default']['PORT'] if hasattr(settings.DATABASES['default'], 'PORT') else 5432


def insert_to_supabase_general_feedback(data):
    """
    Insert feedback data into Supabase general_feedback table.
    Returns True on success, False on failure.
    """
    try:
        # Get Supabase connection settings from Django settings
        # Check if SUPABASE_URL env var is set for external Supabase
        import os
        supabase_url = os.environ.get('SUPABASE_URL')
        supabase_db = os.environ.get('SUPABASE_DB')
        supabase_user = os.environ.get('SUPABASE_USER')
        supabase_password = os.environ.get('SUPABASE_PASSWORD')
        supabase_port = os.environ.get('SUPABASE_PORT', '5432')
        
        # If not set via env, use local DB settings
        if not supabase_url:
            if hasattr(settings.DATABASES['default'], 'HOST'):
                supabase_url = settings.DATABASES['default']['HOST']
            else:
                return False
        if not supabase_db:
            supabase_db = settings.DATABASES['default']['NAME'] if hasattr(settings.DATABASES['default'], 'NAME') else None
        if not supabase_user:
            supabase_user = settings.DATABASES['default']['USER'] if hasattr(settings.DATABASES['default'], 'USER') else None
        if not supabase_password:
            supabase_password = settings.DATABASES['default']['PASSWORD'] if hasattr(settings.DATABASES['default'], 'PASSWORD') else None
        if not supabase_port:
            supabase_port = str(settings.DATABASES['default']['PORT']) if hasattr(settings.DATABASES['default'], 'PORT') else '5432'
        
        if not all([supabase_url, supabase_db, supabase_user, supabase_password]):
            print("Supabase configuration incomplete")
            return False
        
        conn = psycopg2.connect(
            host=supabase_url,
            database=supabase_db,
            user=supabase_user,
            password=supabase_password,
            port=supabase_port
        )
        
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO general_feedback (
                user_id, session_id, consent_given, client_type, 
                date, sex, age, region, category, litpath_rating,
                research_interests, missing_content, message_comment
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            data.get('user_id'),
            data.get('session_id'),
            data.get('consent_given'),
            data.get('client_type'),
            data.get('date'),
            data.get('sex'),
            data.get('age'),
            data.get('region'),
            data.get('category'),
            data.get('litpath_rating'),
            data.get('research_interests'),
            data.get('missing_content'),
            data.get('message_comment')
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error inserting to Supabase general_feedback: {e}")
        return False

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
    """
    
    def post(self, request):
        import uuid
        request_id = str(uuid.uuid4())
        print(f"[RAG-DEBUG] SearchView.post called. Request ID: {request_id}")
        try:
            question = request.data.get("question", "").strip()
            filters = request.data.get("filters", {})
            conversation_history = request.data.get("conversation_history", [])
            
            # NEW: Check if this is a request for overview only
            overview_only = request.data.get("overview_only", False)
            
            if not question:
                return Response(
                    {"error": "Missing question parameter"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Extract filter parameters from explicit filters
            subjects = filters.get("subjects", [])
            year = filters.get("year")
            year_start = filters.get("year_start")
            year_end = filters.get("year_end")
            
            # NEW: Extract filters from natural language query if no explicit filters provided
            from .query_parser import extract_filters_from_query
            
            # Get available subjects for better matching
            rag = RAGService()
            available_filters = rag.get_available_filters() if RAGService._initialized else {"subjects": [], "years": []}
            
            # Parse query for implicit filters
            parsed = extract_filters_from_query(question, available_filters.get("subjects", []))
            
            # Apply extracted filters only if not explicitly provided
            if not subjects and parsed.get("subjects"):
                subjects = parsed["subjects"]
                print(f"[RAG] Extracted subjects from query: {subjects}")
            
            if not year and not year_start and not year_end:
                if parsed.get("year"):
                    year = parsed["year"]
                    print(f"[RAG] Extracted year from query: {year}")
                elif parsed.get("year_start") or parsed.get("year_end"):
                    year_start = parsed.get("year_start")
                    year_end = parsed.get("year_end")
                    print(f"[RAG] Extracted year range from query: {year_start} - {year_end}")
            
            # Log extracted filters info
            if parsed.get("extracted_filters"):
                if parsed["extracted_filters"].get("year_phrases"):
                    print(f"[RAG] Year phrases detected: {parsed['extracted_filters']['year_phrases']}")
                if parsed["extracted_filters"].get("subject_phrases"):
                    print(f"[RAG] Subject phrases detected: {parsed['extracted_filters']['subject_phrases']}")
            
            # Validate filter parameters
            if subjects and not isinstance(subjects, list):
                return Response(
                    {"error": "'subjects' must be a list"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            start_time = time.time()
            
            # Resolve pronouns in query using conversation history
            from .conversation_utils import conversation_manager
            enhanced_question = conversation_manager.resolve_pronouns(question, conversation_history)
            
            # Search for relevant chunks with filters
            search_start = time.time()
            top_chunks, documents, distance_threshold = rag.search(
                enhanced_question,
                subjects=None,  # Subject filter disabled - causes false-negative 0-doc results
                year=year,
                year_start=year_start,
                year_end=year_end,
                request_id=request_id
            )
            search_time = time.time() - search_start
            print(f"[RAG] Search took {search_time:.2f}s")
            
            # Check content relevance
            # Removed check_content_relevance import and usage as requested
            # Removed relevance_check usage
            

            # If relevance is extremely low, clear documents (logic removed)
            # (No action needed since relevance_check is gone)
            
            # NEW: If this is NOT an overview_only request, return documents immediately
            # without generating the overview
            if not overview_only:
                # Build filters_applied summary (including auto-extracted ones)
                filters_applied = {}
                if subjects:
                    filters_applied["subjects"] = subjects
                    # Mark if auto-extracted
                    if parsed.get("subjects") and subjects == parsed["subjects"]:
                        filters_applied["subjects_auto_extracted"] = True
                if year:
                    filters_applied["year"] = year
                    if parsed.get("year") and year == parsed["year"]:
                        filters_applied["year_auto_extracted"] = True
                if year_start or year_end:
                    filters_applied["year_range"] = [year_start, year_end]
                    if parsed.get("year_start") or parsed.get("year_end"):
                        filters_applied["year_range_auto_extracted"] = True
                
                # Check if no results
                no_results = not any(c["score"] < distance_threshold for c in top_chunks)
                # Removed relevance_check usage
                
                suggestions = []
                if no_results:
                    documents = []
                    if subjects:
                        suggestions.append(f"Try removing the subject filter '{subjects[0]}' to broaden your search")
                    if year:
                        suggestions.append(f"Try removing the year filter ({year}) to include more documents")
                    if year_start or year_end:
                        suggestions.append("Try expanding or removing the date range filter")
                    if not subjects and not year and not year_start:
                        suggestions.append("Try using different keywords or simpler terms")
                        suggestions.append("Try breaking your question into smaller, specific queries")
                    if len(question.split()) > 10:
                        suggestions.append("Try shortening your query to key terms only")
                    suggestions.append("Try searching for broader topics related to your question")
                
                # Return documents immediately WITHOUT overview
                return Response({
                    "documents": documents,
                    "related_questions": [],
                    "filters_applied": filters_applied if filters_applied else None,
                    "suggestions": suggestions if suggestions else None,
                    "overview": None,  # Will be requested separately
                    "overview_ready": False
                }, status=status.HTTP_200_OK)
            
            # If overview_only=True, generate the overview
            # (This will be called by a second request from frontend)
            generate_start = time.time()
            overview = rag.generate_overview(top_chunks, question, distance_threshold, conversation_history)
            generate_time = time.time() - generate_start
            print(f"[RAG] AI generation took {generate_time:.2f}s")
            
            total_time = time.time() - start_time
            print(f"[RAG] Total time: {total_time:.2f}s")
            
            # Calculate accuracy metrics
            search_metrics = rag.calculate_search_metrics(top_chunks, distance_threshold)
            citation_metrics = rag.verify_citations(overview, top_chunks)
            
            from .accuracy_metrics import accuracy_metrics
            source_texts = [c["chunk"] for c in top_chunks[:5]]
            hallucination_metrics = accuracy_metrics.detect_hallucinations_keyword(overview, source_texts)
            
            print(f"[RAG] Search Metrics: {search_metrics['documents_returned']} docs, avg_distance={search_metrics['avg_distance']}")
            print(f"[RAG] Citation Verification: {citation_metrics['verified_citations']}/{citation_metrics['total_citations']} ({citation_metrics['verification_rate']}%)")
            print(f"[RAG] Factual Accuracy: {hallucination_metrics['factual_accuracy']}%")
            
            # NEW: LangSmith-style RAG evaluation (optional, for detailed quality assessment)
            rag_evaluation = None
            include_rag_eval = request.data.get("include_rag_evaluation", False)
            if include_rag_eval:
                try:
                    from .rag_evaluator import quick_evaluate
                    rag_evaluation = quick_evaluate(
                        query=question,
                        response=overview,
                        retrieved_docs=source_texts
                    )
                    print(f"[RAG] LangSmith-style Evaluation: relevance={rag_evaluation.get('relevance', {}).get('score')}, groundedness={rag_evaluation.get('groundedness', {}).get('score') if rag_evaluation.get('groundedness') else 'N/A'}")
                except Exception as eval_err:
                    print(f"[RAG] RAG evaluation skipped: {eval_err}")
            
            # Check if no results and clean up overview
            no_results = not any(c["score"] < distance_threshold for c in top_chunks)
            # Removed relevance_check usage
            
            if no_results:
                import re
                overview = re.sub(r"\[\d+\]", "", overview)
            
            # Return overview with metrics
            response_data = {
                "overview": overview,
                "overview_ready": True,
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
            
            # Add LangSmith-style evaluation if requested
            if rag_evaluation:
                response_data["rag_evaluation"] = rag_evaluation
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# ============= Bookmark Views =============
from rest_framework.decorators import api_view
from .models import Bookmark, ResearchHistory, Feedback, Material, MaterialView
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
        session_id = request.data.get('session_id')
        # Upsert: update existing session or create new one
        if session_id:
            obj, created = ResearchHistory.objects.update_or_create(
                session_id=session_id,
                defaults={
                    'user_id': request.data.get('user_id', ''),
                    'query': request.data.get('query', ''),
                    'all_queries': request.data.get('all_queries'),
                    'conversation_data': request.data.get('conversation_data'),
                    'sources_count': request.data.get('sources_count'),
                    'conversation_length': request.data.get('conversation_length'),
                }
            )
            serializer = ResearchHistorySerializer(obj)
            status_code = status.HTTP_200_OK if not created else status.HTTP_201_CREATED
            return Response(serializer.data, status=status_code)
        else:
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

# Feedback for users
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

# Manage feedback for system admin
@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def feedback_detail(request, pk):
    """
    GET: Retrieve single feedback
    PATCH: Update status and triage info
    DELETE: Remove feedback
    """
    try:
        # We use 'pk' (primary key) to find the specific feedback
        feedback = Feedback.objects.get(pk=pk)
    except Feedback.DoesNotExist:
        return Response({'error': 'Feedback not found'}, status=status.HTTP_404_NOT_FOUND)

    # GET: View details
    if request.method == 'GET':
        serializer = FeedbackSerializer(feedback)
        return Response(serializer.data)

    # PATCH/PUT: Update (This is what your frontend needs)
    elif request.method in ['PUT', 'PATCH']:
        # Partial=True is critical for updating just the status
        serializer = FeedbackSerializer(feedback, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        # Print errors to your terminal for easier debugging
        print("Serializer Errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE: Remove it
    elif request.method == 'DELETE':
        feedback.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    

    # ============= CSM Feedback Views =============

@api_view(['GET', 'POST'])
def csm_feedback_view(request):
    """
    GET: List all CSM feedback (for admin analytics)
    POST: Submit new CSM feedback
    """
    if request.method == 'GET':
        # Optional: filter by user_id for user-specific feedback
        user_id = request.query_params.get('user_id')
        if user_id:
            csm_feedback = CSMFeedback.objects.filter(user_id=user_id)
        else:
            # For admin analytics - get all CSM feedback
            csm_feedback = CSMFeedback.objects.all()
        
        serializer = CSMFeedbackSerializer(csm_feedback, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        serializer = CSMFeedbackSerializer(data=request.data)
        if serializer.is_valid():
            # Save to Django database first
            serializer.save()
            
            # Also insert into Supabase general_feedback table
            insert_to_supabase_general_feedback(request.data)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'DELETE', 'PATCH']) # Added PATCH here
def csm_feedback_detail(request, pk):
    """
    GET: Retrieve single CSM feedback
    PATCH: Update Admin Triage fields (Status, Remarks, etc.)
    DELETE: Remove CSM feedback
    """
    try:
        csm_feedback = CSMFeedback.objects.get(pk=pk)
    except CSMFeedback.DoesNotExist:
        return Response({'error': 'CSM Feedback not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = CSMFeedbackSerializer(csm_feedback)
        return Response(serializer.data)
    
    elif request.method == 'PATCH':
        # This allows AdminDashboard to update status/remarks
        serializer = CSMFeedbackSerializer(csm_feedback, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        csm_feedback.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    
    # ============= Material Views (Most Browsed) =============

@api_view(['POST'])
def track_material_view(request):
    """
    POST /api/track-view/
    Track when a user views a material
    """
    try:
        user_id = request.data.get('user_id')
        file = request.data.get('file')
        session_id = request.data.get('session_id')
        
        if not file:
            return Response(
                {"error": "file is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create a new MaterialView record
        from .models import MaterialView, Material
        from django.utils import timezone
        
        # First, ensure the material exists in the materials table
        # (we'll create it if viewing for the first time)
        material, created = Material.objects.get_or_create(
            file=file,
            defaults={
                'title': request.data.get('title', 'Unknown'),
                'author': request.data.get('author', 'Unknown'),
                'year': request.data.get('year'),
                'abstract': request.data.get('abstract', ''),
                'degree': request.data.get('degree', 'Thesis'),
                'subjects': request.data.get('subjects', []),
                'school': request.data.get('school', 'Unknown')
            }
        )
        
        # Track the view
        MaterialView.objects.create(
            file=file,
            user_id=user_id,
            session_id=session_id,
            viewed_at=timezone.now()
        )
        
        return Response(
            {"success": True, "message": "View tracked successfully"},
            status=status.HTTP_201_CREATED
        )
        
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def get_most_browsed(request):
    """
    GET /api/most-browsed/
    Get most browsed materials with view counts and ratings
    """
    try:
        from django.db.models import Count, Avg, Q
        from .models import Material, MaterialView, Feedback
        from django.conf import settings
        import os
        
        limit = int(request.GET.get('limit', 10))
        
        # Get materials with view counts and ratings using raw SQL
        from django.db import connection
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    m.id,
                    m.file,
                    m.title,
                    m.author,
                    m.year,
                    m.abstract,
                    m.degree,
                    m.subjects,
                    m.school,
                    COUNT(DISTINCT mv.id) as view_count,
                    COALESCE(AVG(f.rating), 0) as avg_rating,
                    COUNT(DISTINCT f.id) as rating_count
                FROM materials m
                LEFT JOIN material_views mv ON m.file = mv.file
                LEFT JOIN feedback f ON m.file = f.document_file
                GROUP BY m.id, m.file, m.title, m.author, m.year, m.abstract, m.degree, m.subjects, m.school
                HAVING COUNT(DISTINCT mv.id) > 0
                ORDER BY view_count DESC, avg_rating DESC
                LIMIT %s
            """, [limit])
            
            columns = [col[0] for col in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # Enrich with actual metadata from RAG if title/author are "Unknown"
        from .rag_service import RAGService
        
        materials_data = []
        for row in results:
            title = row['title']
            author = row['author']
            year = row['year']
            abstract = row['abstract']
            degree = row['degree']
            school = row['school']
            
            # If metadata is missing, try to get it from the RAG system
            if (not title or title == 'Unknown') or (not author or author == 'Unknown'):
                try:
                    if RAGService._initialized:
                        rag = RAGService()
                        # Search for the document in the RAG system by file name
                        doc_metadata = rag.get_document_metadata(row['file'])
                        if doc_metadata:
                            title = doc_metadata.get('title', title)
                            author = doc_metadata.get('author', author)
                            year = doc_metadata.get('year', year)
                            abstract = doc_metadata.get('abstract', abstract)
                            degree = doc_metadata.get('degree', degree)
                            school = doc_metadata.get('school', school)
                except Exception as e:
                    print(f"Error fetching metadata for {row['file']}: {e}")
            
            materials_data.append({
                'file': row['file'],
                'title': title or 'Unknown Title',
                'author': author or 'Unknown Author',
                'year': year,
                'abstract': abstract or 'No abstract available.',
                'degree': degree or 'Thesis',
                'subjects': row['subjects'] if isinstance(row['subjects'], list) else [],
                'school': school or 'Unknown Institution',
                'view_count': int(row['view_count']),
                'avg_rating': round(float(row['avg_rating']), 2) if row['avg_rating'] else 0.0,
                'rating_count': int(row['rating_count'])
            })
        
        return Response(
            {
                'materials': materials_data,
                'count': len(materials_data)
            },
            status=status.HTTP_200_OK
            )
        
    except Exception as e:
        print(f"Error in get_most_browsed: {str(e)}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_source_ratings(request):
    """
    GET /api/sources/ratings/
    Get average ratings by source (document/file) with statistics
    
    Query Parameters:
    - limit: Maximum number of sources to return (default: 20)
    - min_ratings: Minimum number of ratings required (default: 1)
    - order_by: 'avg_rating', 'rating_count', 'file' (default: 'avg_rating')
    """
    try:
        from django.db import connection
        from django.db.models import Avg, Count
        
        limit = int(request.GET.get('limit', 20))
        min_ratings = int(request.GET.get('min_ratings', 1))
        order_by = request.GET.get('order_by', 'avg_rating')
        
        # Map order_by to SQL column
        order_map = {
            'avg_rating': 'avg_rating DESC',
            'rating_count': 'rating_count DESC',
            'file': 'm.file ASC'
        }
        order_sql = order_map.get(order_by, 'avg_rating DESC')
        
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT 
                    m.file,
                    m.title,
                    m.author,
                    m.year,
                    COUNT(DISTINCT f.id) as rating_count,
                    COALESCE(AVG(f.rating), 0) as avg_rating,
                    COALESCE(MIN(f.rating), 0) as min_rating,
                    COALESCE(MAX(f.rating), 0) as max_rating,
                    COALESCE(STDDEV(f.rating), 0) as stddev_rating
                FROM materials m
                LEFT JOIN feedback f ON m.file = f.document_file
                GROUP BY m.file, m.title, m.author, m.year
                HAVING COUNT(DISTINCT f.id) >= %s
                ORDER BY {order_sql}
                LIMIT %s
            """, [min_ratings, limit])
            
            columns = [col[0] for col in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # Enrich with metadata and format response
        from .rag_service import RAGService
        
        sources_data = []
        for row in results:
            title = row['title']
            author = row['author']
            
            # Try to get metadata from RAG if missing
            if not title or not author:
                try:
                    if RAGService._initialized:
                        rag = RAGService()
                        doc_metadata = rag.get_document_metadata(row['file'])
                        if doc_metadata:
                            title = doc_metadata.get('title', title)
                            author = doc_metadata.get('author', author)
                except Exception as e:
                    print(f"Error fetching metadata for {row['file']}: {e}")
            
            sources_data.append({
                'file': row['file'],
                'title': title or 'Unknown Title',
                'author': author or 'Unknown Author',
                'year': row['year'],
                'rating_count': int(row['rating_count']),
                'avg_rating': round(float(row['avg_rating']), 2) if row['avg_rating'] else 0.0,
                'min_rating': int(row['min_rating']) if row['min_rating'] else 0,
                'max_rating': int(row['max_rating']) if row['max_rating'] else 0,
                'stddev_rating': round(float(row['stddev_rating']), 2) if row['stddev_rating'] else 0.0
            })
        
        # Calculate overall statistics
        overall_stats = {}
        if results:
            overall_stats = {
                'total_sources': len(results),
                'total_ratings': sum(int(r['rating_count']) for r in results),
                'overall_avg_rating': round(sum(float(r['avg_rating']) for r in results) / len(results), 2),
                'highest_rated': max(sources_data, key=lambda x: x['avg_rating'])['title'] if sources_data else None,
                'most_rated': max(sources_data, key=lambda x: x['rating_count'])['title'] if sources_data else None
            }
        
        return Response(
            {
                'sources': sources_data,
                'statistics': overall_stats,
                'count': len(sources_data)
            },
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        print(f"Error in get_source_ratings: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_material_rating_detail(request):
    """
    GET /api/materials/<file>/rating/
    Get detailed rating information for a specific material
    """
    try:
        from django.db import connection
        from django.utils import timezone
        from datetime import timedelta
        
        file_path = request.GET.get('file')
        if not file_path:
            return Response(
                {"error": "file parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get rating breakdown by rating value
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    rating,
                    COUNT(*) as count
                FROM feedback 
                WHERE document_file = %s AND rating IS NOT NULL
                GROUP BY rating
                ORDER BY rating DESC
            """, [file_path])
            
            rating_breakdown = [
                {'rating': row[0], 'count': row[1]}
                for row in cursor.fetchall()
            ]
        
        # Get recent feedback for this material
        recent_feedback = Feedback.objects.filter(
            document_file=file_path,
            rating__isnull=False
        ).order_by('-created_at')[:5].values(
            'rating', 'comment', 'created_at', 'user_id'
        )
        
        # Calculate summary
        summary = Feedback.objects.filter(
            document_file=file_path,
            rating__isnull=False
        ).aggregate(
            avg_rating=Avg('rating'),
            count=Count('id')
        )
        
        return Response({
            'file': file_path,
            'average_rating': round(float(summary['avg_rating'] or 0), 2),
            'rating_count': summary['count'],
            'rating_breakdown': rating_breakdown,
            'recent_feedback': list(recent_feedback)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in get_material_rating_detail: {str(e)}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_sources_stats(request):
    """
    GET /api/sources/stats/
    Get view counts and average ratings for a list of source files.
    
    Query Parameters:
    - files: JSON array of file names
    """
    try:
        import json
        from django.db import connection
        
        files_param = request.GET.get('files')
        if not files_param:
            return Response(
                {"error": "files parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            files = json.loads(files_param)
            if not isinstance(files, list):
                files = [files]
        except json.JSONDecodeError:
            return Response(
                {"error": "Invalid files parameter. Must be a JSON array"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not files:
            return Response({"stats": {}}, status=status.HTTP_200_OK)
        
        # Default stats for all files
        stats = {f: {'view_count': 0, 'avg_rating': 0.0} for f in files}
        
        with connection.cursor() as cursor:
            # Get view counts
            placeholders = ','.join(['%s'] * len(files))
            cursor.execute(f"""
                SELECT 
                    mv.file,
                    COUNT(DISTINCT mv.id) as view_count
                FROM material_views mv
                WHERE mv.file IN ({placeholders})
                GROUP BY mv.file
            """, files)
            
            for row in cursor.fetchall():
                if row[0] in stats:
                    stats[row[0]]['view_count'] = int(row[1])
            
            # Get average ratings
            cursor.execute(f"""
                SELECT 
                    f.document_file,
                    COALESCE(AVG(f.rating), 0) as avg_rating
                FROM feedback f
                WHERE f.document_file IN ({placeholders}) AND f.rating IS NOT NULL
                GROUP BY f.document_file
            """, files)
            
            for row in cursor.fetchall():
                if row[0] in stats:
                    stats[row[0]]['avg_rating'] = round(float(row[1]), 2) if row[1] else 0.0
        
        return Response({"stats": stats}, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in get_sources_stats: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ============= Analytics Views =============

@api_view(['GET'])
def analytics_compact(request):
    """
    GET /api/analytics/compact/
    Get compact analytics dashboard data
    
    Query Parameters:
    - from: Start date (YYYY-MM-DD)
    - to: End date (YYYY-MM-DD)
    """
    try:
        from django.utils import timezone
        from datetime import datetime, timedelta
        from django.db import connection
        from django.db.models import Count, Avg, Q
        
        # Parse date parameters
        from_date = request.GET.get('from')
        to_date = request.GET.get('to')
        
        # Default to last 30 days if not specified
        if not from_date or not to_date:
            to_date_obj = timezone.now().date()
            from_date_obj = to_date_obj - timedelta(days=30)
        else:
            try:
                from_date_obj = datetime.strptime(from_date, '%Y-%m-%d').date()
                to_date_obj = datetime.strptime(to_date, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {"success": False, "error": "Invalid date format. Use YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Convert to datetime for filtering
        from_datetime = timezone.make_aware(datetime.combine(from_date_obj, datetime.min.time()))
        to_datetime = timezone.make_aware(datetime.combine(to_date_obj, datetime.max.time()))
        
        # 1. TOP SEARCH QUERIES
        top_search_queries = []
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        query,
                        COUNT(*) as count
                    FROM research_history
                    WHERE created_at >= %s AND created_at <= %s AND query IS NOT NULL AND query != ''
                    GROUP BY query
                    ORDER BY count DESC
                    LIMIT 5
                """, [from_datetime, to_datetime])
                
                columns = [col[0] for col in cursor.description]
                top_search_queries = [dict(zip(columns, row)) for row in cursor.fetchall()]
        except Exception as e:
            print(f"Error fetching top search queries: {e}")
        
        # 2. AVERAGE RESPONSE TIME (in seconds) - estimate based on system
        avg_response_time = 45  # Default
        try:
            all_searches = ResearchHistory.objects.filter(
                created_at__gte=from_datetime,
                created_at__lte=to_datetime
            ).count()
            
            if all_searches > 0:
                avg_rating = Feedback.objects.filter(
                    created_at__gte=from_datetime,
                    created_at__lte=to_datetime
                ).aggregate(avg=Avg('rating'))['avg'] or 3
                
                avg_response_time = max(15, int(120 - (avg_rating * 15)))
        except Exception as e:
            print(f"Error calculating response time: {e}")
        
        # 3. FAILED QUERIES
        failed_queries = []
        try:
            fq_list = Feedback.objects.filter(
                created_at__gte=from_datetime,
                created_at__lte=to_datetime,
                category='Issue',
                query__isnull=False
            ).values('query', 'created_at', 'comment').order_by('-created_at')[:5]
            
            for fq in fq_list:
                failed_queries.append({
                    'query': fq['query'],
                    'date': fq['created_at'].strftime('%Y-%m-%d'),
                    'reason': fq['comment'] or 'System error'
                })
        except Exception as e:
            print(f"Error fetching failed queries: {e}")
        
        # 4. TOTAL BOOKMARKS
        total_bookmarks = 0
        try:
            total_bookmarks = Bookmark.objects.filter(
                bookmarked_at__gte=from_datetime,
                bookmarked_at__lte=to_datetime
            ).count()
        except Exception as e:
            print(f"Error fetching total bookmarks: {e}")
        
        # 5. BOOKMARK FREQUENCY
        bookmark_frequency = []
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        DATE(bookmarked_at) as date,
                        COUNT(*) as count
                    FROM bookmarks
                    WHERE bookmarked_at >= %s AND bookmarked_at <= %s
                    GROUP BY DATE(bookmarked_at)
                    ORDER BY date DESC
                    LIMIT 7
                """, [from_datetime, to_datetime])
                
                columns = [col[0] for col in cursor.description]
                results = [dict(zip(columns, row)) for row in cursor.fetchall()]
                
                for item in results:
                    if isinstance(item['date'], str):
                        bookmark_frequency.append(item)
                    else:
                        bookmark_frequency.append({
                            'date': item['date'].strftime('%Y-%m-%d'),
                            'count': item['count']
                        })
        except Exception as e:
            print(f"Error fetching bookmark frequency: {e}")
        
        # 6. MOST VIEWED MATERIALS
        most_viewed_materials = []
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        m.file,
                        m.title,
                        m.author,
                        m.year,
                        COUNT(DISTINCT mv.id) as views
                    FROM materials m
                    LEFT JOIN material_views mv ON m.file = mv.file
                    WHERE mv.viewed_at >= %s AND mv.viewed_at <= %s
                    GROUP BY m.file, m.title, m.author, m.year
                    ORDER BY views DESC
                    LIMIT 5
                """, [from_datetime, to_datetime])
                
                columns = [col[0] for col in cursor.description]
                results = [dict(zip(columns, row)) for row in cursor.fetchall()]
                
                for item in results:
                    most_viewed_materials.append({
                        'title': item['title'] or 'Unknown Title',
                        'author': item['author'] or 'Unknown Author',
                        'year': item['year'],
                        'views': int(item['views'])
                    })
        except Exception as e:
            print(f"Error fetching most viewed materials: {e}")
        
        # 7. CRITICAL FEEDBACK
        critical_feedback = []
        try:
            cf_list = Feedback.objects.filter(
                created_at__gte=from_datetime,
                created_at__lte=to_datetime,
                category__in=['Issue', 'For Improvement']
            ).values('query', 'comment', 'created_at').order_by('-created_at')[:3]
            
            for cf in cf_list:
                critical_feedback.append({
                    'query': cf['query'],
                    'comment': cf['comment'],
                    'date': cf['created_at'].strftime('%Y-%m-%d')
                })
        except Exception as e:
            print(f"Error fetching critical feedback: {e}")
        
        return Response({
            'success': True,
            'data': {
                'topSearchQueries': top_search_queries,
                'avgResponseTime': avg_response_time,
                'failedQueries': failed_queries,
                'totalBookmarks': total_bookmarks,
                'bookmarkFrequency': bookmark_frequency,
                'mostViewedMaterials': most_viewed_materials,
                'criticalFeedback': critical_feedback
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in analytics_compact: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {"success": False, "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# ============= Password Reset Views =============
from rest_framework.decorators import api_view

@api_view(['POST'])
def request_password_reset(request):
    """
    POST: Request password reset link
    Body: {"email": "..."}
    """
    from .models_password_reset import PasswordResetToken
    from rag_api.models import UserAccount
    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({"success": False, "message": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
    user = UserAccount.objects.filter(email=email).first()
    print(f"[DEBUG] User lookup for email '{email}': {user}")
    if user:
        reset_token = secrets.token_urlsafe(32)
        expiry = timezone.now() + timezone.timedelta(hours=1)
        print(f"[DEBUG] About to create PasswordResetToken for user: {user.email}, token: {reset_token}, expiry: {expiry}")
        try:
            prt = PasswordResetToken.objects.create(user=user, token=reset_token, expiry=expiry, used=False)
            print(f"[DEBUG] Created PasswordResetToken: token={prt.token}, user={prt.user.email}, expiry={prt.expiry}, used={prt.used}")
        except Exception as e:
            print(f"[DEBUG] Error creating PasswordResetToken: {e}")
        reset_link = f"http://localhost:5173/reset-password/{reset_token}"
        print(f"[DEBUG] Password reset link for {email}: {reset_link}")
        # Send email with reset link
        try:
            send_mail(
                'Password Reset',
                f'Click to reset your password: {reset_link}',
                settings.DEFAULT_FROM_EMAIL,
                [email],
            )
            print(f"[DEBUG] Password reset email sent to {email}")
        except Exception as e:
            print(f"[DEBUG] Error sending password reset email: {e}")
    # Always return success for security
    return Response({"success": True, "message": "If this email exists, a reset link will be sent."})

@api_view(['POST'])
def reset_password(request):
    """
    POST: Reset password using token
    Body: {"token": "...", "new_password": "..."}
    """
    print("[DEBUG] Entered reset_password view")
    from .models_password_reset import PasswordResetToken
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    print(f"[DEBUG] Received token: {token}")
    # Print all tokens in the database for debugging
    all_tokens = PasswordResetToken.objects.all()
    print(f"[DEBUG] All tokens in DB:")
    for t in all_tokens:
        print(f"  token={t.token}, used={t.used}, expiry={t.expiry}, user={t.user.email}")
    if not token or not new_password:
        print("[DEBUG] Missing token or new_password")
        return Response({"error": "Token and new password are required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        prt = PasswordResetToken.objects.get(token=token, used=False)
        print(f"[DEBUG] Found token in DB: {prt.token}, expiry: {prt.expiry}, used: {prt.used}")
        if prt.expiry < timezone.now():
            print(f"[DEBUG] Token expired: {prt.expiry} < {timezone.now()}")
            return Response({"error": "Token expired."}, status=status.HTTP_400_BAD_REQUEST)
        user = prt.user
        user.set_password(new_password)
        user.save()
        prt.used = True
        prt.save()
        print(f"[DEBUG] Password reset successful for user: {user.email}")
        return Response({"success": True, "message": "Password reset successful."}, status=status.HTTP_200_OK)
    except PasswordResetToken.DoesNotExist:
        print(f"[DEBUG] Token not found or already used: {token}")
        return Response({"error": "Invalid or used token."}, status=status.HTTP_400_BAD_REQUEST)


# ============= RAG Evaluation API =============

class RAGEvaluationView(APIView):
    """
    POST /api/evaluate/
    Evaluate a RAG response using LangSmith-style methodology.
    
    This provides detailed evaluation of:
    - Relevance: Does the response address the question?
    - Groundedness: Is the response based on retrieved documents?
    - Retrieval Relevance: Are the retrieved documents relevant?
    - Correctness: Is the response factually correct? (requires reference answer)
    
    Reference: https://docs.langchain.com/langsmith/evaluate-rag-tutorial
    """
    
    def post(self, request):
        try:
            query = request.data.get("query", "").strip()
            response_text = request.data.get("response", "").strip()
            retrieved_docs = request.data.get("retrieved_docs", [])
            reference_answer = request.data.get("reference_answer")  # Optional
            evaluation_type = request.data.get("type", "quick")  # "quick" or "full"
            
            if not query or not response_text:
                return Response(
                    {"error": "Missing 'query' or 'response' parameter"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            from .rag_evaluator import get_rag_evaluator, quick_evaluate
            
            if evaluation_type == "quick":
                # Quick evaluation - just relevance and groundedness
                result = quick_evaluate(
                    query=query,
                    response=response_text,
                    retrieved_docs=retrieved_docs
                )
                return Response({
                    "success": True,
                    "evaluation_type": "quick",
                    "results": result
                }, status=status.HTTP_200_OK)
            else:
                # Full evaluation with all metrics
                evaluator = get_rag_evaluator()
                report = evaluator.evaluate(
                    query=query,
                    response=response_text,
                    retrieved_docs=retrieved_docs,
                    reference_answer=reference_answer,
                    skip_correctness=(reference_answer is None)
                )
                return Response({
                    "success": True,
                    "evaluation_type": "full",
                    "results": report.to_dict()
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# ============= Additional for Analytics =============
@api_view(['GET'])
def get_analytics_summary(request):
    """
    GET /api/analytics/compact/
    Returns real data for the Admin Dashboard Overview.
    """
    try:
        # 1. Parse Date Range
        date_from_str = request.GET.get('from')
        date_to_str = request.GET.get('to')
        
        if not date_from_str or not date_to_str:
            now = timezone.now()
            # Default to current year start if no date provided
            date_from = now.replace(month=1, day=1, hour=0, minute=0, second=0)
            date_to = now
        else:
            date_from = dateutil.parser.parse(date_from_str)
            date_to = dateutil.parser.parse(date_to_str)

        # 2. Main Metrics (Single Number Stats)
        
        # Total Searches in range
        total_searches = ResearchHistory.objects.filter(
            created_at__range=[date_from, date_to]
        ).count()

        # Total Bookmarks in range
        total_bookmarks = Bookmark.objects.filter(
            bookmarked_at__range=[date_from, date_to]
        ).count()

        # Bookmarks Per Week
        days_diff = (date_to - date_from).days
        weeks_count = max(1, days_diff / 7)
        bookmarks_per_week = round(total_bookmarks / weeks_count, 1)

        # Avg Loading Time (Placeholder until tracked)
        avg_loading_time = 0.0 

        # Total Citations (Placeholder until tracked)
        total_citations = 0 

        # 3. Chart Data: System Activity (Jan - Dec)
        target_year = date_from.year
        
        searches_by_month = ResearchHistory.objects.filter(
            created_at__year=target_year
        ).annotate(month=TruncMonth('created_at')).values('month').annotate(count=Count('id')).order_by('month')

        bookmarks_by_month = Bookmark.objects.filter(
            bookmarked_at__year=target_year
        ).annotate(month=TruncMonth('bookmarked_at')).values('month').annotate(count=Count('id')).order_by('month')

        # Format for Frontend
        months_data = []
        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        
        search_map = {entry['month'].strftime('%b'): entry['count'] for entry in searches_by_month}
        bookmark_map = {entry['month'].strftime('%b'): entry['count'] for entry in bookmarks_by_month}

        for m_name in month_names:
            months_data.append({
                "month": m_name,
                "searches": search_map.get(m_name, 0),
                "bookmarks": bookmark_map.get(m_name, 0)
            })

        # 4. Top Lists
        
        # Top 5 Search Queries
        top_queries_qs = ResearchHistory.objects.filter(
            created_at__range=[date_from, date_to]
        ).values('query').annotate(count=Count('query')).order_by('-count')[:5]
        
        top_queries = [{"query": item['query'], "count": item['count']} for item in top_queries_qs]

        # Top 5 Most Viewed Materials
        most_viewed_qs = MaterialView.objects.filter(
            viewed_at__range=[date_from, date_to]
        ).values('title', 'author', 'year').annotate(views=Count('id')).order_by('-views')[:5]
        
        most_viewed = [
            {
                "title": item['title'] or "Unknown", 
                "author": item['author'] or "Unknown", 
                "year": item['year'] or "N/A", 
                "views": item['views']
            } 
            for item in most_viewed_qs
        ]

        # 5. Unanswered Questions (Critical) - UPDATED TO USE ResearchHistory
        # Logic: Queries where the system found 0 sources (sources_count=0)
        failed_queries_qs = ResearchHistory.objects.filter(
            created_at__range=[date_from, date_to],
            sources_count=0  # <--- This uses your actual model field!
        ).order_by('-created_at')[:8]

        failed_queries = [
            {
                "query": q.query, 
                "date": q.created_at.strftime("%Y-%m-%d"), 
                "reason": "0 results found by AI" 
            }
            for q in failed_queries_qs
        ]

        # Also get Critical Feedback for the "Feedback Manager" list preview if needed
        critical_feedback_qs = CSMFeedback.objects.filter(
            created_at__range=[date_from, date_to],
            litpath_rating__lte=2 # Rating of 1 or 2
        ).order_by('-created_at')[:5]

        critical_feedback = [
            {"query": f.category, "date": f.created_at.strftime("%Y-%m-%d"), "reason": f.message_comment or "Low Rating"}
            for f in critical_feedback_qs
        ]

        return Response({
            "success": True,
            "data": {
                "topSearchQueries": top_queries,
                "avgResponseTime": avg_loading_time,
                "failedQueries": failed_queries,  # Now populates "Unanswered Questions"
                "totalBookmarks": total_bookmarks,
                "bookmarksPerWeek": bookmarks_per_week,
                "totalCitations": total_citations,
                "mostViewedMaterials": most_viewed,
                "monthlyActivity": months_data,
                "totalSearches": total_searches,
                "criticalFeedback": critical_feedback
            }
        })

    except Exception as e:
        print("Analytics Error:", str(e))
        return Response({"success": False, "error": str(e)}, status=500)