import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
    Search, ChevronLeft, ChevronDown, 
    Star, MessageSquare, Clock, CheckCircle, XCircle 
} from "lucide-react";
import dostLogo from "./components/images/dost-logo.png"; // Ensure this path matches your folder structure
import { useAuth } from "./context/AuthContext";

// Define your API URL (Make sure this matches your Django port)
const API_BASE_URL = 'http://localhost:8000/api';

const FeedbackManager = () => {
    const navigate = useNavigate();
    const { user } = useAuth(); // We might need this to check permissions
    
    // --- STATE MANAGEMENT ---
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterRating, setFilterRating] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFeedback, setSelectedFeedback] = useState(null); 
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // --- REAL DATA LOADER ---
    useEffect(() => {
        fetchFeedback();
    }, []);

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            // Get the token if your API is protected (adjust key name if needed)
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            
            const response = await fetch(`${API_BASE_URL}/feedback/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // Include this line if your backend requires login to view list
                    // 'Authorization': `Bearer ${token}` 
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch feedback');
            }

            const data = await response.json();
            
            // Map the backend data to ensure 'status' exists (fallback to 'Pending')
            const cleanData = data.map(item => ({
                ...item,
                // If backend doesn't have status column yet, default to Pending
                status: item.status || 'Pending' 
            }));

            // Sort by newest first
            const sortedData = cleanData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            setFeedbacks(sortedData);
        } catch (error) {
            console.error("Error fetching feedback:", error);
            showToast("Failed to load feedback from server.", "error");
        } finally {
            setLoading(false);
        }
    };

    // --- HELPER FUNCTIONS ---
    const getStatusColor = (status) => {
        switch(status) {
            case 'Addressed': return 'bg-green-100 text-green-800 border-green-200';
            case 'Reviewed': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // Pending
        }
    };

    const isGuest = (userId) => userId && userId.startsWith('guest_');

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    // --- ACTION: UPDATE STATUS ---
    const handleStatusUpdate = async (id, newStatus) => {
        // Optimistic UI Update (Change it immediately on screen)
        const previousFeedbacks = [...feedbacks];
        const updatedFeedbacks = feedbacks.map(item => 
            item.id === id ? { ...item, status: newStatus } : item
        );
        setFeedbacks(updatedFeedbacks);
        setSelectedFeedback(null); // Close modal

        try {
            const token = localStorage.getItem('access_token');
            
            // Send PATCH request to backend
            const response = await fetch(`${API_BASE_URL}/feedback/${id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error('Failed to update status');
            }

            showToast(`Status updated to ${newStatus}`);
        } catch (error) {
            console.error("Error updating status:", error);
            // Revert UI if failed
            setFeedbacks(previousFeedbacks); 
            showToast("Failed to save status update.", "error");
        }
    };

    // --- FILTER LOGIC ---
    const filteredFeedbacks = feedbacks.filter(item => {
        const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
        const matchesRating = filterRating === 'All' || item.rating === parseInt(filterRating);
        
        // Search in comment OR user_id
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = (item.comment && item.comment.toLowerCase().includes(searchLower)) || 
                              (item.user_id && item.user_id.toLowerCase().includes(searchLower));
                              
        return matchesStatus && matchesRating && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            
            {/* --- HEADER --- */}
            <div className="bg-[#1F1F1F] text-white p-4 shadow-md sticky top-0 z-40">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <img src={dostLogo} alt="DOST Logo" className="h-10 w-auto" />
                        <div className="text-lg font-bold hidden md:block">LitPath AI Admin</div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => navigate('/admin/dashboard')}
                            className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                        >
                            <ChevronLeft size={18} />
                            <span>Back to Dashboard</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 max-w-7xl mx-auto w-full p-6">
                
                {/* Title Section */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">Feedback Management</h1>
                    <p className="text-gray-500">Review user ratings, comments, and relevance scores.</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Feedback</p>
                            <p className="text-2xl font-bold text-gray-800">{feedbacks.length}</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-full text-blue-600"><MessageSquare size={24}/></div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Pending Issues</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {feedbacks.filter(f => f.status === 'Pending').length}
                            </p>
                        </div>
                        <div className="bg-yellow-100 p-3 rounded-full text-yellow-600"><Clock size={24}/></div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Avg. Rating</p>
                            <p className="text-2xl font-bold text-green-600">
                                {(feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / (feedbacks.length || 1)).toFixed(1)}
                            </p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-full text-green-600"><Star size={24}/></div>
                    </div>
                </div>

                {/* Filters & Search Bar */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search user or comment..." 
                                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="relative">
                            <select 
                                className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="All">All Statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Reviewed">Reviewed</option>
                                <option value="Addressed">Addressed</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                        </div>

                         {/* Rating Filter */}
                         <div className="relative">
                            <select 
                                className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                value={filterRating}
                                onChange={(e) => setFilterRating(e.target.value)}
                            >
                                <option value="All">All Ratings</option>
                                <option value="5">5 Stars</option>
                                <option value="4">4 Stars</option>
                                <option value="3">3 Stars</option>
                                <option value="2">2 Stars</option>
                                <option value="1">1 Star</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                        </div>
                    </div>
                </div>

                {/* DATA TABLE */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating / Relevance</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr><td colSpan="6" className="text-center py-10 text-gray-500">Loading feedback data...</td></tr>
                                ) : filteredFeedbacks.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-10 text-gray-500">No feedback found.</td></tr>
                                ) : (
                                    filteredFeedbacks.map((fb) => (
                                        <tr key={fb.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(fb.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {isGuest(fb.user_id) ? 'Guest User' : 'Registered User'}
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-mono truncate w-24" title={fb.user_id}>
                                                        {fb.user_id}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex text-yellow-400">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} size={14} fill={i < fb.rating ? "currentColor" : "none"} stroke={i < fb.rating ? "none" : "currentColor"} className="text-gray-300" />
                                                        ))}
                                                    </div>
                                                    <span className={`text-xs inline-flex items-center gap-1 ${fb.relevant ? 'text-green-600' : 'text-red-500'}`}>
                                                        {fb.relevant ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                                                        {fb.relevant ? 'Relevant' : 'Not Relevant'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-gray-600 truncate max-w-xs">
                                                    {fb.comment || <span className="text-gray-400 italic">No comment</span>}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(fb.status)}`}>
                                                    {fb.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button 
                                                    onClick={() => setSelectedFeedback(fb)}
                                                    className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-lg"
                                                >
                                                    View / Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- FEEDBACK DETAIL MODAL --- */}
            {selectedFeedback && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">Feedback Details</h3>
                            <button onClick={() => setSelectedFeedback(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="block text-gray-500 text-xs">User Type</span>
                                    <span className="font-medium">{isGuest(selectedFeedback.user_id) ? 'Guest' : 'Registered'}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500 text-xs">Date</span>
                                    <span className="font-medium">{new Date(selectedFeedback.created_at).toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Query Info */}
                            <div className="bg-blue-50 p-3 rounded-lg">
                                <span className="block text-blue-600 text-xs font-bold uppercase">Search Query</span>
                                <p className="text-gray-800 text-sm font-medium">{selectedFeedback.query || 'N/A'}</p>
                            </div>

                            {/* Ratings */}
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                <div>
                                    <span className="block text-gray-500 text-xs mb-1">Star Rating</span>
                                    <div className="flex text-yellow-500">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={18} fill={i < selectedFeedback.rating ? "currentColor" : "none"} />
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-gray-500 text-xs mb-1">Relevance</span>
                                    <span className={`flex items-center gap-1 font-bold ${selectedFeedback.relevant ? 'text-green-600' : 'text-red-500'}`}>
                                        {selectedFeedback.relevant ? <CheckCircle size={16}/> : <XCircle size={16}/>}
                                        {selectedFeedback.relevant ? 'Relevant' : 'Not Relevant'}
                                    </span>
                                </div>
                            </div>

                            {/* Comment */}
                            <div>
                                <span className="block text-gray-500 text-xs mb-1">User Comment</span>
                                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 min-h-[80px]">
                                    {selectedFeedback.comment || "No comment provided."}
                                </div>
                            </div>

                            {/* ACTION BUTTONS (Update Status) */}
                            <div>
                                <span className="block text-gray-500 text-xs mb-2 font-bold">Update Status</span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleStatusUpdate(selectedFeedback.id, 'Pending')}
                                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                            selectedFeedback.status === 'Pending' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        Pending
                                    </button>
                                    <button 
                                        onClick={() => handleStatusUpdate(selectedFeedback.id, 'Reviewed')}
                                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                            selectedFeedback.status === 'Reviewed' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        Reviewed
                                    </button>
                                    <button 
                                        onClick={() => handleStatusUpdate(selectedFeedback.id, 'Addressed')}
                                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                            selectedFeedback.status === 'Addressed' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        Addressed
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button 
                                onClick={() => setSelectedFeedback(null)} 
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TOAST NOTIFICATION */}
            {toast.show && (
                <div className={`fixed top-20 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg transition-all duration-300 text-white ${
                    toast.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                }`}>
                    <div className="flex items-center space-x-2">
                        <span>{toast.type === 'success' ? '✓' : 'ℹ'}</span>
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbackManager;