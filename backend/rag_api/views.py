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
            
            rag = RAGService()
            start_time = time.time()
            
            # Resolve pronouns in query using conversation history
            from .conversation_utils import conversation_manager
            enhanced_question = conversation_manager.resolve_pronouns(question, conversation_history)
            
            # Search for relevant chunks with filters
            search_start = time.time()
            top_chunks, documents, distance_threshold = rag.search(
                enhanced_question,
                subjects=subjects if subjects else None,
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
                # Build filters_applied summary
                filters_applied = {}
                if subjects:
                    filters_applied["subjects"] = subjects
                if year:
                    filters_applied["year"] = year
                if year_start or year_end:
                    filters_applied["year_range"] = [year_start, year_end]
                
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
                
                # Add average ratings to documents
                document_files = [doc.get('file') for doc in documents if doc.get('file')]
                ratings_map = get_document_ratings(document_files)
                
                for doc in documents:
                    file_name = doc.get('file', '')
                    rating_info = ratings_map.get(file_name, {})
                    doc['avg_rating'] = rating_info.get('avg_rating')
                    doc['rating_count'] = rating_info.get('count', 0)
                
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
            
            # Check if no results and clean up overview
            no_results = not any(c["score"] < distance_threshold for c in top_chunks)
            # Removed relevance_check usage
            
            if no_results:
                import re
                overview = re.sub(r"\[\d+\]", "", overview)
            
            # Return overview with metrics
            return Response({
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
            }, status=status.HTTP_200_OK)
            
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


# ============= Document Ratings Helper =============

def get_document_ratings(document_files=None):
    """
    Get average rating for each document file.
    
    Args:
        document_files: Optional list of specific document files to get ratings for.
                       If None, returns all document ratings.
    
    Returns:
        Dict mapping document file paths to their average rating (and count).
        Format: {
            'filename.txt': {'avg_rating': 4.5, 'count': 10},
            ...
        }
    """
    from django.db.models import Avg, Count
    from .models import Feedback
    
    try:
        # Filter for ratings only (where rating is not null)
        rating_query = Feedback.objects.filter(rating__isnull=False)
        
        if document_files:
            rating_query = rating_query.filter(document_file__in=document_files)
        
        # Group by document_file and calculate average
        ratings = rating_query.values('document_file').annotate(
            avg_rating=Avg('rating'),
            count=Count('id')
        )
        
        # Convert to dict for fast lookup
        result = {}
        for item in ratings:
            file_path = item['document_file']
            if file_path:
                result[file_path] = {
                    'avg_rating': round(item['avg_rating'], 1) if item['avg_rating'] else None,
                    'count': item['count']
                }
        
        return result
    except Exception as e:
        print(f"Error getting document ratings: {e}")
        return {}


# ============= Document Ratings Endpoint =============

@api_view(['GET'])
def document_ratings_view(request):
    """
    GET /api/document-ratings/
    Get average rating for specific documents or all documents.
    
    Query Parameters:
        - file: (optional) Comma-separated list of document files to get ratings for
                If not provided, returns ratings for all documents with ratings
    
    Response:
    {
        "ratings": {
            "filename1.txt": {"avg_rating": 4.5, "count": 10},
            "filename2.txt": {"avg_rating": 3.8, "count": 5}
        }
    }
    """
    try:
        # Get optional file parameter (comma-separated)
        files_param = request.query_params.get('file')
        
        if files_param:
            # Parse comma-separated file list
            document_files = [f.strip() for f in files_param.split(',') if f.strip()]
        else:
            document_files = None
        
        ratings = get_document_ratings(document_files)
        
        return Response({
            "ratings": ratings
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
                    COALESCE(AVG(f.rating), 0) as avg_rating
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
                'avg_rating': float(row['avg_rating']) if row['avg_rating'] else 0.0
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