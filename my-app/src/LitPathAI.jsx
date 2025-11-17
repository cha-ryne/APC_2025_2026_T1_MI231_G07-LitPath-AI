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
    
    useEffect(() => {
        let storedUserId = localStorage.getItem('litpath_user_id');

        if (!storedUserId) {
            storedUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('litpath_user_id', storedUserId);
        }

        setUserId(storedUserId);
    }, []);
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
    const handleSearch = async (query = searchQuery) => {
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
        setSearchResults(null);
        setSelectedSource(null);
        
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

            const response = await fetch(`${API_BASE_URL}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: query,
                    filters: Object.keys(filters).length > 0 ? filters : undefined
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const { overview, documents, related_questions } = data;
            
            // Format documents for frontend, mapping backend fields exactly
            const formattedSources = documents.map((doc, index) => ({
                id: index + 1,
                title: doc.title || '[Unknown Title]',
                author: doc.author || '[Unknown Author]',
                year: doc.publication_year || '[Unknown Year]',
                abstract: doc.abstract || 'Abstract not available.',
                fullTextPath: doc.file || '',
                degree: doc.degree || 'Thesis',
                subjects: doc.subjects || ['Research'],
                school: doc.university || '[Unknown University]',
            }));
            
            setSearchResults({
                query: query,
                overview: overview || 'No overview available.',
                sources: formattedSources,
                relatedQuestions: related_questions || [],
            });


        } catch (err) {
            console.error("Search failed:", err);
            setError(`Search failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };


    const handleExampleQuestionClick = (question) => {
        setSearchQuery(question);
        handleSearch(question);
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
    const handleNewChat = () => {
        setSearchQuery('');
        setSelectedSubject('All subjects');
        setSelectedDate('All dates');
        setFromYear('');
        setToYear('');
        setSearchResults(null);
        setSelectedSource(null);
        setShowOverlay(false);
        setRating(0);
        setLoading(false);
        setError(null);
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
    
    // MODIFIED: handleFeedbackSubmit to remove Supabase dependency and alerts
    const handleFeedbackSubmit = async () => {
        if (!userId) return;
        try {
            const { error } = await supabase
            .from('feedback')
            .insert({
                user_id: userId,
                query: searchQuery,
                rating: rating,
                relevant: feedbackRelevant,
                comment: feedbackComment
            });
            
            if (error) throw error;

            console.log('Feedback submitted successfully');
            setShowRatingOverlay(false);
            setFeedbackComment("");
            setFeedbackRelevant(null);
            
            console.log('Thank you for your feedback!');
        } catch (err) {
            console.error('Error submitting feedback:', err);
            console.log('Failed to submit feedback. Please try again.');
        }
    };

    
    const handleProfileClick = () => {
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <div className="bg-[#1F1F1F] text-white p-4 shadow-md">
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

            <div className="flex-1 flex justify-center items-start py-10 px-4">
                {/* Left Container (Sidebar) */}
                <div className="w-80 bg-white bg-opacity-95 rounded-xl shadow-2xl p-6 mr-6 flex-shrink-0 h-auto">
                    <div className="flex items-center space-x-2 mb-6 text-gray-800">
                        <BookOpen className="text-[#1E74BC]" size={24} />
                        <span className="font-bold text-xl">LitPath AI</span>
                    </div>
                    <button
                        onClick={handleNewChat}
                        className="w-full bg-[#1E74BC] text-white py-3 px-4 rounded-lg mb-8 hover:bg-[#155a8f] transition-colors font-semibold shadow-md"
                    >
                        Start a new chat
                    </button>
                    <div className="mb-8">
                        <h3 className="font-semibold text-gray-800 mb-3 text-lg">Research history</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">After you start a new chat, your research history will be displayed here.</p>
                    </div>
                    <div className="absolute bottom-6 left-6 right-6 text-xs text-gray-500 space-y-2">
                        <p>AI-generated content. Quality may vary.<br />Check for accuracy.</p>
                        <a href="#" className="text-blue-600 hover:underline block">About LitPath AI</a>
                        <a href="#" className="text-blue-600 hover:underline block">Privacy and Disclaimer</a>
                    </div>
                </div>
                {/* Right Container (Main Content) */}
                <div className="flex-1 max-w-5xl bg-white bg-opacity-95 rounded-xl shadow-2xl p-8 relative">
                    
                    <div className="absolute top-6 right-6 z-10">
                        <button
                            onClick={handleProfileClick}
                            className="p-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors shadow-md"
                            title="Login/Profile"
                        >
                            <User size={24} />
                        </button>
                    </div>

                    {!searchResults ? (
                        <div className="max-w-4xl mx-auto">
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
                                    {/* Subject Filter */}
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


                                    {/* Date Filter */}
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


                                    {/* Custom Date Range */}
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
                                        onClick={() =>
                                            handleExampleQuestionClick(
                                                "How does plastic pollution affect plant growth in farmland?"
                                            )
                                        }
                                        className="flex items-center justify-between text-left p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 text-gray-800 hover:bg-blue-50"
                                    >
                                        <span className="flex-1 pr-4">
                                            How does plastic pollution affect plant growth in farmland?
                                        </span>
                                        <ArrowRight size={22} className="text-[#1E74BC] flex-shrink-0" />
                                    </button>
                                    <button
                                        onClick={() =>
                                            handleExampleQuestionClick("Find research about sleep quality among teenagers")
                                        }
                                        className="flex items-center justify-between text-left p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 text-gray-800 hover:bg-blue-50"
                                    >
                                        <span className="flex-1 pr-4">
                                            Find research about sleep quality among teenagers
                                        </span>
                                        <ArrowRight size={22} className="text-[#1E74BC] flex-shrink-0" />
                                    </button>
                                    <button
                                        onClick={() =>
                                            handleExampleQuestionClick("How does remote work impact employee productivity?")
                                        }
                                        className="flex items-center justify-between text-left p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 text-gray-800 hover:bg-blue-50"
                                    >
                                        <span className="flex-1 pr-4">
                                            How does remote work impact employee productivity?
                                        </span>
                                        <ArrowRight size={22} className="text-[#1E74BC] flex-shrink-0" />
                                    </button>
                                    <button
                                        onClick={() =>
                                            handleExampleQuestionClick(
                                                "Find recent research about how vitamin D deficiency impact overall health"
                                            )
                                        }
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
                        <div className="max-w-6xl mx-auto">
                            {/* Search Input (persistent after results) */}
                            <div className="bg-white rounded-lg shadow-inner p-6 mb-8 border border-gray-200">
                                {/* Search Bar */}
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
                                    >
                                        <ArrowRight size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Search Results Header */}
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">{searchResults.query}</h2>
                            </div>
                            {/* Sources Carousel */}
                            <div className="mb-6">
                                <h3 className="text-xl font-semibold mb-4 flex items-center space-x-3 text-gray-800">
                                    <BookOpen size={24} className="text-[#1E74BC]" />
                                    <span>Sources</span>
                                </h3>
                                <div className="flex space-x-5 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-blue-100">
                                    {searchResults.sources.map((source, index) => (
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


                            {/* Selected Source Details */}
                            {selectedSource && (
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
                                            {selectedSource.abstract
                                                ?.split(/(?<= \. )\s+/) // split sentences by period + space
                                                .slice(0, 3)          // shows only 3 lines of abstract
                                                .join(" ") + (selectedSource.abstract.split(/(?<= \. )\s+/).length > 3 ? " ..." : "")
                                            }
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


                            {/* Overview of Sources */}
                            <div className="mb-6">
                                <h3 className="text-xl font-semibold mb-4 text-gray-800">Overview of Sources</h3>
                                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                                    <div
                                        className="text-gray-700 leading-relaxed whitespace-pre-line text-base text-justify"
                                        dangerouslySetInnerHTML={{
                                            __html: searchResults.overview
                                                ? searchResults.overview.replace(/ \[(\d+)\]/g, (_, num) => {
                                                    return `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1E74BC] text-white text-sm font-semibold mx-1">${num}</span>`;
                                                })
                                                : "<i>No overview available.</i>",
                                        }}
                                    ></div>
                                </div>
                            </div>


                            {/* Rating and Actions */}
                            <div className="flex justify-end items-center mb-8 mt-6 space-x-5">
                                {/* Stars */}
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


                                {/* Try Again Button */}
                                <button
                                    onClick={() => handleSearch(searchQuery)}
                                    disabled={loading}
                                    className={`flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg transition-colors ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                                        } text-gray-700`}
                                >
                                    <RefreshCw size={18} />
                                    <span>{loading ? "Loading..." : "Try again"}</span>
                                </button>
                            </div>


                            {/* Related Research Questions */}
                            {searchResults.relatedQuestions.length > 0 && (
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-800 mb-5">Related research questions</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {searchResults.relatedQuestions.map((question, index) => (
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
                                    <button className="text-white hover:text-blue-200">
                                        <Bookmark size={20} />
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
        </div>
    );
};
export default LitPathAI;