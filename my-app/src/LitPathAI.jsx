import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, ChevronDown, Star, RefreshCw, BookOpen, User, Calendar, MessageSquare, ArrowRight } from 'lucide-react';
import dostLogo from "./components/images/dost-logo.png";
import { Quote } from "lucide-react";
import { Bookmark } from "lucide-react";
import { Copy } from 'lucide-react';


const API_BASE_URL = 'http://localhost:8000/api';
const LitPathAI = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('All subjects');
    const [selectedDate, setSelectedDate] = useState('All dates');
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
    const [showDateDropdown, setShowDateDropdown] = useState(false);
    const [fromYear, setFromYear] = useState('');
    const [toYear, setToYear] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [selectedSource, setSelectedSource] = useState(null);
    const [showOverlay, setShowOverlay] = useState(false);
    const [rating, setRating] = useState(0);
    const [showRatingOverlay, setShowRatingOverlay] = useState(false);
    const [feedbackRelevant, setFeedbackRelevant] = useState(null);
    const [feedbackComment, setFeedbackComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [backendStatus, setBackendStatus] = useState(null);
    const [showCitationOverlay, setShowCitationOverlay] = useState(false);
    const [selectedCitationStyle, setSelectedCitationStyle] = useState("APA");
    const [generatedCitation, setGeneratedCitation] = useState("");
    const [showSavedItems, setShowSavedItems] = useState(false);
    const [bookmarkedCount, setBookmarkedCount] = useState(0);
    const [userId, setUserId] = useState(null);
    const navigate = useNavigate();
    const [conversationHistory, setConversationHistory] = useState([]);
    const [isFollowUpSearch, setIsFollowUpSearch] = useState(false);
    const [researchHistory, setResearchHistory] = useState([]);
    const [showResearchHistory, setShowResearchHistory] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [hasSearchedInSession, setHasSearchedInSession] = useState(false);


    const subjects = [
        "All subjects",
        "Agriculture",
        "Anthropology",
        "Applied Sciences",
        "Architecture",
        "Arts and Humanities",
        "Biological Sciences",
        "Business",
        "Chemistry",
        "Communication and Media",
        "Computer Science",
        "Cultural Studies",
        "Economics",
        "Education",
        "Engineering",
        "Environmental Science",
        "Geography",
        "History",
        "Law",
        "Library and Information Science",
        "Linguistics",
        "Literature",
        "Mathematics",
        "Medicine and Health Sciences",
        "Philosophy",
        "Physics",
        "Political Science",
        "Psychology",
        "Social Sciences",
        "Sociology",
    ];
    const dateOptions = ['All dates', 'Last year', 'Last 3 years', 'Custom date range'];
    
    // Refs for dropdowns to close when clicking outside
    const subjectDropdownRef = useRef(null);
    const dateDropdownRef = useRef(null);
    
    // Check backend health on component mount
    useEffect(() => {
        checkBackendHealth();
    }, []);
    
    // Auto-generate citation when overlay opens or style changes
    useEffect(() => {
        if (showCitationOverlay && selectedSource) {
            generateCitation(selectedCitationStyle);
        }
    }, [showCitationOverlay, selectedCitationStyle, selectedSource]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target)) {
                setShowSubjectDropdown(false);
            }
            if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target)) {
                setShowDateDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Load research history on mount
    useEffect(() => {
        loadResearchHistory();
    }, []);

    // Initialize user ID - check parent account first, then use anonymous
    useEffect(() => {
        // Check for parent website user ID (multiple methods)
        // Method 1: Check sessionStorage (set by parent website)
        let parentUserId = sessionStorage.getItem('parent_user_id');
        
        // Method 2: Check localStorage (set by parent website)
        if (!parentUserId) {
            parentUserId = localStorage.getItem('parent_user_id');
        }
        
        // Method 3: Check URL parameter (e.g., ?userId=123)
        if (!parentUserId) {
            const urlParams = new URLSearchParams(window.location.search);
            parentUserId = urlParams.get('userId');
        }
        
        // Method 4: Check cookie (if parent sets it)
        if (!parentUserId && document.cookie) {
            const cookieMatch = document.cookie.match(/parent_user_id=([^;]+)/);
            if (cookieMatch) {
                parentUserId = cookieMatch[1];
            }
        }
        
        let finalUserId;
        
        if (parentUserId) {
            // Use parent account user ID
            finalUserId = `parent_${parentUserId}`;
            console.log('Using parent account user ID:', finalUserId);
        } else {
            // Fall back to anonymous user ID
            finalUserId = localStorage.getItem('litpath_user_id');
            
            if (!finalUserId) {
                finalUserId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                localStorage.setItem('litpath_user_id', finalUserId);
            }
            console.log('Using anonymous user ID:', finalUserId);
        }
        
        setUserId(finalUserId);
        loadBookmarkCount();
    }, []);

    // Load bookmarks from Django when userId is set
    useEffect(() => {
        if (userId) {
            loadBookmarksFromDjango();
        }
    }, [userId]);

    // Load bookmark count from localStorage
    const loadBookmarkCount = () => {
        try {
            const bookmarks = JSON.parse(localStorage.getItem('litpath_bookmarks') || '[]');
            setBookmarkedCount(bookmarks.length);
        } catch (error) {
            console.error('Error loading bookmark count:', error);
            setBookmarkedCount(0);
        }
    };

    // Check if a document is bookmarked
    const isBookmarked = (documentFile) => {
        try {
            const bookmarks = JSON.parse(localStorage.getItem('litpath_bookmarks') || '[]');
            return bookmarks.some(bookmark => bookmark.file === documentFile);
        } catch (error) {
            console.error('Error checking bookmark:', error);
            return false;
        }
    };

    // Toggle bookmark (save/remove)
    const toggleBookmark = async (document) => {
        if (!document) return;

        try {
            // Get current bookmarks from localStorage
            let bookmarks = JSON.parse(localStorage.getItem('litpath_bookmarks') || '[]');
            
            const bookmarkIndex = bookmarks.findIndex(b => b.file === document.file);
            
            if (bookmarkIndex >= 0) {
                // Remove bookmark
                bookmarks.splice(bookmarkIndex, 1);
                localStorage.setItem('litpath_bookmarks', JSON.stringify(bookmarks));
                
                // Also remove from Django backend
                await removeFromDjango(document.file);
                
                alert('Bookmark removed!');
            } else {
                // Add bookmark
                const newBookmark = {
                    userId: userId,
                    title: document.title,
                    author: document.author,
                    year: document.year,
                    abstract: document.abstract,
                    file: document.file || document.fullTextPath,
                    degree: document.degree,
                    subjects: document.subjects,
                    school: document.school,
                    bookmarkedAt: new Date().toISOString()
                };
                
                bookmarks.push(newBookmark);
                localStorage.setItem('litpath_bookmarks', JSON.stringify(bookmarks));
                
                // Also save to Django backend
                await saveToDjango(newBookmark);
                
                alert('Bookmark saved!');
            }
            
            // Update count
            setBookmarkedCount(bookmarks.length);
            
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            alert('Failed to update bookmark. Please try again.');
        }
    };

    // Save bookmark to Django backend
    const saveToDjango = async (bookmark) => {
        try {
            const response = await fetch(`${API_BASE_URL}/bookmarks/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: bookmark.userId,
                    title: bookmark.title,
                    author: bookmark.author,
                    year: bookmark.year,
                    abstract: bookmark.abstract,
                    file: bookmark.file,
                    degree: bookmark.degree,
                    subjects: bookmark.subjects,
                    school: bookmark.school
                })
            });
            
            if (!response.ok) {
                console.error('Django save error:', await response.text());
                // Don't throw - localStorage save still succeeded
            } else {
                console.log('✅ Bookmark saved to Django backend');
            }
        } catch (error) {
            console.error('Error saving to Django:', error);
            // Don't throw - localStorage is the fallback
        }
    };

    // Remove bookmark from Django backend
    const removeFromDjango = async (file) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/bookmarks/delete-by-file/?user_id=${userId}&file=${encodeURIComponent(file)}`,
                { method: 'DELETE' }
            );
            
            if (!response.ok) {
                console.error('Django delete error:', await response.text());
            } else {
                console.log('✅ Bookmark removed from Django backend');
            }
        } catch (error) {
            console.error('Error removing from Django:', error);
        }
    };

    // Get all bookmarks
    const getBookmarks = () => {
        try {
            return JSON.parse(localStorage.getItem('litpath_bookmarks') || '[]');
        } catch (error) {
            console.error('Error loading bookmarks:', error);
            return [];
        }
    };

    // Load bookmarks from Django backend
    const loadBookmarksFromDjango = async () => {
        if (!userId) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/bookmarks/?user_id=${userId}`);
            
            if (!response.ok) {
                console.error('Django load error:', await response.text());
                return;
            }
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                // Convert Django format to local format
                const bookmarks = data.map(b => ({
                    userId: b.user_id,
                    title: b.title,
                    author: b.author,
                    year: b.year,
                    abstract: b.abstract,
                    file: b.file,
                    degree: b.degree,
                    subjects: b.subjects,
                    school: b.school,
                    bookmarkedAt: b.bookmarked_at
                }));
                
                localStorage.setItem('litpath_bookmarks', JSON.stringify(bookmarks));
                setBookmarkedCount(bookmarks.length);
                console.log('✅ Loaded bookmarks from Django backend');
            }
        } catch (error) {
            console.error('Error loading bookmarks from Django:', error);
        }
    };

    // Generate unique session ID
    const generateSessionId = () => {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    // Load research history from localStorage
    const loadResearchHistory = () => {
        try {
            const history = JSON.parse(localStorage.getItem('litpath_research_history') || '[]');
            setResearchHistory(history);
        } catch (error) {
            console.error('Error loading research history:', error);
            setResearchHistory([]);
        }
    };

    // Save current session to history (localStorage + Supabase)
    const saveCurrentSessionToHistory = async () => {
        if (!searchResults || !hasSearchedInSession || conversationHistory.length === 0) return;

        // Get all queries from conversation history
        const allQueries = conversationHistory.map(item => item.query);
        const totalSources = conversationHistory.reduce((sum, item) => sum + (item.sources?.length || 0), 0);

        const session = {
            id: currentSessionId || generateSessionId(),
            userId: userId,
            queries: allQueries, // Save all queries, not just the first one
            mainQuery: allQueries[0], // First query as main query for display
            followUpQueries: allQueries.slice(1), // Additional queries
            conversationHistory: conversationHistory, // Save the entire conversation with results
            timestamp: new Date().toISOString(),
            sourcesCount: totalSources,
            conversationLength: conversationHistory.length,
            subjects: selectedSubject !== 'All subjects' ? selectedSubject : null,
            dateFilter: selectedDate !== 'All dates' ? selectedDate : null,
        };

        try {
            // Save to localStorage
            const existingHistory = JSON.parse(localStorage.getItem('litpath_research_history') || '[]');
            const updatedHistory = [session, ...existingHistory].slice(0, 50); // Keep last 50 sessions
            localStorage.setItem('litpath_research_history', JSON.stringify(updatedHistory));
            setResearchHistory(updatedHistory);

            // Save to Django backend
            try {
                const response = await fetch(`${API_BASE_URL}/research-history/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        session_id: session.id,
                        user_id: session.userId,
                        query: session.mainQuery,
                        all_queries: session.queries,
                        conversation_data: session.conversationHistory,
                        sources_count: session.sourcesCount,
                        conversation_length: session.conversationLength,
                        subjects: session.subjects,
                        date_filter: session.dateFilter
                    })
                });

                if (!response.ok) {
                    console.error('Error saving to Django:', await response.text());
                } else {
                    console.log('✅ Research history saved to Django backend');
                }
            } catch (error) {
                console.error('Error saving research history to Django:', error);
            }
        } catch (error) {
            console.error('Error saving research history:', error);
        }
    };

    // Delete a session from history
    const deleteHistorySession = async (sessionId) => {
        try {
            // Remove from localStorage
            const updatedHistory = researchHistory.filter(s => s.id !== sessionId);
            localStorage.setItem('litpath_research_history', JSON.stringify(updatedHistory));
            setResearchHistory(updatedHistory);

            // Remove from Django backend
            try {
                const response = await fetch(`${API_BASE_URL}/research-history/${sessionId}/`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    console.error('Error deleting from Django:', await response.text());
                } else {
                    console.log('✅ History session deleted from Django backend');
                }
            } catch (error) {
                console.error('Error deleting from Django:', error);
            }
        } catch (error) {
            console.error('Error deleting history session:', error);
        }
    };

    // Load a previous session
    const loadHistorySession = (session) => {
        // Restore the entire conversation if available
        if (session.conversationHistory && session.conversationHistory.length > 0) {
            // Restore conversation history
            setConversationHistory(session.conversationHistory);
            // Set the last result as current search results
            setSearchResults(session.conversationHistory[session.conversationHistory.length - 1]);
            // Restore filters
            if (session.subjects) setSelectedSubject(session.subjects);
            if (session.dateFilter) setSelectedDate(session.dateFilter);
            // Mark as follow-up search since we have history
            setIsFollowUpSearch(true);
            setCurrentSessionId(session.id);
            setHasSearchedInSession(true);
        } else {
            // Fallback for old sessions without full conversation history - re-run the search
            const queryToLoad = session.mainQuery || session.query;
            setSearchQuery(queryToLoad);
            if (session.subjects) setSelectedSubject(session.subjects);
            if (session.dateFilter) setSelectedDate(session.dateFilter);
            handleSearch(queryToLoad);
        }
        setShowResearchHistory(false);
    };

    const checkBackendHealth = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            if (response.ok) {
                const data = await response.json();
                setBackendStatus(data);
            } else {
                setBackendStatus({ status: 'error', message: 'Backend not responding' });
            }
        } catch (err) {
            console.error("Backend health check failed:", err);
            setBackendStatus({ status: 'error', message: 'Cannot connect to backend' });
        }
    };
    const handleSearch = async (query = searchQuery, forceNew = false) => {
        if (!query.trim()) {
            setError("Please enter a research question.");
            return;
        }
        
        // Check if backend is available
        if (!backendStatus || backendStatus.status === 'error') {
            setError("Backend service is not available. Please check if the server is running.");
            return;
        }
        
        setLoading(true);
        setError(null);
        // Don't clear searchResults or selectedSource when it's a follow-up
        if (!isFollowUpSearch && !forceNew) {
            setSearchResults(null);
            setSelectedSource(null);
        }
        
        try {
            // Build filters object for backend
            const filters = {};

            // Add subject filter if not "All subjects"
            if (selectedSubject !== 'All subjects') {
                filters.subjects = [selectedSubject];
            }

            // Add date filters based on selection
            const currentYear = new Date().getFullYear();

            if (selectedDate === 'Last year') {
                filters.year = currentYear - 1;
            } else if (selectedDate === 'Last 3 years') {
                filters.year_start = currentYear - 2;
                filters.year_end = currentYear;
            } else if (selectedDate === 'Custom date range') {
                if (fromYear) filters.year_start = parseInt(fromYear);
                if (toYear) filters.year_end = parseInt(toYear);
            }

            // Add variation to query if forcing new results
            const searchQueryText = forceNew ? `${query} [v${Date.now()}]` : query;

            // Build request body
            const requestBody = {
                question: searchQueryText,
                filters: Object.keys(filters).length > 0 ? filters : undefined
            };
            
            // If forceNew is true, add parameters to force fresh results
            if (forceNew) {
                requestBody.regenerate = true;
                requestBody.timestamp = Date.now();
                requestBody.random_seed = Math.random();
            }

            console.log('Sending request:', requestBody); // Debug log

            const response = await fetch(`${API_BASE_URL}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const { overview, documents, related_questions } = data;
            
            // Format documents for frontend, mapping backend fields exactly
            const formattedSources = documents.map((doc, index) => ({
                id: Date.now() + index, // Use timestamp-based ID to ensure uniqueness
                title: doc.title || '[Unknown Title]',
                author: doc.author || '[Unknown Author]',
                year: doc.publication_year || '[Unknown Year]',
                abstract: doc.abstract || 'Abstract not available.',
                fullTextPath: doc.file || '',
                file: doc.file || '',
                degree: doc.degree || 'Thesis',
                subjects: doc.subjects || ['Research'],
                school: doc.university || '[Unknown University]',
            }));
            
            const newResult = {
                query: query, // Use original query without the version suffix
                overview: overview || 'No overview available.',
                sources: formattedSources,
                relatedQuestions: related_questions || [],
                
            };

            setConversationHistory(prev => [...prev, newResult]);
            setSearchResults(newResult);
            setIsFollowUpSearch(true);
            setSearchQuery('');
            
            // Mark that user has searched in this session
            setHasSearchedInSession(true);
            if (!currentSessionId) {
                setCurrentSessionId(generateSessionId());
            }

        } catch (err) {
            console.error("Search failed:", err);
            setError(`Search failed: ${err.message}`);
        } finally {
            setLoading(false);

        }
    };


    const handleExampleQuestionClick = (question) => {
        setSearchQuery(question);
        handleSearch(question, conversationHistory.length > 0);
    };

    const handleSourceClick = (source) => {
        setSelectedSource(source);
    };

    const handleMoreDetails = () => {
        setShowOverlay(true);
    };

    const generateCitation = (style) => {
        if (!selectedSource) return;
        
        const author = selectedSource.author || "Unknown Author";
        const year = selectedSource.year || "n.d.";
        const title = selectedSource.title || "Untitled";
        const school = selectedSource.school || "Unknown Institution";
        const degree = selectedSource.degree || "Thesis";
        let citation = "";
        switch (style) {
            case "APA":
                // APA 7th: Author, A. A. (Year). Title in sentence case [Doctoral dissertation, Institution].
                // Note: Title should be in sentence case in real implementation
                citation = `${author}. (${year}). ${title} [${degree}, ${school}].`;
                break;
            case "MLA":
                // MLA 9th: Author. Title. Degree Type, Institution, Year.
                citation = `${author}. ${title}. ${degree}, ${school}, ${year}.`;
                break;
            case "Chicago":
                // Chicago: Author. Year. "Title." Degree Type, Institution.
                citation = `${author}. ${year}. "${title}." ${degree}, ${school}.`;
                break;
            case "IEEE":
                // IEEE: A. Author, "Title," Degree abbreviation, Institution, Year.
                citation = `${author}, "${title}," ${degree}, ${school}, ${year}.`;
                break;
            default:
                citation = "";
        }
        setGeneratedCitation(citation);
    };
    const handleNewChat = async () => {
        // Save current session to history if user has searched
        if (hasSearchedInSession && searchResults) {
            await saveCurrentSessionToHistory();
        }
        
        // Reset all states
        setSearchQuery('');
        setSelectedSubject('All subjects');
        setSelectedDate('All dates');
        setFromYear('');
        setToYear('');
        setSearchResults(null);
        setConversationHistory([]);
        setIsFollowUpSearch(false);
        setSelectedSource(null);
        setShowOverlay(false);
        setRating(0);
        setLoading(false);
        setError(null);
        setHasSearchedInSession(false);
        setCurrentSessionId(generateSessionId());
    };
    const renderStars = (ratingValue, onRate) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                size={20}
                className={`cursor-pointer ${i < ratingValue ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                onClick={() => onRate && onRate(i + 1)}
            />
        ));
    };
    
    // Submit feedback
    const handleFeedbackSubmit = async () => {
        if (!userId) {
            alert('User ID not found. Please refresh the page.');
            return;
        }

        // Validate feedback
        if (feedbackRelevant === null) {
            alert('Please select Yes or No for relevance.');
            return;
        }

        console.log('=== Submitting Feedback ===');
        console.log('User ID:', userId);
        console.log('Feedback data:', {
            user_id: userId,
            query: searchQuery,
            rating: rating,
            relevant: feedbackRelevant,
            comment: feedbackComment
        });

        try {
            // Save to Django backend only
            const response = await fetch(`${API_BASE_URL}/feedback/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    query: searchQuery,
                    rating: rating,
                    relevant: feedbackRelevant,
                    comment: feedbackComment
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save feedback: ${await response.text()}`);
            }
            
            console.log('✅ Feedback saved to Django backend successfully!');

            // Reset and close
            setShowRatingOverlay(false);
            setFeedbackComment("");
            setFeedbackRelevant(null);
            setRating(0);
            
            alert('Thank you for your feedback!');
        } catch (err) {
            console.error('❌ Error submitting feedback:', err);
            alert('Failed to submit feedback. Please try again.');
        }
    };

    
    const handleProfileClick = () => {
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 bg-[#1F1F1F] text-white p-4 shadow-md z-50">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center space-x-4">
                        <img src={dostLogo} alt="DOST SciNet-Phil Logo" className="h-12 w-50" />
                        <div className="text-xl font-bold">DOST UNION CATALOG</div>
                        <div className="text-sm border-l border-white pl-4 ml-4">LitPath AI: <br /> Smart PathFinder of Theses and Dissertation</div>
                    </div>
                    <nav className="flex space-x-6">
                        <a href="http://scinet.dost.gov.ph/#/opac" target="_blank" rel="noopener noreferrer" className="hover:text-blue-200 transition-colors"> Online Public Access Catalog</a>
                        <Link to="/" className="font-bold text-blue-200">LitPath AI</Link>
                        <a href="#" className="flex items-center hover:text-blue-200 transition-colors">
                        </a>
                    </nav>
                </div>
            </div>

            
            {/* Backend Status Indicator */}
            {backendStatus && (
                <div className={`px-4 py-2 text-center text-sm ${backendStatus.status === 'healthy'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {backendStatus.status === 'healthy'
                        ? ` ✓  Backend connected - ${backendStatus.total_documents} documents, ${backendStatus.total_chunks} chunks indexed`
                        : ` ⚠  ${backendStatus.message}`
                    }
                </div>
            )}

            <div className="flex-1 flex justify-center items-start px-4 pt-40 pb-10">
                {/* Left Container (Sidebar) */}
                <div className="w-80 bg-white bg-opacity-95 rounded-xl shadow-2xl p-6 mr-6 flex-shrink-0 h-auto">
                    <div className="flex items-center space-x-2 mb-6 text-gray-800">
                        <BookOpen className="text-[#1E74BC]" size={24} />
                        <span className="font-bold text-xl">LitPath AI</span>
                    </div>
                    <button
                        onClick={handleNewChat}
                        className="w-full bg-[#1E74BC] text-white py-3 px-4 rounded-lg mb-4 hover:bg-[#155a8f] transition-colors font-semibold shadow-md"
                    >
                        Start a new chat
                    </button>
                    
                    {/* Saved Bookmarks Button */}
                    <button
                        onClick={() => setShowSavedItems(!showSavedItems)}
                        className="w-full bg-white border-2 border-[#1E74BC] text-[#1E74BC] py-3 px-4 rounded-lg mb-8 hover:bg-blue-50 transition-colors font-semibold shadow-md flex items-center justify-between"
                    >
                        <div className="flex items-center space-x-2">
                            <Bookmark size={18} />
                            <span>Saved Bookmarks</span>
                        </div>
                        {bookmarkedCount > 0 && (
                            <span className="bg-[#1E74BC] text-white text-xs font-bold px-2 py-1 rounded-full">
                                {bookmarkedCount}
                            </span>
                        )}
                    </button>
                    
                    {/* Research History Section */}
                    <div className="mb-8">
                        <h3 className="font-semibold text-gray-800 mb-3 text-lg">Research history</h3>
                        
                        {researchHistory.length === 0 ? (
                            <p className="text-sm text-gray-600 leading-relaxed">After you start a new chat, your research history will be saved and displayed here.</p>
                        ) : (
                            <>
                                <p className="text-xs text-gray-500 mb-2">Today</p>
                                <div className="space-y-2">
                                    {researchHistory.slice(0, 3).map((session, index) => (
                                        <div
                                            key={`${session.id}-${index}`}
                                            className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 hover:border-[#1E74BC] hover:shadow-sm transition-all cursor-pointer group"
                                            onClick={() => loadHistorySession(session)}
                                        >
                                            <p className="text-sm text-gray-700 flex-1 pr-2 truncate group-hover:text-[#1E74BC]">
                                                {session.mainQuery || session.query}
                                            </p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteHistorySession(session.id);
                                                }}
                                                className="text-gray-400 hover:text-red-500 flex-shrink-0 p-1"
                                                title="Delete"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 6h18"></path>
                                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                    {researchHistory.length > 3 && (
                                        <button
                                            onClick={() => setShowResearchHistory(true)}
                                            className="text-sm text-[#1E74BC] hover:underline mt-2"
                                        >
                                            View all {researchHistory.length} sessions
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                        
                        <br />
                        <p className="text-[10px] text-gray-500 mt-4">AI-generated content. Quality may vary.<br />Check for accuracy.</p>
                        <a href="#" className="text-blue-600 hover:underline block text-[10px]">About LitPath AI</a>
                        <a href="#" className="text-blue-600 hover:underline block text-[10px]">Privacy and Disclaimer</a>
                    </div>
                </div>
                {/* Right Container (Main Content) */}
                <div className="flex-1 max-w-5xl bg-white bg-opacity-95 rounded-xl shadow-2xl p-8 relative">
                    
                    {!searchResults && (
                        <div className="absolute top-6 right-6 z-10">
                            <button
                                onClick={handleProfileClick}
                                className="p-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors shadow-md"
                                title="Login/Profile"
                            >
                                <User size={24} />
                            </button>
                        </div>
                    )}

                    {!searchResults ? (
                        <div className="max-w-4xl mx-auto">
                            {/* Initial welcome screen - same as before */}
                            <div className="text-center mb-10">
                                <div className="flex items-center justify-center space-x-3 mb-4">
                                    <BookOpen className="text-[#1E74BC]" size={40} />
                                    <h1 className="text-4xl font-extrabold">
                                        <span className="text-[#1E74BC]">LitPath</span>{" "}
                                        <span className="text-[#b83a3a]">AI</span>
                                    </h1>
                                </div>
                                <p className="text-gray-700 text-lg">Discover easier and faster.</p>
                            </div>
                            
                            {/* Search Box and Filters */}
                            <div className="bg-white rounded-lg shadow-inner p-6 mb-8 border border-gray-200">
                                <div className="flex items-center space-x-3 mb-4 border border-gray-300 rounded-lg p-2 focus-within:border-blue-500 transition-colors">
                                    <Search className="text-gray-500" size={22} />
                                    <input
                                        type="text"
                                        placeholder="What is your research question?"
                                        className="flex-1 outline-none text-gray-800 text-lg py-1"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                    <button
                                        onClick={() => handleSearch()}
                                        className="bg-[#1E74BC] text-white p-3 rounded-lg hover:bg-[#155a8f] transition-colors"
                                        disabled={loading}
                                    >
                                        <ArrowRight size={20} />
                                    </button>
                                </div>
                                
                                <div className="flex flex-wrap items-center space-x-4">
                                    {/* Subject Filter - keep existing */}
                                    <div className="relative" ref={subjectDropdownRef}>
                                        <button
                                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors text-sm"
                                            onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
                                        >
                                            <span>{selectedSubject}</span>
                                            <ChevronDown size={16} />
                                        </button>

                                        {showSubjectDropdown && (
                                            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px] max-h-60 overflow-y-auto">
                                                {subjects.map((subject) => (
                                                    <button
                                                        key={subject}
                                                        className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-800 text-sm"
                                                        onClick={() => {
                                                            setSelectedSubject(subject);
                                                            setShowSubjectDropdown(false);
                                                        }}
                                                    >
                                                        {subject}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Date Filter - keep existing */}
                                    <div className="relative" ref={dateDropdownRef}>
                                        <button
                                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors text-sm"
                                            onClick={() => setShowDateDropdown(!showDateDropdown)}
                                        >
                                            <span>{selectedDate}</span>
                                            <ChevronDown size={16} />
                                        </button>
                                        {showDateDropdown && (
                                            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px]">
                                                {dateOptions.map((option) => (
                                                    <button
                                                        key={option}
                                                        className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-800 text-sm"
                                                        onClick={() => {
                                                            setSelectedDate(option);
                                                            setShowDateDropdown(false);
                                                        }}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Custom Date Range - keep existing */}
                                    {selectedDate === 'Custom date range' && (
                                        <div className="flex items-center space-x-2 ml-auto">
                                            <label className="text-sm text-gray-700">From:</label>
                                            <input
                                                type="number"
                                                placeholder="YYYY"
                                                className="px-3 py-2 w-24 border border-gray-300 rounded-lg text-sm"
                                                value={fromYear}
                                                onChange={(e) => setFromYear(e.target.value)}
                                            />
                                            <label className="text-sm text-gray-700">To:</label>
                                            <input
                                                type="number"
                                                placeholder="YYYY"
                                                className="px-3 py-2 w-24 border border-gray-300 rounded-lg text-sm"
                                                value={toYear}
                                                onChange={(e) => setToYear(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {loading && (
                                <div className="text-center text-[#1E74BC] text-lg mt-8">
                                    <div className="animate-spin inline-block w-8 h-8 border-4 border-[#1E74BC] border-t-transparent rounded-full mr-2"></div>
                                    Searching for insights...
                                </div>
                            )}
                            
                            {error && (
                                <div className="text-center text-red-600 text-lg mt-8 p-4 bg-red-50 rounded-lg border border-red-200">
                                    {error}
                                    {backendStatus?.status === 'error' && (
                                        <div className="mt-2 text-sm">
                                            Make sure your backend is running on {API_BASE_URL}
                                        </div>
                                    )}
                                </div>
                            )}


                            {/* Example Questions */}
                            <div className="mt-12">
                                <h3 className="text-xl font-semibold text-gray-800 mb-5">Example questions</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <button
                                        onClick={() => handleExampleQuestionClick("How does plastic pollution affect plant growth in farmland?")}
                                        className="flex items-center justify-between text-left p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 text-gray-800 hover:bg-blue-50"
                                    >
                                        <span className="flex-1 pr-4">
                                            How does plastic pollution affect plant growth in farmland?
                                        </span>
                                        <ArrowRight size={22} className="text-[#1E74BC] flex-shrink-0" />
                                    </button>
                                    <button
                                        onClick={() => handleExampleQuestionClick("Find research about sleep quality among teenagers")}
                                        className="flex items-center justify-between text-left p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 text-gray-800 hover:bg-blue-50"
                                    >
                                        <span className="flex-1 pr-4">
                                            Find research about sleep quality among teenagers
                                        </span>
                                        <ArrowRight size={22} className="text-[#1E74BC] flex-shrink-0" />
                                    </button>
                                    <button
                                        onClick={() => handleExampleQuestionClick("How does remote work impact employee productivity?")}
                                        className="flex items-center justify-between text-left p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 text-gray-800 hover:bg-blue-50"
                                    >
                                        <span className="flex-1 pr-4">
                                            How does remote work impact employee productivity?
                                        </span>
                                        <ArrowRight size={22} className="text-[#1E74BC] flex-shrink-0" />
                                    </button>
                                    <button
                                        onClick={() => handleExampleQuestionClick("Find recent research about how vitamin D deficiency impact overall health")}
                                        className="flex items-center justify-between text-left p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 text-gray-800 hover:bg-blue-50"
                                    >
                                        <span className="flex-1 pr-4">
                                            Find recent research about how vitamin D deficiency impact overall health
                                        </span>
                                        <ArrowRight size={22} className="text-[#1E74BC] flex-shrink-0" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-6xl mx-auto pb-20">
                            {/* Conversation History */}
                            <div className="space-y-8">
                                {conversationHistory.map((result, historyIndex) => (
                                    <div key={historyIndex} className="border-b border-gray-200 pb-4 last:border-b-0">
                                        {/* Question */}
                                        <div className="mb-6">
                                            <h2 className="text-2xl font-bold text-gray-900 mb-2">{result.query}</h2>
                                        </div>
                                        
                                        {/* Sources Carousel */}
                                        <div className="mb-6">
                                            <h3 className="text-xl font-semibold mb-4 flex items-center space-x-3 text-gray-800">
                                                <BookOpen size={24} className="text-[#1E74BC]" />
                                                <span>Sources</span>
                                            </h3>
                                            <div className="flex space-x-5 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-blue-100">
                                                {result.sources.map((source, index) => (
                                                    <div
                                                        key={source.id}
                                                        className={`flex-shrink-0 w-72 bg-white rounded-xl shadow-lg p-5 cursor-pointer border-2 ${selectedSource && selectedSource.id === source.id ? 'border-blue-500' : 'border-gray-100'} hover:shadow-xl transition-all duration-200 ease-in-out`}
                                                        onClick={() => handleSourceClick(source)}
                                                    >
                                                        <div className="flex items-center justify-center w-9 h-9 bg-[#1E74BC] text-white rounded-full mb-3 text-base font-bold">
                                                            {index + 1}
                                                        </div>
                                                        <h4 className="font-semibold text-lg text-gray-800 mb-2 line-clamp-3">{source.title}</h4>
                                                        <p className="text-sm text-gray-600">{source.author} • {source.year}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Selected Source Details for this conversation */}
                                        {selectedSource && conversationHistory[historyIndex].sources.some(s => s.id === selectedSource.id) && (
                                            <div className="bg-[#E8F3FB] border-l-4 border-[#1E74BC] rounded-r-lg p-6 mb-6 shadow-md">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="text-xl font-bold text-[#1E74BC]">{selectedSource.title}</h3>
                                                    <button
                                                        onClick={() => setSelectedSource(null)}
                                                        className="text-gray-500 hover:text-gray-700 transition-colors text-xl"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                                <p className="text-md text-gray-700 mb-4">{selectedSource.author} • {selectedSource.year}</p>
                                                <div className="mb-4">
                                                    <h4 className="font-semibold text-lg mb-2 text-gray-800">Abstract:</h4>
                                                    <p className="text-base text-gray-700 leading-relaxed">
                                                        {(() => {
                                                            const sentences = selectedSource.abstract?.split(/(?<=[.!?])\s+/) || [];
                                                            const first3 = sentences.slice(0, 3).join(' ');
                                                            return first3 + (sentences.length > 3 ? '...' : '');
                                                        })()}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={handleMoreDetails}
                                                    className="bg-gray-800 text-white px-5 py-2.5 rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                                                >
                                                    More details and request options
                                                </button>
                                            </div>
                                        )}

                                        {/* Overview */}
                                        <div className="mb-4">
                                            <h3 className="text-xl font-semibold mb-4 text-gray-800">Overview of Sources</h3>
                                            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                                                <div
                                                    className="text-gray-700 leading-relaxed whitespace-pre-line text-base text-justify"
                                                    dangerouslySetInnerHTML={{
                                                        __html: result.overview
                                                            ? result.overview.replace(/\[(\d+)\]/g, (_, num) => {
                                                                return ` <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1E74BC] text-white text-xs font-semibold">${num}</span>`;
                                                            })
                                                            : "<i>No overview available.</i>",
                                                    }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Rating and Actions - only show for the latest result */}
                                        {historyIndex === conversationHistory.length - 1 && !loading && (
                                            <div className="flex justify-end items-center mt-6 space-x-5">
                                                <div className="flex space-x-1">
                                                    {[1, 2, 3, 4, 5].map((num) => (
                                                        <button
                                                            key={num}
                                                            onClick={() => {
                                                                setRating(num);
                                                                setShowRatingOverlay(true);
                                                            }}
                                                            className="transition-transform hover:scale-110"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                fill={num <= rating ? "#FACC15" : "none"}
                                                                stroke="#FACC15"
                                                                strokeWidth="2"
                                                                viewBox="0 0 24 24"
                                                                className="w-7 h-7 cursor-pointer"
                                                            >
                                                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                                            </svg>
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSearchQuery(result.query);
                                                        handleSearch(result.query, true);
                                                    }}
                                                    disabled={loading}
                                                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg transition-colors hover:bg-gray-50 text-gray-700"
                                                >
                                                    <RefreshCw size={18} />
                                                    <span>Try again</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Loading indicator - show after the latest result */}
                                        {historyIndex === conversationHistory.length - 1 && loading && (
                                            <div className="text-center text-[#1E74BC] text-lg mt-8">
                                                <div className="animate-spin inline-block w-8 h-8 border-4 border-[#1E74BC] border-t-transparent rounded-full mr-2"></div>
                                                Searching for insights...
                                            </div>
                                        )}
                                        
                                        {/* Error message - show after the latest result */}
                                        {historyIndex === conversationHistory.length - 1 && error && (
                                            <div className="text-center text-red-600 text-lg mt-8 p-4 bg-red-50 rounded-lg border border-red-200">
                                                {error}
                                            </div>
                                        )}

                                        {/* Related Questions - only show for the latest result and not while loading */}
                                        {historyIndex === conversationHistory.length - 1 && !loading && result.relatedQuestions.length > 0 && (
                                            <div className="mt-8">
                                                <h3 className="text-xl font-semibold text-gray-800 mb-5">Related research questions</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    {result.relatedQuestions.map((question, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => handleExampleQuestionClick(question)}
                                                            className="flex items-center justify-between text-left p-5 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                        >
                                                            <span>{question}</span>
                                                            <ArrowRight size={20} className="text-[#1E74BC] flex-shrink-0" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Fixed Bottom Search Bar */}
                            <div className="fixed bottom-0 left-[534.5px] right-0 z-40">
                                <div className="max-w-5xl ml-8">
                                    <div className="bg-white rounded-lg shadow-md p-3 border border-gray-300">
                                        {/* Search Bar */}
                                        <div className="flex items-center space-x-2 mb-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:border-blue-500 transition-colors">
                                            <Search className="text-gray-500" size={18} />
                                            <input
                                                type="text"
                                                placeholder="Ask a follow-up question..."
                                                className="flex-1 outline-none text-gray-800 text-base"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery, true)}
                                                disabled={loading}
                                            />
                                            <button
                                                onClick={() => handleSearch(searchQuery, true)}
                                                className="bg-[#1E74BC] text-white p-2 rounded-lg hover:bg-[#155a8f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={loading}
                                            >
                                                <ArrowRight size={18} />
                                            </button>
                                        </div>
                                        
                                        {/* Filters Row */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* Subject Filter */}
                                            <div className="relative" ref={subjectDropdownRef}>
                                                <button
                                                    className="flex items-center space-x-1 px-3 py-1.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors text-xs"
                                                    onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
                                                >
                                                    <span>{selectedSubject}</span>
                                                    <ChevronDown size={14} />
                                                </button>

                                                {showSubjectDropdown && (
                                                    <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px] max-h-60 overflow-y-auto">
                                                        {subjects.map((subject) => (
                                                            <button
                                                                key={subject}
                                                                className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-800 text-sm"
                                                                onClick={() => {
                                                                    setSelectedSubject(subject);
                                                                    setShowSubjectDropdown(false);
                                                                }}
                                                            >
                                                                {subject}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Date Filter */}
                                            <div className="relative" ref={dateDropdownRef}>
                                                <button
                                                    className="flex items-center space-x-1 px-3 py-1.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors text-xs"
                                                    onClick={() => setShowDateDropdown(!showDateDropdown)}
                                                >
                                                    <span>{selectedDate}</span>
                                                    <ChevronDown size={14} />
                                                </button>
                                                {showDateDropdown && (
                                                    <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px]">
                                                        {dateOptions.map((option) => (
                                                            <button
                                                                key={option}
                                                                className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-800 text-sm"
                                                                onClick={() => {
                                                                    setSelectedDate(option);
                                                                    setShowDateDropdown(false);
                                                                }}
                                                            >
                                                                {option}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Custom Date Range */}
                                            {selectedDate === 'Custom date range' && (
                                                <div className="flex items-center space-x-2">
                                                    <label className="text-xs text-gray-700">From:</label>
                                                    <input
                                                        type="number"
                                                        placeholder="YYYY"
                                                        className="px-2 py-1 w-20 border border-gray-300 rounded-lg text-xs"
                                                        value={fromYear}
                                                        onChange={(e) => setFromYear(e.target.value)}
                                                    />
                                                    <label className="text-xs text-gray-700">To:</label>
                                                    <input
                                                        type="number"
                                                        placeholder="YYYY"
                                                        className="px-2 py-1 w-20 border border-gray-300 rounded-lg text-xs"
                                                        value={toYear}
                                                        onChange={(e) => setToYear(e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* end Fixed Bottom Search Bar */}
                        </div>
                    )}
                </div>
            </div>


            {/* Overlay for More Details */}
            {showOverlay && selectedSource && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
                    <div className="w-full sm:w-1/2 lg:w-50 xl:w-50 bg-white h-full overflow-y-auto shadow-2xl max-h-[90vh]">
                        <div className="text-white p-6 shadow-md" style={{ backgroundColor: '#1E74BC' }}>
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    onClick={() => setShowOverlay(false)}
                                    className="text-white hover:text-blue-200 text-sm flex items-center space-x-1"
                                >
                                    <ArrowRight size={18} className="transform rotate-180" />
                                    <span>Back</span>
                                </button>
                                <div className="flex space-x-4">
                                    <button 
                                        className="text-white hover:text-blue-200 transition-colors"
                                        onClick={() => toggleBookmark(selectedSource)}
                                        title={isBookmarked(selectedSource?.file || selectedSource?.fullTextPath) ? "Remove bookmark" : "Add bookmark"}
                                    >
                                        <Bookmark 
                                            size={20} 
                                            fill={isBookmarked(selectedSource?.file || selectedSource?.fullTextPath) ? "white" : "none"}
                                        />
                                    </button>
                                    <button className="text-white hover:text-blue-200"
                                        onClick={() => setShowCitationOverlay(true)}
                                    >
                                        <Quote size={20} />
                                    </button>
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold leading-tight">{selectedSource.title}</h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4 mb-8 text-gray-700">
                                <div className="flex items-center space-x-2">
                                    <span className="font-semibold text-gray-800">Degree:</span>
                                    <span>{selectedSource.degree}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <User size={16} className="text-gray-500" />
                                    <span className="font-semibold text-gray-800">Author:</span>
                                    <span>{selectedSource.author}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Calendar size={16} className="text-gray-500" />
                                    <span className="font-semibold text-gray-800">Publication Year:</span>
                                    <span>{selectedSource.year}</span>
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-800">Subject/s:</span>
                                    <div className="ml-5 mt-1 text-gray-600">
                                        {(() => {
                                            let subjects = [];
                                            if (Array.isArray(selectedSource.subjects)) {
                                                subjects = selectedSource.subjects;
                                            } else if (typeof selectedSource.subjects === 'string' && selectedSource.subjects.trim() !== '') {
                                                subjects = selectedSource.subjects.split(',').map(s => s.trim()).filter(Boolean);
                                            }
                                            return subjects.length > 0 ? (
                                                subjects.map((d, i) => <div key={i}>• {d}</div>)
                                            ) : (
                                                <div>N/A</div>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="font-semibold text-gray-800">University/College:</span>
                                    <span>{selectedSource.school}</span>
                                </div>
                            </div>
                            <div className="bg-[#1E74BC] text-white p-6 rounded-md shadow-md">
                                <div className="text-base leading-relaxed">
                                    <div className="font-semibold">STII Bldg., Gen. Santos Ave., Upper Bicutan,</div>
                                    <div>Taguig City, Metro Manila, 1631, Philippines</div>
                                    <div className="mt-3 font-medium">library@stii.dost.gov.ph</div>
                                    <div className="mt-2 font-medium">Full text available at DOST-STII Library from 8am - 5pm</div>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg mb-2 mt-6 text-gray-800">ABSTRACT</h3>
                                <p className="text-base text-gray-700 leading-relaxed text-justify">{selectedSource.abstract}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Citation Overlay */}
            {showCitationOverlay && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center">
                    <div className="bg-white w-10/12 md:w-2/3 lg:w-1/2 xl:w-[40%] rounded-lg shadow-2xl flex">
                        
                        {/* Type of citation */}
                        <div className="w-1/3 bg-gray-100 border-r p-6">
                            <h3 className="font-semibold mb-4 text-gray-800">Citation Style</h3>
                            {["APA", "MLA", "Chicago", "IEEE"].map((style) => (
                                <button
                                    key={style}
                                    className={`block w-full text-left px-4 py-2 rounded mb-2
                                        ${selectedCitationStyle === style ? "bg-[#1E74BC] text-white" : "hover:bg-[#d7e8f6]"}`}
                                    onClick={() => setSelectedCitationStyle(style)}
                                >
                                    {style === "APA" ? "APA (7th edition)" :
                                        style === "MLA" ? "MLA (9th edition)" : style}
                                </button>
                            ))}
                        </div>


                        {/* Generated citation */}
                        <div className="w-2/3 p-6 relative">
                            
                            {/* Close button */}
                            <button
                                onClick={() => setShowCitationOverlay(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl"
                            >
                                ×
                            </button>
                            <h3 className="font-semibold text-gray-800 mb-3">{selectedCitationStyle} Citation</h3>
                            <textarea
                                readOnly
                                value={generatedCitation}
                                className="w-full h-40 border p-3 rounded text-gray-700"
                            />
                            <button
                                className="mt-4 bg-[#1E74BC] text-white px-4 py-2 rounded hover:bg-[#185f99]"
                                onClick={() => navigator.clipboard.writeText(generatedCitation)}
                            >
                                Copy to Clipboard
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Rating Feedback Overlay */}
            {showRatingOverlay && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center">
                    <div className="bg-white w-11/12 md:w-1/2 lg:w-1/3 rounded-lg shadow-xl p-6 relative">
                        {/* Close button */}
                        <button
                            className="absolute top-3 right-3 text-gray-500 text-xl hover:text-gray-700"
                            onClick={() => setShowRatingOverlay(false)}>
                            ×
                        </button>
                        <h2 className="text-2xl font-semibold text-[#1E74BC] mb-4">
                            Thank you for your feedback
                        </h2>
                        <p className="text-gray-800 mb-3">Is this relevant to your question?</p>
                        
                        {/* Yes / No checkboxes */}
                        <div className="space-y-2 ml-1 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={feedbackRelevant === true}
                                    onChange={() => setFeedbackRelevant(true)}
                                    className="w-4 h-4"
                                />
                                <span>Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={feedbackRelevant === false}
                                    onChange={() => setFeedbackRelevant(false)}
                                    className="w-4 h-4"
                                />
                                <span>No</span>
                            </label>
                        </div>
                        <p className="text-gray-800 mb-2">
                            Please explain your answer above. (Optional)
                        </p>
                        <textarea
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                            className="w-full border rounded p-3 text-sm h-28"
                            placeholder="You may input your suggestions/improvements here"
                        />
                        
                        {/* Submit + Cancel */}
                        <div className="flex justify-end gap-3 mt-5">
                            <button
                                className="bg-[#1E74BC] text-white px-5 py-2 rounded hover:bg-[#185f99]"
                                onClick={handleFeedbackSubmit}>
                                Submit
                            </button>
                            <button
                                className="px-5 py-2 rounded bg-gray-300 hover:bg-gray-400"
                                onClick={() => setShowRatingOverlay(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bookmarks Overlay */}
            {showSavedItems && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
                    <div className="bg-white w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 h-[80vh] rounded-lg shadow-2xl flex flex-col">
                        {/* Header */}
                        <div className="bg-[#1E74BC] text-white p-6 rounded-t-lg flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <Bookmark size={24} />
                                <h2 className="text-2xl font-bold">Saved Bookmarks</h2>
                                <span className="bg-white text-[#1E74BC] text-sm font-bold px-3 py-1 rounded-full">
                                    {bookmarkedCount}
                                </span>
                            </div>
                            <button
                                onClick={() => setShowSavedItems(false)}
                                className="text-white hover:text-gray-200 text-3xl"
                            >
                                ×
                            </button>
                        </div>

                        {/* Bookmarks List */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {bookmarkedCount === 0 ? (
                                <div className="text-center py-12">
                                    <Bookmark size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500 text-lg">No bookmarks saved yet.</p>
                                    <p className="text-gray-400 text-sm mt-2">
                                        Start exploring research and click the bookmark icon to save papers for later!
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {getBookmarks().map((bookmark, index) => (
                                        <div
                                            key={index}
                                            className="bg-gray-50 border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="font-semibold text-lg text-gray-800 flex-1 pr-4">
                                                    {bookmark.title}
                                                </h3>
                                                <button
                                                    onClick={() => toggleBookmark(bookmark)}
                                                    className="text-red-500 hover:text-red-700 flex-shrink-0"
                                                    title="Remove bookmark"
                                                >
                                                    <Bookmark size={20} fill="currentColor" />
                                                </button>
                                            </div>
                                            <p className="text-gray-600 text-sm mb-2">
                                                <User size={14} className="inline mr-1" />
                                                {bookmark.author} • {bookmark.year}
                                            </p>
                                            <p className="text-gray-700 text-sm mb-3 line-clamp-2">
                                                {bookmark.abstract}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500">
                                                    {bookmark.degree} • {bookmark.school}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setSelectedSource(bookmark);
                                                        setShowSavedItems(false);
                                                        setShowOverlay(true);
                                                    }}
                                                    className="text-[#1E74BC] hover:text-[#155a8f] text-sm font-medium"
                                                >
                                                    View Details →
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t p-4 bg-gray-50 rounded-b-lg">
                            <p className="text-xs text-gray-500 text-center">
                                Bookmarks are saved locally on this device. {userId && `User ID: ${userId.substring(0, 15)}...`}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Research History Overlay */}
            {showResearchHistory && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b">
                            <div className="flex items-center space-x-3">
                                <MessageSquare className="text-[#1E74BC]" size={28} />
                                <h2 className="text-2xl font-bold text-gray-800">Research History</h2>
                            </div>
                            <button
                                onClick={() => setShowResearchHistory(false)}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {researchHistory.length === 0 ? (
                                <div className="text-center py-12">
                                    <MessageSquare size={64} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500 text-lg">No research history yet</p>
                                    <p className="text-gray-400 text-sm mt-2">
                                        Your search sessions will appear here after you start a new chat
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {researchHistory.map((session) => (
                                        <div
                                            key={session.id}
                                            className="bg-gray-50 rounded-lg p-5 border border-gray-200 hover:border-[#1E74BC] hover:shadow-md transition-all cursor-pointer"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 pr-4">
                                                    <h3 
                                                        className="font-semibold text-gray-800 text-lg mb-2 hover:text-[#1E74BC]"
                                                        onClick={() => loadHistorySession(session)}
                                                    >
                                                        {session.mainQuery || session.query}
                                                    </h3>
                                                    
                                                    {/* Display follow-up queries if they exist */}
                                                    {session.followUpQueries && session.followUpQueries.length > 0 && (
                                                        <div className="mb-3 pl-4 border-l-2 border-gray-300">
                                                            <p className="text-xs text-gray-500 mb-1">Follow-up questions:</p>
                                                            {session.followUpQueries.map((query, idx) => (
                                                                <p key={idx} className="text-sm text-gray-600 mb-1">
                                                                    {idx + 1}. {query}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                                                        <span className="flex items-center">
                                                            <Calendar size={14} className="mr-1" />
                                                            {new Date(session.timestamp).toLocaleDateString()} at {new Date(session.timestamp).toLocaleTimeString()}
                                                        </span>
                                                        <span>•</span>
                                                        <span>{session.sourcesCount} sources</span>
                                                        {session.conversationLength && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="text-green-600">{session.conversationLength} {session.conversationLength === 1 ? 'query' : 'queries'}</span>
                                                            </>
                                                        )}
                                                        {session.subjects && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="text-[#1E74BC]">{session.subjects}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteHistorySession(session.id);
                                                    }}
                                                    className="text-red-500 hover:text-red-700 flex-shrink-0 p-2"
                                                    title="Delete session"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M3 6h18"></path>
                                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                                    </svg>
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => loadHistorySession(session)}
                                                className="text-[#1E74BC] hover:text-[#155a8f] text-sm font-medium flex items-center"
                                            >
                                                Load this session
                                                <ArrowRight size={16} className="ml-1" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t p-4 bg-gray-50 rounded-b-xl">
                            <p className="text-xs text-gray-500 text-center">
                                Research history is saved locally and in cloud storage. {researchHistory.length} {researchHistory.length === 1 ? 'session' : 'sessions'} saved.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default LitPathAI;