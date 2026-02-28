// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ShieldCheck, Settings, LogOut, Star, Home } from 'lucide-react';
import dostLogo from "../components/images/dost-logo.png";

const API_BASE_URL = 'http://localhost:8000/api';

const FeedbackDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });
    const [editForm, setEditForm] = useState({
        status: '',
        admin_category: '',
        is_valid: null,
        validity_remarks: '',
        is_doable: null,
        feasibility_remarks: ''
    });

    // ---------- User menu state ----------
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef(null);
    const user = {
        username: 'admin',
        full_name: 'System Administrator',
        email: 'admin@litpath.com'
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        // Clear tokens, etc.
        navigate('/');
    };

    const showLocalToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 4000);
    };

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/csm-feedback/${id}/`);
                if (!response.ok) throw new Error("Not found");
                const data = await response.json();
                setFeedback(data);
                setEditForm({
                    status: data.status || 'Pending',
                    admin_category: data.admin_category || '',
                    is_valid: data.is_valid,
                    validity_remarks: data.validity_remarks || '',
                    is_doable: data.is_doable,
                    feasibility_remarks: data.feasibility_remarks || ''
                });
            } catch (error) {
                console.error(error);
                navigate('/admin/dashboard', { state: { activeTab: 'feedback' } });
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id, navigate]);

    const handleSave = async () => {
        if (!editForm.admin_category || editForm.admin_category.trim() === '') {
            showLocalToast("⚠️ Please select a Category.");
            return;
        }
        if (!editForm.status || editForm.status.trim() === '') {
            showLocalToast("⚠️ Please select a Status.");
            return;
        }
        if (editForm.is_valid === null) {
            showLocalToast("⚠️ Please select Yes or No for 'Is this valid?'.");
            return;
        }
        if (editForm.is_doable === null) {
            showLocalToast("⚠️ Please select Yes or No for 'Is it doable?'.");
            return;
        }
        if (editForm.is_valid !== null && (!editForm.validity_remarks || editForm.validity_remarks.trim() === "")) {
            showLocalToast("⚠️ Please provide a reason why this is valid (or invalid).");
            return;
        }
        if (editForm.is_doable !== null && (!editForm.feasibility_remarks || editForm.feasibility_remarks.trim() === "")) {
            showLocalToast("⚠️ Please justify the feasibility.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/csm-feedback/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: editForm.status,
                    admin_category: editForm.admin_category,
                    is_valid: editForm.is_valid,
                    validity_remarks: editForm.validity_remarks,
                    is_doable: editForm.is_doable,
                    feasibility_remarks: editForm.feasibility_remarks
                })
            });

            if (!response.ok) throw new Error('Failed to update');

            navigate('/admin/dashboard?tab=feedback', {
                state: {
                    toast: {
                        message: 'Feedback updated successfully!',
                        type: 'success'
                    }
                }
            });
        } catch (error) {
            console.error(error);
            showLocalToast("Failed to update feedback.", "error");
        }
    };

    if (loading) return <div className="p-10 text-center text-sm text-gray-500 font-sans">Loading details...</div>;
    if (!feedback) return null;

    return (
        <div className="h-screen flex flex-col bg-gray-100 overflow-hidden font-sans relative">
            {/* Toast notification */}
            {toast.show && (
                <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-lg shadow-xl text-sm font-bold text-white animate-slideDown ${
                    toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                }`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-b from-[#555555] to-[#212121] text-white shadow-md flex-none z-50">
                <div className="flex items-center justify-between max-w-[100rem] mx-auto px-3 py-3 w-full">
                    <div className="flex items-center space-x-4">
                        <img src={dostLogo} alt="DOST Logo" className="h-12 w-auto pl-2" />
                        <div className="hidden md:block text-sm border-l border-white pl-4 ml-4 leading-tight opacity-100">
                            LitPath AI: <br /> Smart PathFinder for Theses and Dissertation
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700 shadow-sm">
                            <ShieldCheck size={16} className="text-blue-400" />
                            <span className="text-sm font-medium text-gray-200">Admin</span>
                        </div>
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 hover:bg-white/10 p-1.5 rounded transition-colors"
                            >
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md border border-white/20">
                                    {user?.username?.[0]?.toUpperCase() || 'A'}
                                </div>
                                <ChevronDown size={14} className="text-gray-400" />
                            </button>
                            {showUserMenu && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white text-gray-800 border border-gray-200 rounded-lg shadow-xl py-1 z-50">
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-sm font-bold">{user?.full_name || 'Admin User'}</p>
                                        <p className="text-xs text-gray-500 truncate">{user?.email || 'admin@litpath.ai'}</p>
                                    </div>
                                    {/* Home button */}
                                    <button
                                        onClick={() => {
                                            navigate('/admin/dashboard');
                                            setShowUserMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Home size={16} /> Home
                                    </button>
                                    <button
                                        onClick={() => {
                                            navigate('/admin/settings');
                                            setShowUserMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Settings size={16} /> Account Settings
                                    </button>
                                    <div className="border-t border-gray-100 my-1"></div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <LogOut size={16} /> Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ---------- MAIN CONTENT ---------- */}
            <div className="flex-1 overflow-hidden p-4 md:p-6 flex justify-center w-full">
                <div className="w-full max-w-[100rem] h-full flex flex-col">

                    {/* Back button */}
                    <div className="mb-4 flex-none">
                        <button
                            onClick={() => navigate('/admin/dashboard?tab=feedback')}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm text-gray-700 font-medium transition-all shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-gray-400"
                        >
                            <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                            <span>Back to Feedback Manager</span>
                        </button>
                    </div>

                    {/* ID & Date Row */}
                    <div className="flex justify-between items-end mb-4 flex-none px-1">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Review Feedback</h1>
                            <p className="text-xs text-gray-500 mt-1 font-mono uppercase tracking-wide">ID: {id}</p>
                        </div>
                        <span className="text-xs text-gray-600 font-medium bg-white px-3 py-1.5 rounded border border-gray-300 shadow-sm">
                            Submitted: {new Date(feedback.created_at).toLocaleString()}
                        </span>
                    </div>

                    {/* Two Column Layout */}
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                        
                        {/* Left Column */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50">
                                <h3 className="text-l font-bold text-gray-800">Client Feedback</h3>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5">
                                {/* Data Privacy Consent */}
                                <div className="flex-none">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                                        Data Privacy Consent
                                    </label>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
                                        {feedback.consent_given ? (
                                            <span className="text-green-700 font-medium">✓ Consent given</span>
                                        ) : (
                                            <span className="text-red-600 font-medium">✗ Consent not given</span>
                                        )}
                                    </div>
                                </div>

                                {/* Client Profile */}
                                <div className="flex-none">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                                        Client Profile
                                    </label>
                                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
                                        <span className="text-gray-600">Client Type:</span>
                                        <span className="font-medium">{feedback.client_type || '—'}</span>
                                        <span className="text-gray-600">Date of Interaction:</span>
                                        <span className="font-medium">{feedback.date || '—'}</span>
                                        <span className="text-gray-600">Sex:</span>
                                        <span className="font-medium">{feedback.sex || '—'}</span>
                                        <span className="text-gray-600">Age:</span>
                                        <span className="font-medium">{feedback.age || '—'}</span>
                                        <span className="text-gray-600">Region:</span>
                                        <span className="font-medium">{feedback.region || '—'}</span>
                                        <span className="text-gray-600">User Category:</span>
                                        <span className="font-medium">{feedback.category || '—'}</span>
                                    </div>
                                </div>

                                {/* Feedback & Evaluation */}
                                <div className="flex-none">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                                        Feedback & Evaluation
                                    </label>
                                    <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <div>
                                            <span className="text-gray-600 text-sm">LitPath AI Rating:</span>
                                            <div className="flex items-center mt-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        size={20}
                                                        className={`${
                                                            feedback.litpath_rating >= star
                                                                ? 'text-yellow-400 fill-yellow-400'
                                                                : 'text-gray-300'
                                                        } mr-1`}
                                                    />
                                                ))}
                                                <span className="ml-2 text-sm font-medium">
                                                    {feedback.litpath_rating ? `${feedback.litpath_rating}/5` : 'No rating'}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-600 text-sm">Research Interests:</span>
                                            <p className="mt-1 text-sm bg-white p-3 rounded border border-gray-200">
                                                {feedback.research_interests || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-600 text-sm">Missing Content:</span>
                                            <p className="mt-1 text-sm bg-white p-3 rounded border border-gray-200">
                                                {feedback.missing_content || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-600 text-sm">Message / Comment:</span>
                                            <p className="mt-1 text-sm bg-white p-3 rounded border border-gray-200">
                                                {feedback.message_comment || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column (Analysis & Action) */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50">
                                <h3 className="text-l font-bold text-gray-800">Analysis & Action</h3>
                            </div>

                            <div className="p-4 flex-1 overflow-y-auto space-y-6">
                                {/* Admin Category */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Category <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        className="w-full border-gray-300 border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
                                        value={editForm.admin_category}
                                        onChange={(e) => setEditForm({ ...editForm, admin_category: e.target.value })}
                                    >
                                        <option value="" disabled>Select Category</option>
                                        <option value="General">General</option>
                                        <option value="Positive">Positive</option>
                                        <option value="Issue">Issue / Bug</option>
                                        <option value="For Improvement">For Improvement</option>
                                    </select>
                                </div>

                                {/* Is this valid? */}
                                <div className="p-5 rounded-xl border border-gray-200 bg-gray-50/50 shadow-sm">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Is this valid? <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-3 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => setEditForm({ ...editForm, is_valid: true })}
                                            className={`flex-1 py-2 text-sm font-semibold border rounded-lg transition-all ${
                                                editForm.is_valid === true
                                                    ? 'bg-green-600 text-white border-green-600 shadow-md transform scale-[1.02]'
                                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditForm({ ...editForm, is_valid: false })}
                                            className={`flex-1 py-2 text-sm font-semibold border rounded-lg transition-all ${
                                                editForm.is_valid === false
                                                    ? 'bg-red-600 text-white border-red-600 shadow-md transform scale-[1.02]'
                                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            No
                                        </button>
                                    </div>
                                    <textarea
                                        className="w-full border-gray-300 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                        placeholder="Remarks (required) – explain why valid or invalid..."
                                        rows="5"
                                        value={editForm.validity_remarks}
                                        onChange={(e) => setEditForm({ ...editForm, validity_remarks: e.target.value })}
                                    />
                                </div>

                                {/* Is it doable? */}
                                <div className="p-5 rounded-xl border border-gray-200 bg-gray-50/50 shadow-sm">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Is it doable? <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-3 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => setEditForm({ ...editForm, is_doable: true })}
                                            className={`flex-1 py-2 text-sm font-semibold border rounded-lg transition-all ${
                                                editForm.is_doable === true
                                                    ? 'bg-green-600 text-white border-green-600 shadow-md transform scale-[1.02]'
                                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditForm({ ...editForm, is_doable: false })}
                                            className={`flex-1 py-2 text-sm font-semibold border rounded-lg transition-all ${
                                                editForm.is_doable === false
                                                    ? 'bg-red-600 text-white border-red-600 shadow-md transform scale-[1.02]'
                                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            No
                                        </button>
                                    </div>
                                    <textarea
                                        className="w-full border-gray-300 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                        placeholder="Justification (required) – explain feasibility..."
                                        rows="5"
                                        value={editForm.feasibility_remarks}
                                        onChange={(e) => setEditForm({ ...editForm, feasibility_remarks: e.target.value })}
                                    />
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Status <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        className="w-full border-gray-300 border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                    >
                                        <option value="" disabled>Select Status</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Reviewed">Reviewed</option>
                                        <option value="Resolved">Resolved</option>
                                    </select>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="p-3.5 border-t border-gray flex gap-4 justify-end">
                                <button
                                    onClick={() => navigate('/admin/dashboard?tab=feedback')}
                                    className="px-5 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-8 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md transition-all"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeedbackDetail;