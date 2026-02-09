import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
    Search, ChevronLeft, ChevronDown, 
    ThumbsUp, ThumbsDown, ShieldCheck
} from "lucide-react";
import dostLogo from "./components/images/dost-logo.png"; 
import { useAuth } from "./context/AuthContext";

const API_BASE_URL = 'http://localhost:8000/api';

const FeedbackManager = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // --- STATE ---
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterRating, setFilterRating] = useState('All'); 
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchFeedback();
    }, []);

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/feedback/`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error('Failed to fetch feedback');
            const data = await response.json();
            const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setFeedbacks(sortedData);
        } catch (error) {
            console.error("Error fetching feedback:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'Resolved': return 'bg-green-100 text-green-800 border-green-200';
            case 'Reviewed': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-yellow-100 text-yellow-800 border-yellow-200'; 
        }
    };

    const isGuest = (userId) => userId && userId.startsWith('guest_');

    const filteredFeedbacks = feedbacks.filter(item => {
        const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
        let matchesRating = true;
        if (filterRating === 'Positive') matchesRating = item.relevant === true;
        if (filterRating === 'Negative') matchesRating = item.relevant === false;
        
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = (item.comment && item.comment.toLowerCase().includes(searchLower)) || 
                              (item.user_id && item.user_id.toLowerCase().includes(searchLower));
                              
        return matchesStatus && matchesRating && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
            
            {/* --- HEADER --- */}
            <div className="sticky top-0 left-0 right-0 z-40 bg-gradient-to-b from-[#404040] to-[#1F1F1F] text-white shadow-md">
                <div className="flex items-center justify-between max-w-[100rem] mx-auto px-3 py-3 w-full">
                    <div className="flex items-center space-x-4">
                        <img src={dostLogo} alt="DOST Logo" className="h-12 w-auto" />
                        
                        <div className="hidden md:block text-sm border-l border-white pl-4 ml-4 leading-tight opacity-90">
                            LitPath AI: <br /> Smart PathFinder for Theses and Dissertation
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700 shadow-sm">
                            <ShieldCheck size={16} className="text-blue-400" />
                            <span className="text-sm font-medium text-gray-200">Admin</span>
                        </div>
                        <button 
                            onClick={() => navigate('/admin/dashboard')}
                            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                        >
                            <ChevronLeft size={18} />
                            <span>Dashboard</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 w-full max-w-[100rem] mx-auto p-4 md:p-6">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">Feedback Management</h1>
                    <p className="text-gray-500 mt-1">Review, categorize, and resolve user feedback.</p>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search user or comment..." 
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <select 
                            className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-sm font-medium"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="All">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Reviewed">Reviewed</option>
                            <option value="Resolved">Resolved</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </div>

                    <div className="relative">
                        <select 
                            className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-sm font-medium"
                            value={filterRating}
                            onChange={(e) => setFilterRating(e.target.value)}
                        >
                            <option value="All">All Ratings</option>
                            <option value="Positive">Positive (Thumbs Up)</option>
                            <option value="Negative">Negative (Thumbs Down)</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </div>
                </div>

                {/* TABLE */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Date</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">User</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Rating</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Category</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr><td colSpan="6" className="text-center py-10 text-gray-500 font-medium">Loading...</td></tr>
                                ) : filteredFeedbacks.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-10 text-gray-500 font-medium">No feedback found.</td></tr>
                                ) : (
                                    filteredFeedbacks.map((fb) => (
                                        <tr key={fb.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                                {new Date(fb.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-800">{isGuest(fb.user_id) ? 'Guest' : 'Registered'}</span>
                                                    <span className="text-xs text-gray-400 truncate w-24 font-mono">{fb.user_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {/* UPDATED: Changed text-sm to text-xs and font-bold to font-semibold */}
                                                {fb.relevant ? (
                                                    <span className="flex items-center text-green-700 gap-1.5 text-xs font-semibold bg-green-50 px-2.5 py-1 rounded-md w-fit border border-green-200">
                                                        <ThumbsUp size={14} strokeWidth={2.5} /> Helpful
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center text-red-600 gap-1.5 text-xs font-semibold bg-red-50 px-2.5 py-1 rounded-md w-fit border border-red-200">
                                                        <ThumbsDown size={14} strokeWidth={2.5} /> Not Helpful
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {fb.category ? (
                                                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded text-xs border font-medium">{fb.category}</span>
                                                ) : <span className="text-gray-400 italic text-xs">Uncategorized</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(fb.status)}`}>
                                                    {fb.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button 
                                                    onClick={() => navigate(`/admin/feedback/${fb.id}`)}
                                                    className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors font-medium text-sm"
                                                >
                                                    Manage
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

             {/* Footer */}
             <div className="bg-gray-200 py-4 text-center text-gray-500 text-[10px] flex-none border-t border-gray-200 mt-auto">
                <p>© 2025 DOST-STII Science and Technology Information Institute</p>
            </div>
        </div>
    );
};

export default FeedbackManager;