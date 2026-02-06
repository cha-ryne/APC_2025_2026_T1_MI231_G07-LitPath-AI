import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Search, ChevronDown, Star, RefreshCw, BookOpen, User, Calendar, MessageSquare, ArrowRight, LogOut, Settings, Eye, EyeOff, Trash2, Key, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, ShieldCheck, Menu
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import dostLogo from "./components/images/dost-logo.png";
import { Quote } from "lucide-react";
import { Bookmark } from "lucide-react";
import { Copy } from 'lucide-react';


const API_BASE_URL = 'http://localhost:8000/api';
const LitPathAI = () => {
    // Auth context
    const { user, isGuest, logout, startNewChat: authStartNewChat, getUserId, isStaff, changePassword, setUser } = useAuth();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [selectedSource, setSelectedSource] = useState(null);
    const [showOverlay, setShowOverlay] = useState(false);
    const [userFeedback, setUserFeedback] = useState(null); // null, 'thumbs_up', or 'thumbs_down'
    const [showFeedbackOverlay, setShowFeedbackOverlay] = useState(false);
    const [feedbackComment, setFeedbackComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [backendStatus, setBackendStatus] = useState(null);
    const [showCitationOverlay, setShowCitationOverlay] = useState(false);
    const [selectedCitationStyle, setSelectedCitationStyle] = useState("APA");
    const [generatedCitation, setGeneratedCitation] = useState("");
    const [showSavedItems, setShowSavedItems] = useState(false);
    const [bookmarkedCount, setBookmarkedCount] = useState(0);
    const [bookmarks, setBookmarks] = useState([]); // Store bookmarks in state (not localStorage for authenticated users)
    const [showUserMenu, setShowUserMenu] = useState(false);
    // Force re-render of user menu when user changes (for real-time update)
    const [userMenuKey, setUserMenuKey] = useState(0);
    useEffect(() => {
        setUserMenuKey(k => k + 1);
    }, [user?.full_name, user?.username]);
    const navigate = useNavigate();
    const [conversationHistory, setConversationHistory] = useState([]);
    const [isFollowUpSearch, setIsFollowUpSearch] = useState(false);
    const [researchHistory, setResearchHistory] = useState([]);
    const [showResearchHistory, setShowResearchHistory] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [hasSearchedInSession, setHasSearchedInSession] = useState(false);
    const [isLoadedFromHistory, setIsLoadedFromHistory] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [showAccountSettings, setShowAccountSettings] = useState(false);
    const [settingsTab, setSettingsTab] = useState('profile');
    const [editFullName, setEditFullName] = useState(user?.full_name || '');
    const [editUsername, setEditUsername] = useState(user?.username || '');

    // Keep edit fields in sync with user object
    useEffect(() => {
        setEditFullName(user?.full_name || '');
        setEditUsername(user?.username || '');
    }, [user]);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showDeletePassword, setShowDeletePassword] = useState(false);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const [mostBrowsed, setMostBrowsed] = useState([]);
    const [loadingMostBrowsed, setLoadingMostBrowsed] = useState(true);
    const [browsedCurrentSlide, setBrowsedCurrentSlide] = useState(0);
    
    // Get userId from auth context
    const userId = getUserId();
    const chatContainerRef = useRef(null);

    // Show toast notification
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };




    // Track material view
    const trackMaterialView = async (material) => {
        try {
            await fetch(`${API_BASE_URL}/track-view/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file: material.file || material.fullTextPath,
                    user_id: userId,
                    session_id: currentSessionId
                })
            });
        } catch (error) {
            console.error('Error tracking view:', error);
        }
    };

    // Fetch most browsed materials
    const fetchMostBrowsed = async () => {
        try {
            setLoadingMostBrowsed(true);
            const response = await fetch(`${API_BASE_URL}/most-browsed/?limit=5`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch most browsed materials');
            }
            
            const data = await response.json();
            setMostBrowsed(data.materials || []);
        } catch (error) {
            console.error('Error fetching most browsed:', error);
            setMostBrowsed([]);
        } finally {
            setLoadingMostBrowsed(false);
        }
    };

    // Load most browsed materials on component mount
    useEffect(() => {
        fetchMostBrowsed();
    }, []);

    // Scroll to bottom on new message
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [conversationHistory, searchResults, loading]);

    // Add this ref for source highlighting in overview
    const handleSourceRef = useRef({});

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


    // Load research history on mount and when user changes
    useEffect(() => {
        if (userId) {
            if (isGuest) {
                // Guests: Load from localStorage only
                loadResearchHistoryFromLocalStorage();
            } else {
                // Authenticated users: Load from Django backend
                loadResearchHistoryFromDjango();
            }
        }
    }, [userId, isGuest]);

    // Load bookmarks when userId is available from auth context
    useEffect(() => {
        if (userId) {
            // Always load from backend for both guests and authenticated users
            loadBookmarksFromDjango();
            // Optionally, also load from localStorage for guests for UX
            if (isGuest) {
                loadBookmarksFromLocalStorage();
            }
        }
    }, [userId, isGuest]);

    // Load bookmarks from localStorage (for guests only)
    const loadBookmarksFromLocalStorage = () => {
        try {
            const storedBookmarks = JSON.parse(localStorage.getItem('litpath_bookmarks') || '[]');
            setBookmarks(storedBookmarks);
            setBookmarkedCount(storedBookmarks.length);
        } catch (error) {
            console.error('Error loading bookmarks from localStorage:', error);
            setBookmarks([]);
            setBookmarkedCount(0);
        }
    };

    // Check if a document is bookmarked (uses state, not localStorage)
    const isBookmarked = (documentFile) => {
        return bookmarks.some(bookmark => bookmark.file === documentFile);
    };

    // Toggle bookmark (save/remove)
    const toggleBookmark = async (document) => {
        if (!document) return;

        try {
            const documentFile = document.file || document.fullTextPath;
            let currentBookmarks = [...bookmarks];
            const bookmarkIndex = currentBookmarks.findIndex(b => b.file === documentFile);
            const newBookmark = {
                userId: userId,
                title: document.title,
                author: document.author,
                year: document.year,
                abstract: document.abstract,
                file: documentFile,
                degree: document.degree,
                subjects: document.subjects,
                school: document.school,
                bookmarkedAt: new Date().toISOString()
            };

            if (bookmarkIndex >= 0) {
                // Remove bookmark (from backend)
                await removeFromDjango(documentFile);
                showToast('Bookmark removed!', 'info');
                // Remove from localStorage for guests (optional, for UX)
                if (isGuest) {
                    currentBookmarks.splice(bookmarkIndex, 1);
                    setBookmarks(currentBookmarks);
                    setBookmarkedCount(currentBookmarks.length);
                    localStorage.setItem('litpath_bookmarks', JSON.stringify(currentBookmarks));
                }
            } else {
                // Add bookmark (to backend)
                await saveToDjango(newBookmark);
                showToast('Bookmark saved!', 'success');
                // Add to localStorage for guests (optional, for UX)
                if (isGuest) {
                    currentBookmarks.push(newBookmark);
                    setBookmarks(currentBookmarks);
                    setBookmarkedCount(currentBookmarks.length);
                    localStorage.setItem('litpath_bookmarks', JSON.stringify(currentBookmarks));
                }
            }
            // Always refresh bookmarks from backend
            await loadBookmarksFromDjango();
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            showToast('Failed to update bookmark. Please try again.', 'error');
        }
    };

    // Save bookmark to Django backend
    const saveToDjango = async (bookmark) => {
        try {
            const payload = {
                user_id: bookmark.userId,
                title: bookmark.title || 'Untitled',
                author: bookmark.author || '',
                year: bookmark.year || null,
                abstract: bookmark.abstract || '',
                file: bookmark.file,
                degree: bookmark.degree || '',
                subjects: typeof bookmark.subjects === 'string' ? bookmark.subjects : (Array.isArray(bookmark.subjects) ? bookmark.subjects.join(', ') : ''),
                school: bookmark.school || ''
            };

            const response = await fetch(`${API_BASE_URL}/bookmarks/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Django save error:', errorText);
                throw new Error(`Failed to save bookmark: ${errorText}`);
            } else {
                console.log('✅ Bookmark saved to Django backend');
            }
        } catch (error) {
            console.error('Error saving to Django:', error);
            throw error;
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

    // Get all bookmarks (from state - works for both guests and authenticated users)
    const getBookmarks = () => {
        return bookmarks;
    };

    // Load bookmarks from Django backend (for authenticated users - NO localStorage)
    const loadBookmarksFromDjango = async () => {
        if (!userId) return;
        try {
            const response = await fetch(`${API_BASE_URL}/bookmarks/?user_id=${userId}`);
            if (!response.ok) {
                console.error('Django load error:', await response.text());
                return;
            }
            const data = await response.json();
            // Convert Django format to local format and store in state
            const loadedBookmarks = (data && data.length > 0) ? data.map(b => ({
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
            })) : [];
            setBookmarks(loadedBookmarks);
            setBookmarkedCount(loadedBookmarks.length);
            console.log('✅ Loaded bookmarks from Django backend');
        } catch (error) {
            console.error('Error loading bookmarks from Django:', error);
        }
    };

    // Generate unique session ID
    const generateSessionId = () => {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    // Load research history from localStorage (for guests)
    const loadResearchHistoryFromLocalStorage = () => {
        try {
            const history = JSON.parse(localStorage.getItem('litpath_research_history') || '[]');
            setResearchHistory(history);
        } catch (error) {
            console.error('Error loading research history:', error);
            setResearchHistory([]);
        }
    };

    // Load research history from Django backend (for authenticated users)
    const loadResearchHistoryFromDjango = async () => {
        if (!userId || isGuest) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/research-history/?user_id=${userId}`);
            
            if (!response.ok) {
                console.error('Django research history load error:', await response.text());
                return;
            }
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                // Convert Django format to local format
                const history = data.map(h => ({
                    id: h.session_id,
                    userId: h.user_id,
                    queries: h.all_queries || [h.query],
                    mainQuery: h.query,
                    followUpQueries: (h.all_queries || []).slice(1),
                    conversationHistory: h.conversation_data || [],
                    timestamp: h.created_at,
                    sourcesCount: h.sources_count,
                    conversationLength: h.conversation_length
                }));
                
                setResearchHistory(history);
                console.log('✅ Loaded research history from Django backend');
            } else {
                setResearchHistory([]);
            }
        } catch (error) {
            console.error('Error loading research history from Django:', error);
            setResearchHistory([]);
        }
    };

    // Save current session to history (localStorage for guests, Django for authenticated users)
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

        };

        try {
            // Always save to Django backend for both guests and authenticated users
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
                    conversation_length: session.conversationLength
                })
            });

            if (!response.ok) {
                console.error('Error saving to Django:', await response.text());
            } else {
                console.log('✅ Research history saved to Django backend');
                // Refresh history from Django to keep UI in sync
                await loadResearchHistoryFromDjango();
            }
            // Optionally, also save to localStorage for guests for UX
            if (isGuest) {
                const existingHistory = JSON.parse(localStorage.getItem('litpath_research_history') || '[]');
                const updatedHistory = [session, ...existingHistory].slice(0, 50);
                localStorage.setItem('litpath_research_history', JSON.stringify(updatedHistory));
                setResearchHistory(updatedHistory);
                console.log('✅ Research history also saved to localStorage (guest)');
            }
        } catch (error) {
            console.error('Error saving research history:', error);
        }
    };

    // Delete a session from history
    const deleteHistorySession = async (sessionId) => {
        try {
            if (isGuest) {
                // Guest: Remove from localStorage and state
                const updatedHistory = researchHistory.filter(s => s.id !== sessionId);
                localStorage.setItem('litpath_research_history', JSON.stringify(updatedHistory));
                setResearchHistory(updatedHistory);
            } else {
                // Authenticated user: Remove from Django only (no localStorage)
                const response = await fetch(`${API_BASE_URL}/research-history/${sessionId}/`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    console.error('Error deleting from Django:', await response.text());
                } else {
                    console.log('✅ History session deleted from Django backend');
                    // Refresh history from Django to update state
                    await loadResearchHistoryFromDjango();
                }
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
            // Mark as follow-up search since we have history
            setIsFollowUpSearch(true);
            setCurrentSessionId(session.id);
            setHasSearchedInSession(true);
            setIsLoadedFromHistory(true); // Mark as loaded from history to prevent duplicate save
        } else {
            // Fallback for old sessions without full conversation history - re-run the search
            const queryToLoad = session.mainQuery || session.query;
            setSearchQuery(queryToLoad);
            handleSearch(queryToLoad);
            setIsLoadedFromHistory(false); // This will create a new session
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
    
    if (!backendStatus || backendStatus.status === 'error') {
        setError("Backend service is not available. Please check if the server is running.");
        return;
    }
    
    setLoading(true);
    setError(null);
    
    if (!isFollowUpSearch && !forceNew) {
        setSearchResults(null);
        setSelectedSource(null);
    }
    
    try {
        const filters = {};

        const searchQueryText = forceNew ? `${query} [v${Date.now()}]` : query;

        const requestBody = {
            question: searchQueryText,
            filters: Object.keys(filters).length > 0 ? filters : undefined,
            conversation_history: conversationHistory.slice(-3).map(item => ({
                query: item.query,
                overview: item.overview
            })),
            overview_only: false  // First request: get documents only
        };
        
        if (forceNew) {
            requestBody.regenerate = true;
            requestBody.timestamp = Date.now();
            requestBody.random_seed = Math.random();
            requestBody.conversation_history = [];
        }

        // STEP 1: Get documents immediately
        const response = await fetch(`${API_BASE_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const { documents, related_questions, suggestions } = data;

        // Format documents
        const formattedSources = documents.map((doc, index) => ({
            id: Date.now() + index,
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

        // Show sources immediately with loading state for overview
        const initialResult = {
            query: query,
            overview: 'Generating overview...',
            sources: formattedSources,
            relatedQuestions: related_questions || [],
            isLoadingSummary: true,
        };

        setConversationHistory(prev => [...prev, initialResult]);
        setSearchResults(initialResult);
        setIsFollowUpSearch(true);
        setSearchQuery('');
        setHasSearchedInSession(true);
        
        if (!currentSessionId) {
            setCurrentSessionId(generateSessionId());
        }

        // Turn off main loading to show sources
        setLoading(false);

        // STEP 2: Request overview generation
        const overviewResponse = await fetch(`${API_BASE_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...requestBody,
                overview_only: true  // Second request: generate overview
            }),
        });

        if (overviewResponse.ok) {
            const overviewData = await overviewResponse.json();
            
            const finalResult = {
                query: query,
                overview: overviewData.overview || 'No overview available.',
                sources: formattedSources,
                relatedQuestions: related_questions || [],
                isLoadingSummary: false,
            };

            // Update the last item in conversation history
            setConversationHistory(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = finalResult;
                return updated;
            });
            setSearchResults(finalResult);
        }

    } catch (err) {
        console.error("Search failed:", err);
        setError(`Search failed: ${err.message}`);
        setLoading(false);
    }
};


    const handleExampleQuestionClick = (question) => {
        setSearchQuery(question);
        handleSearch(question, conversationHistory.length > 0);
    };

    const handleSourceClick = (source) => {
        setSelectedSource(source);
        trackMaterialView(source);
    };

    const handleMoreDetails = () => {
        setShowOverlay(true);
        if (selectedSource) {
            trackMaterialView(selectedSource);
        }
    };

    const generateCitation = (style) => {
        if (!selectedSource) return;
        
        let author = selectedSource.author || "Unknown Author";
        const year = selectedSource.year || "n.d.";
        const title = selectedSource.title || "Untitled";
        let school = selectedSource.school || "Unknown Institution";
        let degree = selectedSource.degree || "Thesis";
        
        // Only convert school to title case if it's all caps (don't modify otherwise)
        if (school === school.toUpperCase()) {
            const lowercaseWords = ['of', 'the', 'and', 'in', 'at', 'to', 'for', 'a', 'an'];
            school = school.split(' ').map((word, index) => {
                // Always capitalize first word and words after hyphens
                if (index === 0 || word.includes('-')) {
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                }
                // Lowercase articles and prepositions
                if (lowercaseWords.includes(word.toLowerCase())) {
                    return word.toLowerCase();
                }
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }).join(' ');
        }
        
        // Helper to convert to proper title case
        const toTitleCase = (str) => {
            return str.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
        };
        
        // Parse author name intelligently (handle compound last names like "De Leon")
        const parseAuthorName = (name) => {
            // Common Spanish/Filipino prefixes in last names
            const lastNamePrefixes = ['de', 'del', 'dela', 'de la', 'san', 'santa', 'van', 'von', 'da'];
            const parts = name.split(/\s+/);
            
            // Find where the last name starts (look for lowercase prefixes)
            let lastNameStartIndex = parts.length - 1;
            for (let i = parts.length - 2; i >= 0; i--) {
                if (lastNamePrefixes.includes(parts[i].toLowerCase())) {
                    lastNameStartIndex = i;
                } else {
                    break;
                }
            }
            
            const firstNames = parts.slice(0, lastNameStartIndex);
            const lastName = parts.slice(lastNameStartIndex);
            
            return { firstNames, lastName };
        };
        
        // Format author name based on citation style
        const formatAuthorAPA = (name) => {
            // "De Leon, D. C. A."
            const { firstNames, lastName } = parseAuthorName(name);
            const initials = firstNames.map(n => n.charAt(0).toUpperCase() + '.').join(' ');
            const lastNameFormatted = lastName.map(toTitleCase).join(' ');
            return `${lastNameFormatted}, ${initials}`;
        };
        
        const formatAuthorMLA = (name) => {
            // "De Leon, Deborah Christine A. Title. Year. Institution, Degree type."
            const { firstNames, lastName } = parseAuthorName(name);
            const firstNamesFormatted = firstNames.map(toTitleCase).join(' ');
            const lastNameFormatted = lastName.map(toTitleCase).join(' ');
            // Remove double periods from initials
            return `${lastNameFormatted}, ${firstNamesFormatted}`.replace(/\.\.+/g, '.');
        };
        
        const formatAuthorIEEE = (name) => {
            // "D. C. A. De Leon"
            const { firstNames, lastName } = parseAuthorName(name);
            const initials = firstNames.map(n => n.charAt(0).toUpperCase() + '.').join(' ');
            const lastNameFormatted = lastName.map(toTitleCase).join(' ');
            return `${initials} ${lastNameFormatted}`;
        };
        
        // Convert title to sentence case (first word and proper nouns capitalized)
        const toSentenceCase = (str) => {
            // Preserve content in brackets and scientific names
            const lowerStr = str.toLowerCase();
            let result = lowerStr.charAt(0).toUpperCase() + lowerStr.slice(1);
            
            // Capitalize first letter after punctuation
            result = result.replace(/([.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
            
            // Capitalize first word after colon
            result = result.replace(/:\s+([a-z])/g, (match, p1) => ': ' + p1.toUpperCase());
            
            // Preserve proper nouns and geographic locations
            result = result.replace(/\bphilippine\b/gi, 'Philippine');
            result = result.replace(/\bphilippines\b/gi, 'Philippines');
            result = result.replace(/\btacloban\b/gi, 'Tacloban');
            result = result.replace(/\bleyte\b/gi, 'Leyte');
            result = result.replace(/\bmanila\b/gi, 'Manila');
            result = result.replace(/\bcebu\b/gi, 'Cebu');
            result = result.replace(/\bdavao\b/gi, 'Davao');
            result = result.replace(/\bcity\b/gi, 'City');
            
            // Preserve acronyms and scientific notation
            result = result.replace(/\bipb\b/gi, 'IPB');
            result = result.replace(/\bvar\b/gi, 'Var');
            
            // Preserve scientific names in brackets: [Genus species (Author) Author]
            result = result.replace(/\[([a-z])/gi, (match, p1) => '[' + p1.toUpperCase());
            result = result.replace(/\[([A-Z][a-z]+)\s+([a-z])/g, (match, p1, p2) => 
                '[' + p1 + ' ' + p2.toLowerCase()
            );
            // Capitalize taxonomic authors (e.g., "L.", "Skeels")
            result = result.replace(/\(([a-z])\.\)/gi, (match, p1) => '(' + p1.toUpperCase() + '.)');
            result = result.replace(/\)\s+([a-z])/g, (match, p1) => ') ' + p1.charAt(0).toUpperCase() + p1.slice(1).toLowerCase());
            
            return result;
        };
        
        let citation = "";
        switch (style) {
            case "APA":
                // APA 7th: De Leon, D. C. A. (Year). Title in sentence case [Degree type, Institution].
                const apaAuthor = formatAuthorAPA(author);
                const apaTitle = toSentenceCase(title);
                citation = `${apaAuthor} (${year}). ${apaTitle} [${degree}, ${school}].`;
                break;
            case "MLA":
                // MLA 9th: De Leon, Deborah Christine A. Title. Year. Institution, Degree type.
                const mlaAuthor = formatAuthorMLA(author);
                citation = `${mlaAuthor}. ${title}. ${year}. ${school}, ${degree}.`;
                break;
            case "Chicago":
                // Chicago: De Leon, Deborah Christine A. Year. "Title." Degree type, Institution.
                const chicagoAuthor = formatAuthorMLA(author);
                citation = `${chicagoAuthor}. ${year}. "${title}." ${degree}, ${school}.`;
                break;
            case "IEEE":
                // IEEE: D. C. A. De Leon, "Title," Degree abbreviation, Institution, Location, Year.
                const ieeeAuthor = formatAuthorIEEE(author);
                const ieeeDegree = degree === "Master's thesis" ? "M.S. thesis" : 
                                  degree === "Doctoral dissertation" ? "Ph.D. dissertation" : degree;
                citation = `${ieeeAuthor}, "${title}," ${ieeeDegree}, ${school}, Philippines, ${year}.`;
                break;
            default:
                citation = "";
        }
        setGeneratedCitation(citation);
    };
    const handleNewChat = async () => {
        // Save current session to history ONLY if user has searched AND it's not loaded from history
        if (hasSearchedInSession && searchResults && !isLoadedFromHistory) {
            await saveCurrentSessionToHistory();
            // Refresh research history from Django for authenticated users
            if (!isGuest) {
                await loadResearchHistoryFromDjango();
            }
        }

        // For guests, clear only localStorage and UI state for bookmarks and research history (not backend)
        if (isGuest) {
            localStorage.removeItem('litpath_bookmarks');
            localStorage.removeItem('litpath_research_history');
            setBookmarks([]);
            setBookmarkedCount(0);
            setResearchHistory([]);
            // Optionally clear conversation as well
            localStorage.removeItem('litpath_conversation');
            // Optionally start a completely new guest session
            await authStartNewChat();
        }

        // Reset all states
        setSearchQuery('');
        setSearchResults(null);
        setConversationHistory([]);
        setIsFollowUpSearch(false);
        setSelectedSource(null);
        setShowOverlay(false);
        setRating(0);
        setLoading(false);
        setError(null);
        setHasSearchedInSession(false);
        setIsLoadedFromHistory(false);
        setCurrentSessionId(generateSessionId());
    };
    
    // Handle logout
    const handleLogout = async () => {
        await logout();
        navigate('/');
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

    // Handle clicking on citation numbers in overview
const handleOverviewSourceClick = (sourceIdx) => {
    // Get the current result being viewed (last one in conversation)
    const currentResult = conversationHistory[conversationHistory.length - 1];
    
    if (!currentResult || !currentResult.sources) return;
    
    // Convert 1-based index to 0-based
    const sourceIndex = sourceIdx - 1;
    
    if (sourceIndex >= 0 && sourceIndex < currentResult.sources.length) {
        const source = currentResult.sources[sourceIndex];
        
        // Find the source card element in the horizontal scroll
        const sourceElements = document.querySelectorAll('[data-source-id]');
        const targetElement = Array.from(sourceElements).find(
            el => el.dataset.sourceId === source.id.toString()
        );
        
        if (targetElement) {
            // Scroll the source card into view
            targetElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest',
                inline: 'center' 
            });
            
            // Highlight the source card temporarily
            targetElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
            setTimeout(() => {
                targetElement.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
            }, 2000);
        }
        
        // Set as selected source
        setSelectedSource(source);
    }
};
    
    // Submit feedback

const handleFeedbackSubmit = async (feedbackType) => {
    if (!userId) {
        showToast('User ID not found. Please refresh the page.', 'error');
        return;
    }

    // Update feedback state
    const newFeedback = userFeedback === feedbackType ? null : feedbackType;
    setUserFeedback(newFeedback);
    
    // Show overlay for optional comment
    if (newFeedback !== null) {
        setShowFeedbackOverlay(true);
    }
};

const handleFeedbackConfirm = async () => {
    if (!userFeedback) {
        showToast('Please select feedback first.', 'error');
        return;
    }

    try {
        // Map thumbs to relevant boolean
        const isRelevant = userFeedback === 'thumbs_up';
        
        // Save to Django backend
        const response = await fetch(`${API_BASE_URL}/feedback/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                query: searchQuery,
                rating: isRelevant ? 5 : 1, // 5 for thumbs up, 1 for thumbs down
                relevant: isRelevant,
                comment: feedbackComment.trim() || null
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save feedback: ${await response.text()}`);
        }
        
        console.log('✅ Feedback saved to Django backend successfully!');
        showToast('Thank you for your feedback!', 'success');
        
        // Reset and close
        setShowFeedbackOverlay(false);
        setFeedbackComment("");
        setUserFeedback(null);
    } catch (err) {
        console.error('❌ Error submitting feedback:', err);
        showToast('Failed to submit feedback. Please try again.', 'error');
    }
};

    // Rating state (for feedback overlay)
    const [rating, setRating] = useState(0);
    const [feedbackRelevant, setFeedbackRelevant] = useState(null);

    // Submit feedback to Django backend
    const submitRatingFeedback = async () => {
        if (!userId) {
            showToast('User ID not found. Please refresh the page.', 'error');
            return;
        }

        if (feedbackRelevant === null) {
            showToast('Please select Yes or No for relevance.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/feedback/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    query: searchQuery,
                    rating: rating,
                    relevant: feedbackRelevant,
                    comment: feedbackComment.trim() || null
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save feedback: ${await response.text()}`);
            }
            
            console.log('✅ Feedback saved to Django backend successfully!');
            showToast('Thank you for your feedback!', 'success');
            
            // Reset and close
            setShowFeedbackOverlay(false);
            setFeedbackComment("");
            setFeedbackRelevant(null);
            setRating(0);
        } catch (err) {
            console.error('❌ Error submitting feedback:', err);
            showToast('Failed to submit feedback. Please try again.', 'error');
        }
    };

return (
    <div className="min-h-screen flex flex-col bg-gray-100">
        {/* Toast Notification */}
        {toast.show && (
            <div className={`fixed bottom-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-sm ${
                toast.type === 'success' ? 'bg-green-100 text-green-800' :
                toast.type === 'error' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
            }`}>
                <div className="flex items-center space-x-2">
                    {toast.type === 'success' && <span>✓</span>}
                    {toast.type === 'error' && <span>✕</span>}
                    {toast.type === 'info' && <span>ℹ</span>}
                    <span>{toast.message}</span>
                </div>
            </div>
        )}

        {/* Header */}
        <header className="sticky top-0 left-0 right-0 z-40 bg-gradient-to-b from-[#404040] to-[#1F1F1F] text-white shadow-md">
            <div className="flex items-center justify-between max-w-[100rem] mx-auto px-3 py-3 w-full">
                <div className="flex items-center space-x-4">
                    
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                    
                    <img src={dostLogo} alt="DOST Logo" className="h-10 w-auto" />
                    
                    <div className="hidden md:block text-sm border-l border-white pl-4 ml-4 leading-tight opacity-90">
                        LitPath AI: <br /> Smart PathFinder for Theses and Dissertation
                    </div>
                </div>


                <div className="flex items-center gap-4">
                    {/* User Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center space-x-2 hover:text-blue-200 transition-colors"
                        >
                            <User size={20} />
                            <span className="hidden md:block text-sm">
                                {isGuest ? 'Guest' : (user?.full_name ? user.full_name : (user?.username || user?.email?.split('@')[0]))}
                            </span>
                        </button>
                        
                        {showUserMenu && (
                            <div key={userMenuKey} className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-50">
                                <div className="px-4 py-2 border-b border-gray-100">
                                    <p className="text-sm font-medium text-gray-900">
                                        {isGuest ? 'Guest User' : (user?.full_name ? user.full_name : user?.username)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {isGuest ? 'Temporary session' : user?.email}
                                    </p>
                                    {user?.role && user.role !== 'guest' && (
                                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                                            user.role === 'admin' ? 'bg-red-100 text-red-700' :
                                            user.role === 'staff' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                        </span>
                                    )}
                                </div>
                                
                                {isStaff() && (
                                    <Link
                                        to="/admin/dashboard"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        onClick={() => setShowUserMenu(false)}
                                    >
                                        Admin Dashboard
                                    </Link>
                                )}
                                
                                {!isGuest && (
                                    <button
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            setShowAccountSettings(true);
                                            setSettingsTab('password');
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                    >
                                        <Settings size={14} />
                                        <span>Account Settings</span>
                                    </button>
                                )}
                                
                                {isGuest && (
                                    <Link
                                        to="/"
                                        className="block px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
                                        onClick={() => setShowUserMenu(false)}
                                    >
                                        Login
                                    </Link>
                                )}
                                
                                <button
                                    onClick={() => {
                                        setShowUserMenu(false);
                                        handleLogout();
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center space-x-2"
                                >
                                    <LogOut size={14} />
                                    <span>{isGuest ? 'Exit Guest Session' : 'Sign Out'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>

        {/* Sidebar (mobile overlay) */}
        {sidebarOpen && (
            <div className="fixed inset-0 z-50 flex">
                <div className="w-72 bg-white h-full shadow-2xl flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b">
                        <span className="font-bold text-lg">LitPath AI</span>
                        <button onClick={() => setSidebarOpen(false)} className="text-2xl">&times;</button>
                    </div>
                    <SidebarContent
                        handleNewChat={handleNewChat}
                        hasSearchedInSession={hasSearchedInSession}
                        setShowSavedItems={setShowSavedItems}
                        showSavedItems={showSavedItems}
                        bookmarkedCount={bookmarkedCount}
                        researchHistory={researchHistory}
                        loadHistorySession={loadHistorySession}
                        deleteHistorySession={deleteHistorySession}
                        setShowResearchHistory={setShowResearchHistory}
                    />
                </div>
                <div className="flex-1 bg-black bg-opacity-40" onClick={() => setSidebarOpen(false)} />
            </div>
        )}

        {/* Main layout */}
        <div className="flex flex-1 min-h-0">
            {/* Sidebar (desktop) - Collapsible */}
            <aside 
                className={`hidden md:flex flex-col bg-white border-r border-gray-200 h-[calc(100vh-64px)] sticky top-[64px] z-30 transition-all duration-300 ease-in-out ${
                    sidebarCollapsed ? 'w-16' : 'w-64'
                }`}
            >
                {/* Sidebar Toggle Button (inside sidebar) */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hidden md:flex items-center justify-center w-full h-10 hover:bg-gray-100 transition-colors border-b border-gray-200"
                    title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <Menu size={20} className="text-gray-600" />
                </button>

                
                {/* Sidebar Content */}
                <div className={`flex-1 overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                    <SidebarContent
                        handleNewChat={handleNewChat}
                        hasSearchedInSession={hasSearchedInSession}
                        setShowSavedItems={setShowSavedItems}
                        showSavedItems={showSavedItems}
                        bookmarkedCount={bookmarkedCount}
                        researchHistory={researchHistory}
                        loadHistorySession={loadHistorySession}
                        deleteHistorySession={deleteHistorySession}
                        setShowResearchHistory={setShowResearchHistory}
                    />
                </div>
            </aside>

            {/* Main content area - expands when sidebar is collapsed */}
            <main className="flex-1 flex flex-col justify-between min-h-0">
                {/* Chat/Content area */}
                <div
                    ref={chatContainerRef}
                    className="flex-1 w-full max-w-4xl mx-auto px-2 sm:px-8 py-4 overflow-y-auto"
                    style={{ minHeight: 'calc(100vh - 64px - 64px)' }}
                >
                    {/* Welcome screen */}
                    {!conversationHistory.length && !searchResults && (
                        <div className="flex flex-col items-center justify-center h-full pt-10">
                            <BookOpen className="text-[#1E74BC]" size={48} />
                            <h1 className="text-3xl font-extrabold mt-2 mb-2">
                                <span className="text-[#1E74BC]">LitPath</span>{" "}
                                <span className="text-[#b83a3a]">AI</span>
                            </h1>
                            <p className="text-gray-700 text-lg mb-6">Discover easier and faster.</p>

                            {/* Most Browsed Materials - CAROUSEL */}
                            <div className="mt-8 w-full max-w-4xl">
                                <h3 className="text-xl font-semibold text-gray-800 mb-5 flex items-center gap-2">
                                    <BookOpen size={24} className="text-[#1E74BC]" />
                                    Most Browsed Materials
                                </h3>

                                {loadingMostBrowsed ? (
                                    <div className="text-center text-gray-500 py-8">
                                        <RefreshCw size={24} className="animate-spin inline-block mb-2" />
                                        <p>Loading most browsed materials...</p>
                                    </div>
                                ) : mostBrowsed.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">
                                        <p>No browsing data available yet</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        {/* Navigation Arrows */}
                                        {mostBrowsed.length > 3 && (
                                            <>
                                                <button
                                                    onClick={() => setBrowsedCurrentSlide(Math.max(0, browsedCurrentSlide - 1))}
                                                    disabled={browsedCurrentSlide === 0}
                                                    className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white rounded-full shadow-lg p-2 hover:bg-gray-100 transition-colors ${browsedCurrentSlide === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <ChevronLeft size={28} className="text-[#1E74BC]" />
                                                </button>
                                                <button
                                                    onClick={() => setBrowsedCurrentSlide(Math.min(mostBrowsed.length - 3, browsedCurrentSlide + 1))}
                                                    disabled={browsedCurrentSlide >= mostBrowsed.length - 3}
                                                    className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white rounded-full shadow-lg p-2 hover:bg-gray-100 transition-colors ${browsedCurrentSlide >= mostBrowsed.length - 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <ChevronRight size={28} className="text-[#1E74BC]" />
                                                </button>
                                            </>
                                        )}

                                        {/* Carousel Container */}
                                        <div className="overflow-hidden">
                                            <div 
                                                className="flex gap-6 transition-transform duration-300 ease-in-out"
                                                style={{ transform: `translateX(-${browsedCurrentSlide * (100/3 + 2)}%)` }}
                                            >
                                                {mostBrowsed.map((material, index) => (
                                                    <div
                                                        key={material.file}
                                                        className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden flex-shrink-0"
                                                        style={{ width: 'calc(33.333% - 16px)' }}
                                                        onClick={() => {
                                                            const formattedMaterial = {
                                                                id: Date.now() + index,
                                                                title: material.title,
                                                                author: material.author,
                                                                year: material.year,
                                                                abstract: material.abstract,
                                                                file: material.file,
                                                                fullTextPath: material.file,
                                                                degree: material.degree,
                                                                subjects: material.subjects,
                                                                school: material.school,
                                                            };
                                                            setSelectedSource(formattedMaterial);
                                                            trackMaterialView(formattedMaterial);
                                                            setShowOverlay(true);
                                                        }}
                                                    >
                                                        {/* Ranking Badge */}
                                                        <div className="bg-gradient-to-r from-[#1E74BC] to-[#155a8f] text-white px-4 py-2 flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="bg-white text-[#1E74BC] rounded-full w-8 h-8 flex items-center justify-center font-bold">
                                                                    {index + 1}
                                                                </div>
                                                                <span className="text-sm font-medium">
                                                                    {material.view_count} {material.view_count === 1 ? 'view' : 'views'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Star 
                                                                    size={16} 
                                                                    className={parseFloat(material.avg_rating) > 0 ? 'fill-yellow-300 text-yellow-300' : 'text-white'} 
                                                                />
                                                                <span className="text-sm font-medium">
                                                                    {parseFloat(material.avg_rating).toFixed(1)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Material Info */}
                                                        <div className="p-5">
                                                            <h4 className="font-semibold text-lg text-gray-800 mb-2 line-clamp-2 hover:text-[#1E74BC] transition-colors">
                                                                {material.title}
                                                            </h4>
                                                            <p className="text-sm text-gray-600 mb-3">
                                                                <User size={14} className="inline mr-1" />
                                                                {material.author} • {material.year}
                                                            </p>
                                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                                <span>{material.degree}</span>
                                                                <span className="text-[#1E74BC] hover:underline font-medium">
                                                                    View Details →
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Dots Indicator */}
                                        {mostBrowsed.length > 3 && (
                                            <div className="flex justify-center gap-2 mt-4">
                                                {Array.from({ length: Math.ceil(mostBrowsed.length - 2) }).map((_, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setBrowsedCurrentSlide(i)}
                                                        className={`w-2 h-2 rounded-full transition-colors ${i === browsedCurrentSlide ? 'bg-[#1E74BC]' : 'bg-gray-300 hover:bg-gray-400'}`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Search Input Bar */}
                            <div className="mt-28 w-full max-w-4xl">
                                <div className="flex items-center space-x-2 border border-gray-300 rounded-lg px-3 py-3 focus-within:border-blue-500 transition-colors bg-white shadow-xl">
                                    <Search className="text-gray-500" size={18} />
                                    <input
                                        type="text"
                                        placeholder="What is your research question?"
                                        className="flex-1 outline-none text-gray-800 text-base"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                                        disabled={loading}
                                    />
                                    <button
                                        onClick={() => handleSearch(searchQuery)}
                                        className="bg-[#1E74BC] text-white px-4 py-2 rounded-lg hover:bg-[#155a8f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                        disabled={loading}
                                    >
                                        Search
                                    </button>
                                </div>
                                
                                {/* AI Disclaimer */}
                                <div className="bg-transparent text-gray-500 text-xs text-center mt-2">
                                    LitPath AI can make mistakes, so double-check it.
                                </div>
                                
                            </div>

                            {/* Loading Indicator - below search bar */}
                            {loading && (
                                <div className="text-center text-[#1E74BC] text-lg mt-6">
                                    <div className="animate-spin inline-block w-8 h-8 border-4 border-[#1E74BC] border-t-transparent rounded-full mr-2"></div>
                                    Searching for insights...
                                </div>
                            )}

                            {/* Example Questions */}
                            <div className="mt-12 w-full max-w-4xl">
                                <h3 className="text-base font-semibold text-gray-800 mb-3">Example questions</h3>
                                <div className="flex flex-col gap-3">
                                    <ExampleQuestionButton onClick={handleExampleQuestionClick} text="How does plastic pollution affect plant growth in farmland?" />
                                    <ExampleQuestionButton onClick={handleExampleQuestionClick} text="Find research about sleep quality among teenagers" />
                                    <ExampleQuestionButton onClick={handleExampleQuestionClick} text="How does remote work impact employee productivity?" />
                                    <ExampleQuestionButton onClick={handleExampleQuestionClick} text="Find recent research about how vitamin D deficiency impact overall health" />
                                </div>
                            </div>


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
                        </div>
                    )}

                    {/* Conversation History */}
                    {conversationHistory.map((result, historyIndex) => {
                        const isLast = historyIndex === conversationHistory.length - 1;
                        return (
                            <div key={historyIndex} className="mb-14">
                                {/* Question */}
                                <div className="flex justify-end mb-2">
                                    <div className="max-w-[85%] bg-[#1E74BC] text-white rounded-2xl px-4 py-3 shadow-md text-base break-words">
                                        {result.query}
                                    </div>
                                </div>
                                
                                {/* Sources Section (before AI response) */}
                                {result.sources && result.sources.length > 0 && (
                                    <div className="mt-4 mb-6">
                                        <h3 className="text-xl font-semibold mb-4 flex items-center space-x-3 text-gray-800">
                                            <BookOpen size={24} className="text-[#1E74BC]" />
                                            <span>Sources</span>
                                        </h3>
                                        <div className="flex space-x-5 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-blue-100">
                                            {result.sources.map((source, sidx) => (
                                                <div
                                                    key={source.id}
                                                    data-source-id={source.id}
                                                    ref={el => { if (!handleSourceRef.current) handleSourceRef.current = {}; handleSourceRef.current[sidx + 1] = el; }}
                                                    className={`flex-shrink-0 w-72 bg-white rounded-xl shadow-lg p-5 cursor-pointer border-2 ${
                                                        selectedSource && selectedSource.id === source.id
                                                            ? 'border-blue-500'
                                                            : 'border-gray-100'
                                                    } hover:shadow-xl transition-all duration-200 ease-in-out`}
                                                    onClick={() => handleSourceClick(source)}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center justify-center w-9 h-9 bg-[#1E74BC] text-white rounded-full text-base font-bold">
                                                            {sidx + 1}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <Star 
                                                                    size={12} 
                                                                    className={parseFloat(source.avg_rating || 0) > 0 ? 'fill-yellow-300 text-yellow-300' : 'text-gray-300'} 
                                                                />
                                                                <span className="text-xs text-gray-500">
                                                                    {(source.avg_rating !== undefined ? parseFloat(source.avg_rating).toFixed(1) : '0.0')}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                                <Eye size={12} />
                                                                {source.view_count || 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <h4 className="font-semibold text-lg text-gray-800 mb-2 line-clamp-3">{source.title}</h4>
                                                    <p className="text-sm text-gray-600">{source.author} • {source.year}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Selected Source Details for this conversation */}
                                        {selectedSource && result.sources.some(s => s.id === selectedSource.id) && (
                                            <div className="bg-[#E8F3FB] border-l-4 border-[#1E74BC] rounded-r-lg p-6 mb-6 shadow-md mt-6">
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
                                    </div>
                                )}
                                
                                {/* Overview */}
                                <div className="flex justify-start">
                                    <div className="max-w-[85%] bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow text-gray-900 text-base break-words">
                                        <div
                                            className="text-gray-700 leading-relaxed whitespace-pre-line text-base text-justify"
                                            dangerouslySetInnerHTML={{
                                                __html: (result.overview || 'No overview available.').replace(/\[(\d+)\]/g, (match, num) => {
                                                    return ` <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#1E74BC] text-white text-xs font-semibold cursor-pointer" data-source-idx="${num}">${num}</span>`;
                                                })
                                            }}
                                            onClick={e => {
                                                const el = e.target;
                                                if (el && el.dataset && el.dataset.sourceIdx) {
                                                    handleOverviewSourceClick(Number(el.dataset.sourceIdx));
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Try again button - only show for the latest result */}
                                {isLast && !loading && (
                                    <div className="flex justify-end items-center mt-6">
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
                                {isLast && loading && (
                                    <div className="text-center text-[#1E74BC] text-lg mt-8">
                                        <div className="animate-spin inline-block w-8 h-8 border-4 border-[#1E74BC] border-t-transparent rounded-full mr-2"></div>
                                        Searching for insights...
                                    </div>
                                )}
                                
                                {/* Error message - show after the latest result */}
                                {isLast && error && (
                                    <div className="text-center text-red-600 text-lg mt-8 p-4 bg-red-50 rounded-lg border border-red-200">
                                        {error}
                                    </div>
                                )}

                                {/* Related Questions - only show for the latest result and not while loading */}
                                {isLast && !loading && result.relatedQuestions && result.relatedQuestions.length > 0 && (
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
                        );
                    })}


                </div>

                {/* Input bar (for follow-up questions when conversation exists) */}
                {conversationHistory.length > 0 && (
                    <div className="sticky bottom-4 z-30 flex flex-col items-center px-2 sm:px-8">
                        
                        {/* Search bar */}
                        <div className="flex items-center space-x-2 rounded-lg px-3 py-3 
                            bg-white shadow-[0_12px_32px_-10px_rgba(0,0,0,0.28)]
                            focus-within:ring-2 focus-within:ring-blue-500
                            w-full max-w-4xl">
                            
                            <Search className="text-gray-500" size={18} />

                            <input
                                type="text"
                                placeholder="What is your research question?"
                                className="flex-1 outline-none text-gray-800 text-base bg-transparent"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) =>
                                    e.key === 'Enter' && handleSearch(searchQuery, true)
                                }
                                disabled={loading}
                            />

                            <button
                                onClick={() => handleSearch(searchQuery, true)}
                                className="bg-[#1E74BC] text-white px-4 py-2 rounded-lg hover:bg-[#155a8f]
                                    transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                disabled={loading}
                            >
                                Search
                            </button>
                        </div>

                        {/* AI Disclaimer */}
                        <div className="w-full bg-gray-100 rounded-b-lg -mt-px">
                            <p className="text-[10px] text-gray-500 text-center max-w-4xl mx-auto py-1 px-2">
                                LitPath AI can make mistakes, so double-check it.
                            </p>
                        </div>

                    </div>
                )}


            </main>
        </div>


        {/* Overlay for More Details */}
        {showOverlay && selectedSource && (
            <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-center pt-[4.5rem]">
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
                            <div className="flex space-x-4 items-center">
                                {/* Thumbs Up/Down Feedback */}
                                <button
                                    className={`transition-colors ${userFeedback === 'thumbs_up' ? 'text-green-300' : 'text-white hover:text-blue-200'}`}
                                    onClick={() => handleFeedbackSubmit('thumbs_up')}
                                    title="Helpful"
                                >
                                    <ThumbsUp size={20} fill={userFeedback === 'thumbs_up' ? 'currentColor' : 'none'} />
                                </button>
                                <button
                                    className={`transition-colors ${userFeedback === 'thumbs_down' ? 'text-red-300' : 'text-white hover:text-blue-200'}`}
                                    onClick={() => handleFeedbackSubmit('thumbs_down')}
                                    title="Not helpful"
                                >
                                    <ThumbsDown size={20} fill={userFeedback === 'thumbs_down' ? 'currentColor' : 'none'} />
                                </button>
                                <div className="w-px h-5 bg-white opacity-30"></div>
                                <button 
                                    className="text-white hover:text-blue-200 transition-colors"
                                    onClick={() => toggleBookmark(selectedSource)}
                                    title={isBookmarked(selectedSource?.file || selectedSource?.fullTextPath) ? "Remove bookmark" : "Add bookmark"}
                                >
                                    <Bookmark 
                                        size={20} 
                                        fill={isBookmarked(selectedSource?.file || selectedSource?.fullTextPath) ? "currentColor" : "none"}
                                        className={isBookmarked(selectedSource?.file || selectedSource?.fullTextPath) ? "text-white" : "text-white"}
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
                            onClick={() => {
                                navigator.clipboard.writeText(generatedCitation);
                                showToast('Citation copied to clipboard!', 'success');
                            }}
                        >
                            Copy to Clipboard
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Feedback Overlay */}
        {showFeedbackOverlay && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center">
                <div className="bg-white w-11/12 md:w-1/2 lg:w-1/3 rounded-lg shadow-xl p-6 relative">
                    {/* Close button */}
                    <button
                        className="absolute top-3 right-3 text-gray-500 text-xl hover:text-gray-700"
                        onClick={() => {
                            setShowFeedbackOverlay(false);
                            setUserFeedback(null);
                        }}>
                        ×
                    </button>
                    <h2 className="text-2xl font-semibold text-[#1E74BC] mb-4">
                        {userFeedback === 'thumbs_up' ? 'Thank you for your feedback!' : 'Sorry to hear this wasn\'t helpful.'}
                    </h2>
                    <p className="text-gray-800 mb-2">
                        Would you like to add any comments? (Optional)
                    </p>
                    <textarea
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        className="w-full border border-gray-300 rounded p-3 text-sm h-28 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Share your feedback or suggestions here..."
                        maxLength={500}
                    />
                    <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">
                            {feedbackComment.length}/500 characters
                        </p>
                    </div>
                    
                    {/* Submit + Cancel */}
                    <div className="flex justify-end gap-3 mt-5">
                        <button
                            className="bg-[#1E74BC] text-white px-5 py-2 rounded hover:bg-[#185f99]"
                            onClick={handleFeedbackConfirm}>
                            Submit
                        </button>
                        <button
                            className="px-5 py-2 rounded bg-gray-300 hover:bg-gray-400"
                            onClick={() => {
                                setShowFeedbackOverlay(false);
                                setFeedbackComment("");
                            }}
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
                            {isGuest 
                                ? 'Guest bookmarks are temporary and will be cleared on new chat.'
                                : `Bookmarks are saved to your account.`
                            }
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

        {/* Account Settings Modal */}
        {showAccountSettings && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#1E74BC] to-[#155a8f] text-white p-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Settings size={24} />
                                Account Settings
                            </h2>
                            <button
                                onClick={() => {
                                    setShowAccountSettings(false);
                                    setCurrentPassword('');
                                    setNewPassword('');
                                    setConfirmPassword('');
                                    setDeletePassword('');
                                }}
                                className="text-white hover:text-gray-200 text-2xl"
                            >
                                ×
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b">
                    
                        <button
                            onClick={() => setSettingsTab('profile')}
                            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                                settingsTab === 'profile'
                                    ? 'text-[#1E74BC] border-b-2 border-[#1E74BC] bg-blue-50'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <User size={16} />
                            Edit Profile
                        </button>
                        <button
                            onClick={() => setSettingsTab('password')}
                            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                                settingsTab === 'password'
                                    ? 'text-[#1E74BC] border-b-2 border-[#1E74BC] bg-blue-50'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <Key size={16} />
                            Change Password
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">

                        {settingsTab === 'profile' && (
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                setSettingsLoading(true);
                                try {
                                    const token = localStorage.getItem('litpath_session') ? JSON.parse(localStorage.getItem('litpath_session')).session_token : null;
                                    const res = await fetch('http://localhost:8000/api/auth/update-profile/', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`
                                        },
                                        body: JSON.stringify({
                                            full_name: editFullName,
                                            username: editUsername
                                        })
                                    });
                                    let data;
                                    if (res.ok) {
                                        data = await res.json();
                                        setSettingsLoading(false);
                                        if (data.success) {
                                            if (data.user) {
                                                localStorage.setItem('litpath_auth_user', JSON.stringify(data.user));
                                                setUser(data.user);
                                            }
                                            showToast('Profile updated!', 'success');
                                            setShowAccountSettings(false);
                                        } else {
                                            showToast(data.message || 'Failed to update profile', 'error');
                                        }
                                    } else {
                                        // Try to parse error message from backend
                                        try {
                                            data = await res.json();
                                            showToast(data.message || data.error || 'Failed to update profile', 'error');
                                        } catch (parseErr) {
                                            const errorText = await res.text();
                                            showToast(errorText || 'Failed to update profile', 'error');
                                        }
                                        setSettingsLoading(false);
                                    }
                                } catch (err) {
                                    setSettingsLoading(false);
                                    showToast('Connection error', 'error');
                                }
                             }}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                        <input
                                            type="text"
                                            value={editFullName}
                                            onChange={e => setEditFullName(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                        <input
                                            type="text"
                                            value={editUsername}
                                            onChange={e => setEditUsername(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={settingsLoading}
                                        className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {settingsLoading ? (
                                            <>
                                                <RefreshCw size={16} className="animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <User size={16} />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                        {settingsTab === 'password' && (
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (newPassword !== confirmPassword) {
                                    showToast('New passwords do not match', 'error');
                                    return;
                                }
                                if (newPassword.length < 6) {
                                    showToast('Password must be at least 6 characters', 'error');
                                    return;
                                }
                                setSettingsLoading(true);
                                const result = await changePassword(currentPassword, newPassword);
                                setSettingsLoading(false);
                                if (result.success) {
                                    showToast('Password changed successfully!', 'success');
                                    setShowAccountSettings(false);
                                    setCurrentPassword('');
                                    setNewPassword('');
                                    setConfirmPassword('');
                                } else {
                                    showToast(result.error || 'Failed to change password', 'error');
                                }
                            }}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Current Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E74BC] focus:border-transparent pr-10"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showNewPassword ? 'text' : 'password'}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E74BC] focus:border-transparent pr-10"
                                                required
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Confirm New Password
                                        </label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E74BC] focus:border-transparent"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={settingsLoading}
                                        className="w-full bg-[#1E74BC] text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {settingsLoading ? (
                                            <>
                                                <RefreshCw size={16} className="animate-spin" />
                                                Changing...
                                            </>
                                        ) : (
                                            <>
                                                <Key size={16} />
                                                Change Password
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
);
};

// ExampleQuestionButton component
const ExampleQuestionButton = ({ onClick, text }) => {
    return (
        <button
            onClick={() => onClick(text)}
            className="w-full text-left bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-[#1E74BC] hover:shadow-md transition-all text-gray-700 text-sm"
        >
            {text}
        </button>
    );
};

// SidebarContent component
function SidebarContent({
    handleNewChat,
    hasSearchedInSession,
    setShowSavedItems,
    showSavedItems,
    bookmarkedCount,
    researchHistory,
    loadHistorySession,
    deleteHistorySession,
    setShowResearchHistory
}) {
    return (
        <div className="flex flex-col h-full">
            
            {/* TOP CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <button
                    onClick={handleNewChat}
                    disabled={!hasSearchedInSession}
                    className={`w-full py-3 rounded-lg font-semibold shadow-md transition-colors ${
                        hasSearchedInSession
                            ? 'bg-[#1E74BC] text-white hover:bg-[#155a8f]'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    Start a new chat
                </button>
                <button
                    onClick={() => setShowSavedItems(true)}
                    className="w-full flex items-center justify-between border-2 border-[#1E74BC] text-[#1E74BC] py-3 px-4 rounded-lg hover:bg-blue-50 font-semibold shadow-md"
                >
                    <span className="flex items-center gap-2"><Bookmark size={18} /> Saved Bookmarks</span>
                    {bookmarkedCount > 0 && (
                        <span className="bg-[#1E74BC] text-white text-xs font-bold px-3 py-1 rounded-full">{bookmarkedCount}</span>
                    )}
                </button>
                <h3 className="font-semibold text-gray-800 mb-2 text-lg">Research history</h3>
                {researchHistory.length === 0 ? (
                    <p className="text-sm text-gray-600 leading-relaxed">After you start a new chat, your research history will be saved and displayed here.</p>
                ) : (
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
                                    onClick={e => { e.stopPropagation(); deleteHistorySession(session.id); }}
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
                )}
            </div>

            {/* BOTTOM DISCLOSURE */}
            <div className="text-[10px] text-gray-500 p-4 border-t">
                AI-generated content. Quality may vary.<br />
                Check for accuracy.
                <a href="#" className="text-[#1E74BC] hover:underline block mt-2">
                    About LitPath AI
                </a>
                <a href="#" className="text-[#1E74BC] hover:underline block">
                    Privacy and Disclaimer
                </a>
            </div>
        </div>
    );
}

export default LitPathAI;
