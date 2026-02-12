import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import {
    LayoutDashboard,
    MessageSquare,
    Star,
    Activity,
    LogOut,
    Settings,
    ShieldCheck,
    ChevronDown,
    Eye,
    Search,
    ThumbsUp,
    ThumbsDown,
    Clock,
    Bookmark,
    AlertCircle,
    TrendingUp,
    BookOpen,
    CheckCircle,
    X,
    EyeOff,
    Menu,
    Calendar,
    ChevronLeft
} from "lucide-react";
import dostLogo from "./components/images/dost-logo.png";

const API_BASE_URL = 'http://localhost:8000/api';

const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toLocaleString();
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { logout, user, changePassword, updateProfile } = useAuth();

    // ---------- Tab state from URL ----------
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

    // ---------- UI State ----------
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef(null);

    // ---------- Date filter state ----------
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
            past.setFullYear(past.getFullYear() - 1);
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
        if (!customFrom || !customTo) return { from: '', to: '' };
        return { from: customFrom, to: customTo };
    };

    // ---------- Data States ----------
    const [loading, setLoading] = useState(false);
    const [analyticsData, setAnalyticsData] = useState({
        avgResponseTime: 0,
        totalBookmarks: 0,
        totalSearches: 0,
        failedQueries: [],
        topSearchQueries: [],
        mostViewedMaterials: []
    });

    // ---------- Feedback States ----------
    const [feedbacks, setFeedbacks] = useState([]);
    const [feedbackFilter, setFeedbackFilter] = useState('All');
    const [feedbackSearch, setFeedbackSearch] = useState('');

    // ---------- Material Ratings ----------
    const [materialRatings, setMaterialRatings] = useState([]);
    const [ratingsTrend, setRatingsTrend] = useState(0);

    // ---------- System Health ----------
    const [health, setHealth] = useState(null);
    const [healthLoading, setHealthLoading] = useState(false);

    // ---------- Account Settings ----------
    const [showAccountSettings, setShowAccountSettings] = useState(false);
    const [settingsTab, setSettingsTab] = useState('profile');
    const [editFullName, setEditFullName] = useState(user?.full_name || '');
    const [editUsername, setEditUsername] = useState(user?.username || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // ---------- Tab Change Handler (syncs URL) ----------
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    // ---------- Sync tab when URL changes (back/forward) ----------
    useEffect(() => {
        const urlTab = searchParams.get('tab');
        if (urlTab && ['overview', 'feedback', 'ratings', 'health'].includes(urlTab)) {
            setActiveTab(urlTab);
        }
    }, [searchParams]);

    // ---------- Fetch data when tab changes ----------
    useEffect(() => {
        if (activeTab === 'overview') fetchAnalytics();
        if (activeTab === 'feedback') fetchFeedback();
        if (activeTab === 'ratings') fetchMaterialRatings();
        if (activeTab === 'health') fetchHealth();
    }, [activeTab]);

    // ---------- Handle navigation state (toast from detail page) ----------
    useEffect(() => {
        if (location.state?.activeTab === 'feedback') {
            setActiveTab('feedback');
            setSearchParams({ tab: 'feedback' });
            window.history.replaceState({}, document.title);
        }
        if (location.state?.toast) {
            showToast(location.state.toast.message, location.state.toast.type);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // ---------- Click outside handlers ----------
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
            if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target)) {
                const isInput = event.target.tagName === 'INPUT';
                if (!isInput) setShowDateDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ---------- Update profile fields when user changes ----------
    useEffect(() => {
        if (user) {
            setEditFullName(user.full_name || '');
            setEditUsername(user.username || '');
        }
    }, [user]);

    // ---------- API: Analytics ----------
    const fetchAnalytics = async () => {
        setLoading(true);
        const { from, to } = getDateRange();
        if (selectedDate === 'Custom range' && (!from || !to)) {
            setLoading(false);
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/analytics/compact/?from=${from}&to=${to}`);
            if (res.ok) {
                const result = await res.json();
                const data = result.data || result;
                setAnalyticsData({
                    avgResponseTime: data.avg_response_time ?? data.avgResponseTime ?? 0,
                    totalBookmarks: data.total_bookmarks ?? data.totalBookmarks ?? 0,
                    totalSearches: data.total_searches ?? data.totalSearches ?? 0,
                    failedQueries: data.failed_queries ?? data.failedQueries ?? [],
                    topSearchQueries: data.top_queries ?? data.topSearchQueries ?? [],
                    mostViewedMaterials: data.top_materials ?? data.mostViewedMaterials ?? []
                });
            }
        } catch (error) {
            console.error("Failed to load analytics", error);
            showToast("Failed to load analytics", "error");
        } finally {
            setLoading(false);
        }
    };

    // ---------- API: CSM Feedback List ----------
    const fetchFeedback = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/csm-feedback/`);
            if (res.ok) {
                const data = await res.json();
                setFeedbacks(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
            }
        } catch (error) {
            console.error("Failed to load feedback", error);
        }
    };

    // ---------- API: Material Ratings ----------
    const fetchMaterialRatings = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/feedback/`);
            if (res.ok) {
                const data = await res.json();
                const ratings = data.filter(item => item.relevant !== null);
                setMaterialRatings(ratings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));

                // Calculate weekly trend
                const now = new Date();
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
                const lastWeek = ratings.filter(r => new Date(r.created_at) >= oneWeekAgo).length;
                const prevWeek = ratings.filter(r => {
                    const d = new Date(r.created_at);
                    return d >= twoWeeksAgo && d < oneWeekAgo;
                }).length;
                setRatingsTrend(lastWeek - prevWeek);
            }
        } catch (error) {
            console.error("Failed to load ratings", error);
        }
    };

    // ---------- API: System Health ----------
    const fetchHealth = async () => {
        setHealthLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/health/`);
            if (res.ok) {
                const data = await res.json();
                setHealth(data);
            }
        } catch (error) {
            console.error("Health check failed:", error);
        } finally {
            setHealthLoading(false);
        }
    };

    // ---------- Toast ----------
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    };

    // ---------- Account Handlers ----------
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSettingsLoading(true);
        try {
            const result = await updateProfile({
                full_name: editFullName,
                username: editUsername
            });
            if (result?.success) {
                showToast('Profile updated successfully!', 'success');
                setTimeout(() => setShowAccountSettings(false), 1500);
            } else {
                showToast(result?.error || 'Failed to update profile', 'error');
            }
        } catch (error) {
            showToast('An error occurred while updating profile', 'error');
        } finally {
            setSettingsLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match', 'error');
            return;
        }
        if (newPassword.length < 8) {
            showToast('Password must be at least 8 characters', 'error');
            return;
        }
        setSettingsLoading(true);
        try {
            const result = await changePassword(currentPassword, newPassword);
            if (result?.success) {
                showToast('Password changed successfully!', 'success');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setTimeout(() => setShowAccountSettings(false), 1500);
            } else {
                showToast(result?.error || 'Failed to change password', 'error');
            }
        } catch (error) {
            showToast('An error occurred while changing password', 'error');
        } finally {
            setSettingsLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    // ---------- KPI Card Component ----------
    const KPICard = ({ title, value, icon: Icon, color }) => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
                <h3 className={`text-2xl font-bold mt-1 ${color}`}>{value}</h3>
            </div>
            <div className={`p-3 rounded-full bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
                <Icon size={24} className={color} />
            </div>
        </div>
    );

    // ---------- Helper Components for Health ----------
    const HealthItem = ({ label, status }) => (
        <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{label}</span>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                status === 'ok' ? 'bg-green-100 text-green-700' : 
                status === 'failed' ? 'bg-red-100 text-red-700' : 
                'bg-gray-100 text-gray-600'
            }`}>
                {status === 'ok' ? 'Healthy' : status === 'failed' ? 'Failed' : 'Unknown'}
            </span>
        </div>
    );

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // ---------- Render ----------
    return (
        <div className="h-screen w-screen bg-gray-100 flex flex-col overflow-hidden font-sans">
            {/* ---------- Toast (top‑center) ---------- */}
            {toast.show && (
                <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-lg shadow-xl text-sm font-bold text-white animate-slideDown ${
                    toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                }`}>
                    {toast.message}
                </div>
            )}

            {/* ---------- HEADER ---------- */}
            <div className="bg-gradient-to-b from-[#404040] to-[#1F1F1F] text-white shadow-md flex-none z-50">
                <div className="flex items-center justify-between max-w-[100rem] mx-auto px-3 py-3 w-full">
                    <div className="flex items-center space-x-4">
                        <img src={dostLogo} alt="DOST Logo" className="h-12 w-auto pl-2" />
                        <div className="hidden md:block text-sm border-l border-white pl-4 ml-4 leading-tight opacity-90">
                            LitPath AI: <br /> Smart PathFinder for Theses and Dissertation
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700 shadow-sm">
                            <ShieldCheck size={16} className="text-blue-400" />
                            <span className="text-sm font-medium text-gray-200">Admin</span>
                        </div>
                        <div className="relative" ref={userMenuRef}>
                            <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 hover:bg-white/10 p-1.5 rounded transition-colors">
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
                                    <button 
                                        onClick={() => { setShowAccountSettings(true); setSettingsTab('profile'); setShowUserMenu(false); }}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Settings size={16} /> Account Settings
                                    </button>
                                    <button onClick={() => navigate('/')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                                        <Eye size={16} /> View Client Site
                                    </button>
                                    <div className="border-t border-gray-100 my-1"></div>
                                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                        <LogOut size={16} /> Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ---------- BODY ---------- */}
            <div className="flex-1 flex overflow-hidden">
                {/* ---------- SIDEBAR ---------- */}
                <aside className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-20 ${isSidebarOpen ? 'w-64' : 'w-16'}`}>
                    <div className={`h-16 flex items-center justify-center border-b border-gray-100 ${isSidebarOpen ? 'px-4' : 'p-0'}`}>
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600">
                            <Menu size={24} />
                        </button>
                    </div>
                    <nav className="flex-1 py-4 px-3 space-y-2 overflow-y-auto">
                        <button onClick={() => handleTabChange('overview')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <LayoutDashboard size={20} className="flex-shrink-0" />
                            <span className={`ml-3 text-sm whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>Overview</span>
                        </button>
                        <button onClick={() => handleTabChange('feedback')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'feedback' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <MessageSquare size={20} className="flex-shrink-0" />
                            <span className={`ml-3 text-sm whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>Feedback Manager</span>
                        </button>
                        <button onClick={() => handleTabChange('ratings')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'ratings' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <Star size={20} className="flex-shrink-0" />
                            <span className={`ml-3 text-sm whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>Material Ratings</span>
                        </button>
                        <button onClick={() => handleTabChange('health')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'health' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <Activity size={20} className="flex-shrink-0" />
                            <span className={`ml-3 text-sm whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>System Health</span>
                        </button>
                    </nav>
                    <div className={`p-4 border-t border-gray-100 text-xs text-gray-400 text-center whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 h-0 p-0'}`}>
                        © 2025 LitPath AI
                    </div>
                </aside>

                {/* ---------- MAIN CONTENT ---------- */}
                <main className="flex-1 bg-gray-50 p-6 overflow-hidden flex flex-col relative">
                    {/* ----- OVERVIEW TAB ----- */}
                    {activeTab === 'overview' && (
                        <div className="h-full flex flex-col gap-5 max-w-[1600px] mx-auto w-full">
                            {/* Date Filter Header */}
                            <div className="flex items-center justify-between flex-shrink-0 mb-2">
                                <h2 className="text-xl font-bold text-gray-800">System Insights</h2>
                                <div className="relative" ref={dateDropdownRef}>
                                    <button onClick={() => setShowDateDropdown(!showDateDropdown)} className="flex items-center space-x-2 px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-600 hover:bg-gray-50 text-xs font-medium">
                                        <Calendar size={14} /><span>{selectedDate}</span><ChevronDown size={14} />
                                    </button>
                                    {showDateDropdown && (
                                        <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-30 min-w-[220px] p-2">
                                            {dateOptions.map(opt => (
                                                <button key={opt} onClick={() => { setSelectedDate(opt); if(opt === 'Custom range') { setShowDateDropdown(true); } else { setShowDateDropdown(false); setCustomFrom(''); setCustomTo(''); fetchAnalytics(); } }} className={`block w-full text-left px-3 py-2 text-xs rounded-md ${selectedDate === opt ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-50'}`}>{opt}</button>
                                            ))}
                                            {selectedDate === 'Custom range' && (
                                                <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col gap-2">
                                                    <div className="flex flex-col"><span className="text-[10px] text-gray-500 mb-1">From</span><input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="text-xs border p-1 rounded" /></div>
                                                    <div className="flex flex-col"><span className="text-[10px] text-gray-500 mb-1">To</span><input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="text-xs border p-1 rounded" /></div>
                                                    <div className="flex flex-col gap-2 mt-2">
                                                        <button onClick={() => { if(customFrom && customTo) { fetchAnalytics(); setShowDateDropdown(false); } else { showToast('Select both dates', 'error'); } }} className="w-full bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700 transition-colors font-medium">Apply Range</button>
                                                        <button onClick={() => window.location.reload()} disabled={!customFrom && !customTo} className={`w-full text-xs py-1.5 rounded border transition-colors ${!customFrom && !customTo ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-red-600'}`}>Clear Filter</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* KPI Cards */}
                            <div className="grid grid-cols-4 gap-5 flex-none">
                                <KPICard title="Avg Loading Time" value={`${analyticsData.avgResponseTime || 0}ms`} icon={Clock} color="text-green-600" />
                                <KPICard title="Total Bookmarks" value={formatNumber(analyticsData.totalBookmarks || 0)} icon={Bookmark} color="text-purple-600" />
                                <KPICard title="Total Searches" value={formatNumber(analyticsData.totalSearches || 0)} icon={LayoutDashboard} color="text-blue-600" />
                                <KPICard title="Failed Queries" value={analyticsData.failedQueries?.length || 0} icon={AlertCircle} color="text-red-500" />
                            </div>
                            {/* Charts & Tables */}
                            <div className="flex-1 grid grid-cols-12 grid-rows-2 gap-5 min-h-0">
                                {/* System Activity Placeholder */}
                                <div className="col-span-8 row-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-gray-800">System Activity</h3>
                                    </div>
                                    <div className="flex-1 border border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
                                        <span className="text-gray-400 text-sm italic">[Chart Component Placeholder]</span>
                                    </div>
                                </div>
                                {/* Unanswered Questions */}
                                <div className="col-span-4 row-span-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 bg-red-50 flex justify-between items-center">
                                        <h3 className="font-bold text-red-800 text-sm flex items-center gap-2"><AlertCircle size={16} /> Unanswered Questions</h3>
                                        <span className="text-xs bg-white text-red-600 px-2 py-0.5 rounded border border-red-100 font-bold">{analyticsData.failedQueries?.length || 0}</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-0">
                                        <ul className="divide-y divide-gray-100">
                                            {analyticsData.failedQueries?.length > 0 ? (
                                                analyticsData.failedQueries.map((q, i) => (
                                                    <li key={i} className="p-3 hover:bg-red-50/30 transition-colors">
                                                        <p className="text-sm text-gray-700 truncate">{q.query}</p>
                                                        <p className="text-xs text-gray-400 mt-1">{q.date || 'Unknown Date'}</p>
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="p-8 text-center text-gray-400 text-sm">No failed queries detected.</li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                                {/* Top 5 Most Viewed Materials */}
                                <div className="col-span-6 row-span-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                        <h3 className="font-bold text-gray-800 text-sm">Top 5 Most Viewed Materials</h3>
                                        <BookOpen size={16} className="text-gray-400"/>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        <div className="divide-y divide-gray-100">
                                            {analyticsData.mostViewedMaterials?.map((m, i) => (
                                                <div key={i} className="p-3 hover:bg-blue-50 transition-colors flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">#{i + 1}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-800 truncate">{m.title || 'Unknown'}</p>
                                                        <p className="text-[10px] text-gray-500">{m.author || 'Unknown'}</p>
                                                    </div>
                                                    <div className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">{formatNumber(m.views)} views</div>
                                                </div>
                                            ))}
                                            {(!analyticsData.mostViewedMaterials || analyticsData.mostViewedMaterials.length === 0) && (
                                                <div className="p-8 text-center text-gray-400 text-sm">No views recorded yet.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Top 5 Search Queries */}
                                <div className="col-span-6 row-span-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                        <h3 className="font-bold text-gray-800 text-sm">Top 5 Search Queries</h3>
                                        <TrendingUp size={16} className="text-gray-400"/>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        <table className="w-full text-sm text-left">
                                            <tbody className="divide-y divide-gray-100">
                                                {analyticsData.topSearchQueries?.map((item, i) => (
                                                    <tr key={i} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-blue-600 font-medium truncate max-w-[250px]">{item.query}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-gray-600">{formatNumber(item.count)}</td>
                                                    </tr>
                                                ))}
                                                {(!analyticsData.topSearchQueries || analyticsData.topSearchQueries.length === 0) && (
                                                    <tr><td colSpan="2" className="p-8 text-center text-gray-400 text-sm">No search data available.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ----- FEEDBACK MANAGER TAB ----- */}
                    {activeTab === 'feedback' && (
                        <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-[1600px] mx-auto w-full">
                            <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center flex-none">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">CSM Feedback</h2>
                                    <p className="text-xs text-gray-500">Manage client satisfaction responses</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input 
                                            type="text" 
                                            placeholder="Search comments..." 
                                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                                            value={feedbackSearch} 
                                            onChange={(e) => setFeedbackSearch(e.target.value)} 
                                        />
                                    </div>
                                    <select 
                                        className="bg-white border border-gray-300 text-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium" 
                                        value={feedbackFilter} 
                                        onChange={(e) => setFeedbackFilter(e.target.value)}
                                    >
                                        <option value="All">All Ratings</option>
                                        <option value="5">5 Stars</option>
                                        <option value="4">4 Stars</option>
                                        <option value="3">3 Stars</option>
                                        <option value="2">2 Stars</option>
                                        <option value="1">1 Star</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Client Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rating</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User Category</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Region</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Comment</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Valid?</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Doable?</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {feedbacks.length === 0 ? (
                                            <tr><td colSpan="10" className="px-6 py-10 text-center text-gray-500 text-sm">No feedback records found.</td></tr>
                                        ) : (
                                            feedbacks
                                                .filter(fb => feedbackFilter === 'All' || fb.litpath_rating?.toString() === feedbackFilter)
                                                .filter(fb => !feedbackSearch || (fb.message_comment && fb.message_comment.toLowerCase().includes(feedbackSearch.toLowerCase())))
                                                .map((fb) => (
                                                    <tr key={fb.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                                            {new Date(fb.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                                            {fb.client_type}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center text-yellow-500">
                                                                <span className="font-bold mr-1 text-gray-700">{fb.litpath_rating}</span>
                                                                <Star size={14} fill="currentColor" />
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100 font-medium">
                                                                {fb.category || '—'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                            {fb.region || '—'}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                                            {fb.message_comment || <span className="text-gray-400 italic">No comment</span>}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                                ${fb.status === 'Resolved' ? 'bg-green-100 text-green-800' : ''}
                                                                ${fb.status === 'Reviewed' ? 'bg-blue-100 text-blue-800' : ''}
                                                                ${fb.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                                                            `}>
                                                                {fb.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            {fb.is_valid === true ? '✓ Yes' : fb.is_valid === false ? '✗ No' : '—'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            {fb.is_doable === true ? '✓ Yes' : fb.is_doable === false ? '✗ No' : '—'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <button
                                                                onClick={() => navigate(`/admin/feedback/${fb.id}`)}
                                                                className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors font-semibold text-xs"
                                                            >
                                                                View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ----- MATERIAL RATINGS TAB ----- */}
                    {activeTab === 'ratings' && (
                        <div className="h-full flex flex-col gap-4 max-w-[1600px] mx-auto w-full overflow-y-auto">
                            {/* Summary Cards - tighter gap */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-none">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Total Ratings</h3>
                                    <p className="text-2xl font-bold text-gray-800">{materialRatings.length}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">All time</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Average Rating</h3>
                                    <div className="flex items-end gap-1">
                                        <p className="text-2xl font-bold text-gray-800">
                                            {materialRatings.length > 0 
                                                ? (materialRatings.reduce((acc, r) => acc + (r.rating || 0), 0) / materialRatings.length).toFixed(1)
                                                : '0.0'}
                                        </p>
                                        <span className="text-yellow-500 mb-0.5">★</span>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Relevance</h3>
                                    <p className="text-2xl font-bold text-green-600">
                                        {materialRatings.length > 0 
                                            ? ((materialRatings.filter(r => r.relevant === true).length / materialRatings.length) * 100).toFixed(1)
                                            : '0'}%
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">positive</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Weekly Trend</h3>
                                    <p className={`text-2xl font-bold ${ratingsTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {ratingsTrend > 0 ? '+' : ''}{ratingsTrend}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">vs last week</p>
                                </div>
                            </div>

                            {/* Rating Distribution - tighter spacing */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                                <h3 className="font-bold text-gray-800 mb-3 text-sm">Rating Distribution</h3>
                                <div className="space-y-2">
                                    {[5,4,3,2,1].map(star => {
                                        const count = materialRatings.filter(r => r.rating === star).length;
                                        const percent = materialRatings.length > 0 ? (count / materialRatings.length * 100).toFixed(1) : 0;
                                        return (
                                            <div key={star} className="flex items-center gap-2 text-xs">
                                                <span className="w-10 font-medium">{star} ★</span>
                                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-yellow-400 rounded-full"
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                                <span className="w-16 text-gray-600">{count} ({percent}%)</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Recent Ratings Table - more compact */}
                            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                                <div className="p-4 border-b border-gray-100 bg-gray-50">
                                    <h3 className="font-bold text-gray-800">Content Relevance Ratings</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Based on specific material thumbs up/down actions</p>
                                </div>
                                <div className="flex-1 overflow-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Search Query</th>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Relevance</th>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Comment</th>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {materialRatings.length > 0 ? materialRatings.map((rating) => (
                                                <tr key={rating.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate" title={rating.query || 'N/A'}>
                                                        {rating.query || <span className="text-gray-400 italic">N/A</span>}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        {rating.relevant ? (
                                                            <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs font-bold border border-green-100">
                                                                <CheckCircle size={12} /> Relevant
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded text-xs font-bold border border-red-100">
                                                                <X size={12} /> Not Relevant
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-500 italic max-w-xs truncate">
                                                        "{rating.comment || <span className="text-gray-400">No comment provided</span>}"
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-500">
                                                        {new Date(rating.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="4" className="p-8 text-center text-gray-400 text-sm">No material ratings recorded.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ----- SYSTEM HEALTH TAB ----- */}
                    {activeTab === 'health' && (
                        <div className="h-full flex flex-col gap-6 max-w-[1600px] mx-auto w-full overflow-y-auto">
                            <h2 className="text-xl font-bold text-gray-800">System Health</h2>
                            
                            {healthLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                                </div>
                            ) : health ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Services Card */}
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <h3 className="text-sm font-bold text-gray-700 mb-4">Services</h3>
                                        <div className="space-y-4">
                                            <HealthItem label="Django Backend" status={health.services?.django} />
                                            <HealthItem label="Database" status={health.services?.database} />
                                        </div>
                                        <div className="mt-6 pt-4 border-t border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${health.status === 'ok' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                                <span className="text-xs font-medium text-gray-600">
                                                    Overall Status: {health.status === 'ok' ? 'Healthy' : 'Degraded'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Disk Usage Card */}
                                    {health.disk && (
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                            <h3 className="text-sm font-bold text-gray-700 mb-4">Disk Usage</h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Used</span>
                                                    <span className="font-semibold">{formatBytes(health.disk.used)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Free</span>
                                                    <span className="font-semibold">{formatBytes(health.disk.free)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Total</span>
                                                    <span className="font-semibold">{formatBytes(health.disk.total)}</span>
                                                </div>
                                                <div className="pt-3">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span>Usage</span>
                                                        <span className={health.disk.percent > 90 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                                                            {health.disk.percent}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full ${
                                                                health.disk.percent > 90 ? 'bg-red-500' : 
                                                                health.disk.percent > 75 ? 'bg-yellow-500' : 'bg-green-500'
                                                            }`}
                                                            style={{ width: `${health.disk.percent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-gray-400">
                                    Unable to fetch health status. Please ensure the backend health endpoint is configured.
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* ---------- ACCOUNT SETTINGS MODAL ---------- */}
            {showAccountSettings && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
                        <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">Account Settings</h2>
                            <button onClick={() => setShowAccountSettings(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="flex border-b border-gray-100">
                            <button onClick={() => setSettingsTab('profile')} className={`flex-1 py-3 text-sm font-medium ${settingsTab === 'profile' ? 'text-[#1E74BC] border-b-2 border-[#1E74BC]' : 'text-gray-500'}`}>Profile</button>
                            <button onClick={() => setSettingsTab('password')} className={`flex-1 py-3 text-sm font-medium ${settingsTab === 'password' ? 'text-[#1E74BC] border-b-2 border-[#1E74BC]' : 'text-gray-500'}`}>Password</button>
                        </div>
                        <div className="p-6">
                            {settingsTab === 'profile' && (
                                <form onSubmit={handleProfileSubmit} className="space-y-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase">Full Name</label><input type="text" value={editFullName} onChange={e => setEditFullName(e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm" /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase">Username</label><input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm" /></div>
                                    <button type="submit" className="w-full bg-[#1E74BC] text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700">Save Changes</button>
                                </form>
                            )}
                            {settingsTab === 'password' && (
                                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase">Current Password</label>
                                        <div className="relative">
                                            <input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm" />
                                            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 mt-0.5 text-gray-400 hover:text-gray-600">{showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase">New Password</label>
                                        <div className="relative">
                                            <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm" />
                                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 mt-0.5 text-gray-400 hover:text-gray-600">{showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase">Confirm Password</label>
                                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm" />
                                    </div>
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                        <p className="text-xs text-yellow-800">Password must be at least 8 characters long</p>
                                    </div>
                                    <button type="submit" disabled={settingsLoading} className="w-full bg-[#1E74BC] text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700">{settingsLoading ? 'Updating...' : 'Update Password'}</button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;