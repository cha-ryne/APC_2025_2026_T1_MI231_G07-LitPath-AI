import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
    Search, ChevronLeft, ChevronDown, 
    Star, CheckCircle, XCircle,
    AlertCircle
} from "lucide-react";
import dostLogo from "./components/images/dost-logo.png"; // Ensure this path is correct
import { useAuth } from "./context/AuthContext";

const API_BASE_URL = 'http://localhost:8000/api';

const FeedbackManager = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // --- STATE MANAGEMENT ---
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterRating, setFilterRating] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // Modal & Editing State
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [editForm, setEditForm] = useState({
        status: '',
        category: '',
        is_valid: null,
        validity_remarks: '',
        is_doable: null,
        feasibility_remarks: ''
    });

    // --- DATA LOADING ---
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
            // Sort by newest first
            const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setFeedbacks(sortedData);
        } catch (error) {
            console.error("Error fetching feedback:", error);
            showToast("Failed to load feedback.", "error");
        } finally {
            setLoading(false);
        }
    };

    // --- HELPER FUNCTIONS ---
    const getStatusColor = (status) => {
        switch(status) {
            case 'Resolved': return 'bg-green-100 text-green-800 border-green-200';
            case 'Reviewed': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // Pending
        }
    };

    const isGuest = (userId) => userId && userId.startsWith('guest_');

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    // --- MODAL HANDLERS ---
    const openModal = (fb) => {
        setSelectedFeedback(fb);
        // Initialize form with existing values from database
        setEditForm({
            status: fb.status || 'Pending',
            category: fb.category || '',
            is_valid: fb.is_valid,
            validity_remarks: fb.validity_remarks || '',
            is_doable: fb.is_doable,
            feasibility_remarks: fb.feasibility_remarks || ''
        });
    };

    const handleSaveChanges = async () => {
        // --- VALIDATION ---
        // 1. Check Validity Remarks
        if (editForm.is_valid !== null && (!editForm.validity_remarks || editForm.validity_remarks.trim() === "")) {
            alert("⚠️ Please provide a reason why this is valid (or invalid).");
            return;
        }
        // 2. Check Feasibility Remarks
        if (editForm.is_doable !== null && (!editForm.feasibility_remarks || editForm.feasibility_remarks.trim() === "")) {
            alert("⚠️ Please justify the feasibility.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/feedback/${selectedFeedback.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });

            if (!response.ok) throw new Error('Failed to update');

            const updatedFeedback = await response.json();

            // Update UI list immediately
            setFeedbacks(prev => prev.map(item => item.id === updatedFeedback.id ? updatedFeedback : item));
            
            showToast("Feedback updated successfully!");
            setSelectedFeedback(null); // Close modal
        } catch (error) {
            console.error("Update error:", error);
            showToast("Failed to update feedback.", "error");
        }
    };

    // --- FILTER LOGIC ---
    const filteredFeedbacks = feedbacks.filter(item => {
        const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
        const matchesRating = filterRating === 'All' || item.rating === parseInt(filterRating);
        
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
                    <button 
                        onClick={() => navigate('/admin/dashboard')}
                        className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={18} />
                        <span>Back to Dashboard</span>
                    </button>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 max-w-7xl mx-auto w-full p-6">
                
                {/* Title */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">Feedback Management</h1>
                    <p className="text-gray-500">Review, categorize, and resolve user feedback.</p>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search user or comment..." 
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <select 
                            className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </div>
                </div>

                {/* TABLE */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr><td colSpan="6" className="text-center py-10 text-gray-500">Loading...</td></tr>
                                ) : filteredFeedbacks.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-10 text-gray-500">No feedback found.</td></tr>
                                ) : (
                                    filteredFeedbacks.map((fb) => (
                                        <tr key={fb.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(fb.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">{isGuest(fb.user_id) ? 'Guest' : 'Registered'}</span>
                                                    <span className="text-xs text-gray-400 truncate w-24">{fb.user_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex text-yellow-400">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} size={14} fill={i < fb.rating ? "currentColor" : "none"} stroke={i < fb.rating ? "none" : "currentColor"} className="text-gray-300" />
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {fb.category ? (
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs border">{fb.category}</span>
                                                ) : <span className="text-gray-400 italic text-xs">Uncategorized</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(fb.status)}`}>
                                                    {fb.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button 
                                                    onClick={() => openModal(fb)}
                                                    className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-lg"
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

            {/* --- IMPROVED MODAL --- */}
            {selectedFeedback && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden max-h-[80vh] overflow-y-auto">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">Manage Feedback</h3>
                            <button onClick={() => setSelectedFeedback(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Col: Details */}
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">User Comment</label>
                                    <div className="bg-gray-50 p-4 rounded border text-sm mt-1 text-gray-700 italic">
                                        "{selectedFeedback.comment || "No comment."}"
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Search Query</label>
                                    {/* Added 'break-words' and 'whitespace-pre-wrap' so text is fully visible */}
                                    <div className="bg-blue-50 p-4 rounded-lg mt-1">
                                        <p className="text-sm font-medium text-blue-900 break-words whitespace-pre-wrap">
                                            {selectedFeedback.query || "N/A"}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Relevance</label>
                                    <div className={`flex items-center gap-1 font-bold text-sm mt-1 ${selectedFeedback.relevant ? 'text-green-600' : 'text-red-500'}`}>
                                        {selectedFeedback.relevant ? <CheckCircle size={16}/> : <XCircle size={16}/>}
                                        {selectedFeedback.relevant ? 'Relevant' : 'Not Relevant'}
                                    </div>
                                </div>
                            </div>

                            {/* Right Col: Admin Controls */}
                            <div className="space-y-6 border-l pl-0 md:pl-8 border-gray-100">
                                {/* Category */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                                    <select 
                                        className="w-full border rounded-lg p-2.5 bg-white"
                                        value={editForm.category}
                                        onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                                    >
                                        <option value="" disabled>Select Category</option>
                                        <option value="Positive">Positive</option>
                                        <option value="Issue">Issue</option>
                                        <option value="For Improvement">For Improvement</option>
                                    </select>
                                </div>

                                {/* Validity Section */}
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Is this valid?</label>
                                    <div className="flex gap-2 mb-3">
                                        <button 
                                            onClick={() => setEditForm({...editForm, is_valid: true})}
                                            className={`flex-1 py-1.5 text-sm border rounded shadow-sm ${editForm.is_valid === true ? 'bg-green-100 border-green-500 text-green-700 font-bold' : 'bg-white text-gray-600'}`}
                                        >Yes</button>
                                        <button 
                                            onClick={() => setEditForm({...editForm, is_valid: false})}
                                            className={`flex-1 py-1.5 text-sm border rounded shadow-sm ${editForm.is_valid === false ? 'bg-red-100 border-red-500 text-red-700 font-bold' : 'bg-white text-gray-600'}`}
                                        >No</button>
                                    </div>
                                    <textarea 
                                        className="w-full border rounded p-2 text-sm focus:ring-1 focus:ring-blue-500"
                                        rows="5"
                                        placeholder="Why is this valid or invalid?"
                                        value={editForm.validity_remarks}
                                        onChange={(e) => setEditForm({...editForm, validity_remarks: e.target.value})}
                                    ></textarea>
                                </div>

                                {/* Feasibility Section */}
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Is it doable?</label>
                                    <div className="flex gap-2 mb-3">
                                        <button 
                                            onClick={() => setEditForm({...editForm, is_doable: true})}
                                            className={`flex-1 py-1.5 text-sm border rounded shadow-sm ${editForm.is_doable === true ? 'bg-blue-100 border-blue-500 text-blue-700 font-bold' : 'bg-white text-gray-600'}`}
                                        >Yes</button>
                                        <button 
                                            onClick={() => setEditForm({...editForm, is_doable: false})}
                                            className={`flex-1 py-1.5 text-sm border rounded shadow-sm ${editForm.is_doable === false ? 'bg-gray-100 border-gray-500 text-gray-700 font-bold' : 'bg-white text-gray-600'}`}
                                        >No</button>
                                    </div>
                                    <textarea 
                                        className="w-full border rounded p-2 text-sm focus:ring-1 focus:ring-blue-500"
                                        rows="5"
                                        placeholder="Justify"
                                        value={editForm.feasibility_remarks}
                                        onChange={(e) => setEditForm({...editForm, feasibility_remarks: e.target.value})}
                                    ></textarea>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                                    <select 
                                        className="w-full border rounded-lg p-2.5 bg-white"
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Reviewed">Reviewed</option>
                                        <option value="Resolved">Resolved</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                            <button onClick={() => setSelectedFeedback(null)} className="px-5 py-2 bg-white border rounded-lg text-gray-700 hover:bg-gray-100 font-medium">
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveChanges} 
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md transition-all"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast.show && (
                <div className={`fixed top-20 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default FeedbackManager;