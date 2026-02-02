//Version v2.5

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import {
    LogOut,
    Bookmark,
    BookOpen,
    TrendingUp,
    Clock,
    AlertCircle,
    Settings,
    Eye,
    EyeOff,
    Trash2,
    Key,
    RefreshCw,
    ChevronDown,
    MessageSquare
} from "lucide-react";
import dostLogo from "./components/images/dost-logo.png";

const API_BASE_URL = 'http://localhost:8000/api';

const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString();
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { logout, user, changePassword, deleteAccount } = useAuth();

    // ─── Date filter state ──────────────────────────────────────────────────
    const dateOptions = ['All dates', 'Last week', 'Last month', 'Custom range'];
    const [selectedDate, setSelectedDate] = useState('All dates');
    const [showDateDropdown, setShowDateDropdown] = useState(false);
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const dateDropdownRef = useRef(null);

    
    const getDateRange = () => {
        const today = new Date();
        const fmt = (d) => d.toISOString().split('T')[0];

        if (selectedDate === 'All dates') {
            const past = new Date();
            past.setFullYear(past.getFullYear() - 10);
            return { from: fmt(past), to: fmt(today) };
        }
        if (selectedDate === 'Last week') {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            return { from: fmt(d), to: fmt(today) };
        }
        if (selectedDate === 'Last month') {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            return { from: fmt(d), to: fmt(today) };
        }
        // Custom range - empty by default
        if (!customFrom || !customTo) {
            return { from: '', to: '' };
        }
        return { from: customFrom, to: customTo };
    };

    
    useEffect(() => {
        const handler = (e) => {
            if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target)) {
                setShowDateDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ─── Account Settings state ─────────────────────────────────────────────
    const [showAccountSettings, setShowAccountSettings] = useState(false);
    const [settingsTab, setSettingsTab] = useState('password');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showDeletePassword, setShowDeletePassword] = useState(false);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // ─── Analytics data state ───────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState({
        topSearchQueries: [],
        avgResponseTime: 0,
        failedQueries: [],
        totalBookmarks: 0,
        bookmarkFrequency: [],
        mostViewedMaterials: [],
        criticalFeedback: []
    });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    // Auto-refresh when custom dates are both set
    useEffect(() => {
        if (selectedDate === 'Custom range' && customFrom && customTo) {
            fetchAnalyticsData();
        }
    }, [customFrom, customTo]);

    const fetchAnalyticsData = async () => {
        setLoading(true);
        const { from, to } = getDateRange();

        
        if (selectedDate === 'Custom range' && (!from || !to)) {
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/analytics/compact/?from=${from}&to=${to}`
            );
            const data = await response.json();
            if (data.success) {
                setAnalyticsData((prev) => ({ ...prev, ...data.data }));
            } else {
                showToast('Failed to load analytics data', 'error');
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            showToast('Failed to load analytics data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    const handlePasswordSubmit = async (e) => {
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
    };

    const handleDeleteSubmit = async (e) => {
        e.preventDefault();
        if (!window.confirm('Are you absolutely sure you want to delete your account? This cannot be undone.')) {
            return;
        }
        setSettingsLoading(true);
        const result = await deleteAccount(deletePassword);
        setSettingsLoading(false);
        if (result.success) {
            showToast('Account deleted successfully', 'success');
            navigate('/');
        } else {
            showToast(result.error || 'Failed to delete account', 'error');
        }
    };

    // Convert seconds to minutes for display
    const formatResponseTime = (seconds) => {
        const minutes = (seconds / 60).toFixed(2);
        return minutes;
    };

    // ─── Loading screen ─────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw size={48} className="animate-spin text-[#1E74BC] mx-auto mb-4" />
                    <p className="text-gray-700 text-lg">Loading analytics…</p>
                </div>
            </div>
        );
    }

    // ─── RENDER ─────────────────────────────────────────────────────────────
    return (
        <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col overflow-hidden">

            {/* ── Header ──────────────────────── */}
            <div className="bg-[#2c2c2c] text-white p-4 shadow-md flex-shrink-0">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center space-x-4">
                        <img src={dostLogo} alt="Department of Science and Technology" className="h-16 w-auto" />
                        <div className="text-sm border-l border-white pl-4 ml-4">
                            LitPath AI: <br /> Smart PathFinder of Theses and Dissertation
                        </div>
                    </div>
                    <nav className="flex items-center space-x-6">
                        <a 
                            href="http://scinet.dost.gov.ph/#/opac" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:text-blue-200 transition-colors"
                        >
                            Online Public Access Catalog
                        </a>
                        <Link to="/search" className="font-bold text-blue-200">LitPath AI</Link>
                    </nav>
                </div>
            </div>

            {/* ── Control Bar ───────── */}
            <div className="flex-shrink-0 max-w-7xl mx-auto w-full px-6 py-4 mt-2">
                <div className="flex justify-between items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-800">Welcome, Librarian!</h1>
                    
                    <div className="flex items-center gap-2">
                        {/* Date filter dropdown */}
                        <div className="relative" ref={dateDropdownRef}>
                            <button
                                onClick={() => setShowDateDropdown(!showDateDropdown)}
                                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors text-sm shadow-sm"
                            >
                                <span>{selectedDate}</span>
                                <ChevronDown size={16} />
                            </button>

                            {showDateDropdown && (
                                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[180px]">
                                    {dateOptions.map((opt) => (
                                        <button
                                            key={opt}
                                            className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-800 text-sm transition-colors"
                                            onClick={() => {
                                                setSelectedDate(opt);
                                                setShowDateDropdown(false);
                                                if (opt !== 'Custom range') {
                                                    setCustomFrom('');
                                                    setCustomTo('');
                                                }
                                            }}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Custom date range */}
                        {selectedDate === 'Custom range' && (
                            <>
                                <label className="text-sm text-gray-700 font-medium">From:</label>
                                <input
                                    type="date"
                                    value={customFrom}
                                    onChange={(e) => setCustomFrom(e.target.value)}
                                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                />
                                <label className="text-sm text-gray-700 font-medium">To:</label>
                                <input
                                    type="date"
                                    value={customTo}
                                    onChange={(e) => setCustomTo(e.target.value)}
                                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                />
                            </>
                        )}

                        <button
                            onClick={() => fetchAnalyticsData()}
                            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition duration-150 text-sm font-medium"
                        >
                            <RefreshCw size={16} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── 6-Panel Grid (fills remaining height, no scroll) ────────── */}
            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pb-16 overflow-hidden" style={{ minHeight: 0 }}>
                <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                     style={{ gridTemplateRows: '1.2fr 1fr' }}>

                    {/* ─── 1. Top Search Queries (row 1, col 1) ──────────── */}
                    <div className="bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
                        <div className="flex items-center space-x-2 px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
                            <TrendingUp className="text-blue-600" size={18} />
                            <span className="font-semibold text-gray-700 text-sm">Top Search Queries</span>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-3">
                            {analyticsData.topSearchQueries.length > 0 ? (
                                <ul className="space-y-2">
                                    {analyticsData.topSearchQueries.slice(0, 5).map((q, i) => (
                                        <li key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5 hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                                                <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white font-bold rounded-full text-xs flex-shrink-0">
                                                    {i + 1}
                                                </span>
                                                <span className="text-gray-800 text-sm truncate">{q.query}</span>
                                            </div>
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ml-2">
                                                {formatNumber(q.count)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-400 text-sm text-center py-8">No search data available</p>
                            )}
                        </div>
                    </div>


                    <div className="flex flex-col gap-4 overflow-hidden">

                        {/* 2. Average Response Time */}
                        <div className="bg-white rounded-xl shadow-lg flex flex-col flex-1 overflow-hidden">
                            <div className="flex items-center space-x-2 px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
                                <Clock className="text-green-600" size={18} />
                                <span className="font-semibold text-gray-700 text-sm">Avg Response Time</span>
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center px-4">
                                <p className="text-3xl font-bold text-green-600">
                                    {formatResponseTime(analyticsData.avgResponseTime)}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">minutes</p>
                            </div>
                        </div>

                        {/* 4. Bookmark Activity */}
                        <div className="bg-white rounded-xl shadow-lg flex flex-col flex-1 overflow-hidden">
                            <div className="flex items-center space-x-2 px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
                                <Bookmark className="text-purple-600" size={18} />
                                <span className="font-semibold text-gray-700 text-sm">Bookmark Activity</span>
                            </div>
                            <div className="flex-1 flex flex-col justify-center items-center px-4">
                                <p className="text-3xl font-bold text-purple-600 text-center">
                                    {formatNumber(analyticsData.totalBookmarks)}
                                </p>
                                <p className="text-sm text-gray-500 mt-1 text-center">Total Bookmarks</p>
                            </div>
                        </div>
                    </div>

                    {/* ─── 3. Failed Queries (row 1, col 3) ───────────────── */}
                    <div className="bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
                        <div className="flex items-center space-x-2 px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
                            <AlertCircle className="text-red-500" size={18} />
                            <span className="font-semibold text-gray-700 text-sm">Failed Queries</span>
                            {analyticsData.failedQueries.length > 0 && (
                                <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
                                    {analyticsData.failedQueries.length}
                                </span>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-3">
                            {analyticsData.failedQueries.length > 0 ? (
                                <ul className="space-y-2">
                                    {analyticsData.failedQueries.map((q, i) => (
                                        <li key={i} className="border-l-4 border-red-400 pl-3 py-2 bg-red-50 rounded-r-lg hover:bg-red-100 transition-colors">
                                            <p className="font-medium text-gray-800 text-sm truncate">{q.query}</p>
                                            <p className="text-gray-500 text-xs mt-1">
                                                {q.date} · {q.reason}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-400 text-sm text-center py-8">No failed queries</p>
                            )}
                        </div>
                    </div>

                    {/* ─── 5. Most Accessed Materials (row 2, col 1–2) ───── */}
                    <div className="bg-white rounded-xl shadow-lg flex flex-col overflow-hidden lg:col-span-2">
                        <div className="flex items-center space-x-2 px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
                            <BookOpen className="text-indigo-600" size={18} />
                            <span className="font-semibold text-gray-700 text-sm">Most Accessed Materials</span>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-3">
                            {analyticsData.mostViewedMaterials.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 h-full">
                                    {analyticsData.mostViewedMaterials.slice(0, 5).map((m, i) => (
                                        <div key={i} className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200 p-3 flex flex-col hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between mb-2">
                                                <span className="flex items-center justify-center w-6 h-6 bg-indigo-600 text-white font-bold rounded-full text-xs flex-shrink-0">
                                                    {i + 1}
                                                </span>
                                                <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-semibold">
                                                    {formatNumber(m.views)} views
                                                </span>
                                            </div>
                                            <h4 className="font-semibold text-gray-800 text-sm flex-1 line-clamp-2 leading-snug mb-2">
                                                {m.title}
                                            </h4>
                                            <p className="text-xs text-gray-500">
                                                {m.author} · {m.year}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm text-center py-8">No material views recorded</p>
                            )}
                        </div>
                    </div>

                    {/* ─── 6. Critical Feedback & Issues (row 2, col 3) ──── */}
                    <div className="bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
                        <div className="flex items-center space-x-2 px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
                            <MessageSquare className="text-indigo-600" size={18} />
                            <span className="font-semibold text-gray-700 text-sm">Critical Feedback & Issues</span>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col">
                            {analyticsData.criticalFeedback && analyticsData.criticalFeedback.length > 0 ? (
                                <>
                                    <ul className="text-sm space-y-3 flex-1">
                                        {analyticsData.criticalFeedback.slice(0, 3).map((item, i, arr) => (
                                            <li
                                                key={i}
                                                className={`${i < arr.length - 1 ? 'border-b border-gray-100 pb-2' : ''} text-gray-700`}
                                            >
                                                <p className="font-medium">{item.query || item.comment || '(no details)'}</p>
                                                <p className="text-xs text-gray-500">{item.date}</p>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* View All Feedback link */}
                                    <div className="mt-3 pt-2 border-t border-gray-100 text-center flex-shrink-0">
                                        <Link
                                            to="/admin/feedback"
                                            className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                                        >
                                            View All Feedback →
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-gray-400 text-sm flex-1 flex items-center justify-center">No critical feedback recorded</p>

                                    <div className="mt-3 pt-2 border-t border-gray-100 text-center flex-shrink-0">
                                        <Link
                                            to="/admin/feedback"
                                            className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                                        >
                                            View All Feedback →
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Toast ───────────────────────────────────────────────────── */}
            {toast.show && (
                <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm text-white ${
                    toast.type === 'success' ? 'bg-green-500' :
                    toast.type === 'error' ? 'bg-red-500' : 'bg-blue-600'
                }`}>
                    {toast.message}
                </div>
            )}

            {/* ── Bottom Action Buttons ───────────────────────────────────── */}
            <div className="fixed bottom-6 right-6 z-50 flex space-x-3">
                <button
                    onClick={() => { setShowAccountSettings(true); setSettingsTab('password'); }}
                    className="flex items-center space-x-2 bg-gray-700 text-white px-5 py-3 rounded-full hover:bg-gray-600 transition-all shadow-xl font-semibold text-sm"
                >
                    <Settings size={18} />
                    <span>Account Settings</span>
                </button>
                <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-full hover:bg-red-700 transition-all shadow-xl font-semibold text-sm"
                >
                    <LogOut size={18} />
                    <span>Log Out</span>
                </button>
            </div>

            {/* ── Account Settings Modal ──────────────────────────────────── */}
            {showAccountSettings && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Settings size={20} />
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
                                    className="text-white hover:text-gray-200 text-2xl leading-none"
                                >×</button>
                            </div>
                            <p className="text-gray-300 text-xs mt-1 truncate">Logged in as: {user?.email}</p>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b">
                            <button
                                onClick={() => setSettingsTab('password')}
                                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                                    settingsTab === 'password'
                                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <Key size={16} /> Change Password
                            </button>
                            <button
                                onClick={() => setSettingsTab('delete')}
                                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                                    settingsTab === 'delete'
                                        ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <Trash2 size={16} /> Delete Account
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            {settingsTab === 'password' && (
                                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                        <div className="relative">
                                            <input
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 text-sm"
                                                required
                                            />
                                            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                        <div className="relative">
                                            <input
                                                type={showNewPassword ? 'text' : 'password'}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 text-sm"
                                                required
                                                minLength={6}
                                            />
                                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={settingsLoading}
                                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                                    >
                                        {settingsLoading ? (<><RefreshCw size={16} className="animate-spin" /> Changing…</>) : (<><Key size={16} /> Change Password</>)}
                                    </button>
                                </form>
                            )}

                            {settingsTab === 'delete' && (
                                <div className="space-y-4">
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <h3 className="text-red-800 font-semibold text-sm mb-2">⚠️ Warning</h3>
                                        <p className="text-red-700 text-sm">
                                            This action is <strong>permanent and cannot be undone</strong>.
                                            All your data including bookmarks, research history, and feedback will be deleted.
                                        </p>
                                    </div>
                                    <form onSubmit={handleDeleteSubmit}>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Enter your password to confirm</label>
                                                <div className="relative">
                                                    <input
                                                        type={showDeletePassword ? 'text' : 'password'}
                                                        value={deletePassword}
                                                        onChange={(e) => setDeletePassword(e.target.value)}
                                                        placeholder="Your password"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent pr-10 text-sm"
                                                        required
                                                    />
                                                    <button type="button" onClick={() => setShowDeletePassword(!showDeletePassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                        {showDeletePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={settingsLoading || !deletePassword}
                                                className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                                            >
                                                {settingsLoading ? (<><RefreshCw size={16} className="animate-spin" /> Deleting…</>) : (<><Trash2 size={16} /> Delete My Account</>)}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;

