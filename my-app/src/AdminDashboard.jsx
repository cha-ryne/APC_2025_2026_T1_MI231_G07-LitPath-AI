import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import {
    LayoutDashboard, MessageSquare, Star, LogOut, Settings,
    ShieldCheck, ChevronDown, Eye, Search, ThumbsUp, ThumbsDown,
    Clock, Bookmark, AlertCircle, TrendingUp, BookOpen, CheckCircle,
    X, EyeOff, Menu, Calendar, Users, ChevronLeft, ChevronRight,
    Trophy, Medal, Briefcase, GraduationCap, BarChart3, Copy
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
    const dateFilterOptions = ['Annual', 'Last week', 'Last month', 'Custom range'];
    const [dateFilterType, setDateFilterType] = useState('Annual');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [showDateDropdown, setShowDateDropdown] = useState(false);
    const dateDropdownRef = useRef(null);

    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let y = 2020; y <= currentYear + 1; y++) {
        yearOptions.push(y);
    }

    const getDateRange = () => {
        const today = new Date();
        const fmt = (d) => d.toISOString().split('T')[0];

        if (dateFilterType === 'Annual') {
            return { from: `${selectedYear}-01-01`, to: `${selectedYear}-12-31` };
        }
        if (dateFilterType === 'Last week') {
            const d = new Date(); d.setDate(d.getDate() - 7);
            return { from: fmt(d), to: fmt(today) };
        }
        if (dateFilterType === 'Last month') {
            const d = new Date(); d.setDate(d.getDate() - 30);
            return { from: fmt(d), to: fmt(today) };
        }
        if (dateFilterType === 'Custom range') {
            if (!customFrom || !customTo) return { from: '', to: '' };
            return { from: customFrom, to: customTo };
        }
        return { from: '', to: '' };
    };

    // ---------- Data States ----------
    const [dashboardData, setDashboardData] = useState({
        kpi: { totalDocuments: 0, failedQueriesCount: 0, totalSearches: 0, accessedDocuments: 0, utilizationPercent: 0, avgResponseTime: 0 },
        trendingTopics: [],
        topTheses: [],
        usageByCategory: [],
        monthlyTrends: [],
        ageDistribution: [],
        citationMonthly: [],
        citationStats: { total_copies: 0, top_cited: [] } 
    });
    const [loading, setLoading] = useState(false);

    // ---------- Feedback States ----------
    const [feedbacks, setFeedbacks] = useState([]);
    const [feedbackFilter, setFeedbackFilter] = useState('All');
    const [feedbackSearch, setFeedbackSearch] = useState('');

    // ---------- Material Ratings ----------
    const [materialRatings, setMaterialRatings] = useState([]);
    const [ratingsTrend, setRatingsTrend] = useState(0);

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

    // ---------- DASHBOARD FETCH FUNCTIONS ----------
    const fetchDashboardKPI = async () => {
        const { from, to } = getDateRange();
        if (dateFilterType === 'Custom range' && (!from || !to)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/dashboard/kpi/?from=${from}&to=${to}`);
            if (res.ok) {
                const data = await res.json();
                setDashboardData(prev => ({ ...prev, kpi: data }));
            }
        } catch (error) { console.error("KPI fetch error:", error); }
    };

    const fetchTrendingTopics = async () => {
        const { from, to } = getDateRange();
        if (dateFilterType === 'Custom range' && (!from || !to)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/dashboard/trending-topics/?from=${from}&to=${to}`);
            if (res.ok) {
                const data = await res.json();
                setDashboardData(prev => ({ ...prev, trendingTopics: data }));
            }
        } catch (error) { console.error(error); }
    };

    const fetchTopTheses = async () => {
        const { from, to } = getDateRange();
        if (dateFilterType === 'Custom range' && (!from || !to)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/dashboard/top-theses/?from=${from}&to=${to}&limit=5`);
            if (res.ok) {
                const data = await res.json();
                setDashboardData(prev => ({ ...prev, topTheses: data.materials || [] }));
            }
        } catch (error) { console.error(error); }
    };

    const fetchUsageByCategory = async () => {
        const { from, to } = getDateRange();
        if (dateFilterType === 'Custom range' && (!from || !to)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/dashboard/usage-by-category/?from=${from}&to=${to}`);
            if (res.ok) {
                const data = await res.json();
                setDashboardData(prev => ({ ...prev, usageByCategory: data }));
            }
        } catch (error) { console.error(error); }
    };

    const fetchMonthlyTrends = async () => {
        const { from, to } = getDateRange();
        if (!from || !to) return;
        try {
            const res = await fetch(`${API_BASE_URL}/dashboard/monthly-trends/?from=${from}&to=${to}`);
            if (res.ok) {
                const data = await res.json();
                setDashboardData(prev => ({ ...prev, monthlyTrends: data }));
            }
        } catch (error) { console.error(error); }
    };

    const fetchAgeDistribution = async () => {
        const { from, to } = getDateRange();
        if (dateFilterType === 'Custom range' && (!from || !to)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/dashboard/age-distribution/?from=${from}&to=${to}`);
            if (res.ok) {
                const data = await res.json();
                setDashboardData(prev => ({ ...prev, ageDistribution: data }));
            }
        } catch (error) { console.error(error); }
    };

    const fetchFailedQueriesCount = async () => {
        const { from, to } = getDateRange();
        if (dateFilterType === 'Custom range' && (!from || !to)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/dashboard/failed-queries-count/?from=${from}&to=${to}`);
            if (res.ok) {
                const data = await res.json();
                setDashboardData(prev => ({ ...prev, failedQueriesCount: data.total }));
            }
        } catch (error) { console.error(error); }
    };

    const fetchCitationStats = async () => {
        const { from, to } = getDateRange();
        if (dateFilterType === 'Custom range' && (!from || !to)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/dashboard/citation-stats/?from=${from}&to=${to}`);
            if (res.ok) {
                const data = await res.json();
                setDashboardData(prev => ({ ...prev, citationStats: data }));
            }
        } catch (error) { console.error(error); }
    };

    const fetchCitationMonthly = async () => {
        const { from, to } = getDateRange();
        if (!from || !to) return;
        try {
            const res = await fetch(`${API_BASE_URL}/dashboard/citation-monthly/?from=${from}&to=${to}`);
            if (res.ok) {
                const data = await res.json();
                setDashboardData(prev => ({ ...prev, citationMonthly: data }));
            }
        } catch (error) { console.error(error); }
    };

    const fetchAllDashboardData = () => {
        setLoading(true);
        Promise.all([
            fetchDashboardKPI(),
            fetchTrendingTopics(), 
            fetchTopTheses(),
            fetchUsageByCategory(),
            fetchMonthlyTrends(),
            fetchAgeDistribution(),          
            fetchCitationStats(), 
            fetchCitationMonthly(),           
            fetchFailedQueriesCount(),       
        ]).finally(() => setLoading(false));
    };

    // ---------- Tab sync & data fetching ----------
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    useEffect(() => {
        const urlTab = searchParams.get('tab');
        if (urlTab && ['overview', 'feedback', 'ratings'].includes(urlTab)) {
            setActiveTab(urlTab);
        }
    }, [searchParams]);

    useEffect(() => {
        if (activeTab === 'overview') fetchAllDashboardData();
        if (activeTab === 'feedback') fetchFeedback();
        if (activeTab === 'ratings') fetchMaterialRatings();
    }, [activeTab, dateFilterType, selectedYear, customFrom, customTo]);

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

    useEffect(() => {
        if (user) {
            setEditFullName(user.full_name || '');
            setEditUsername(user.username || '');
        }
    }, [user]);

    // ---------- Feedback & Ratings ----------
    const fetchFeedback = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/csm-feedback/`);
            if (res.ok) {
                const data = await res.json();
                setFeedbacks(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
            }
        } catch (error) { console.error("Failed to load feedback", error); }
    };

    const fetchMaterialRatings = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/feedback/`);
            if (res.ok) {
                const data = await res.json();
                const ratings = data.filter(item => item.relevant !== null);
                setMaterialRatings(ratings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));

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
        } catch (error) { console.error("Failed to load ratings", error); }
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
            const result = await updateProfile({ full_name: editFullName, username: editUsername });
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

    // Helper for Rank Icons
    const getRankIcon = (index) => {
        if (index === 0) return (
            <div className="bg-yellow-100 p-1.5 rounded-full border border-yellow-200 shadow-sm">
                <Trophy size={16} className="text-yellow-600"/>
            </div>
        );
        if (index === 1) return (
            <div className="bg-gray-100 p-1.5 rounded-full border border-gray-200 shadow-sm">
                <Medal size={16} className="text-gray-500" />
            </div>
        );
        if (index === 2) return (
            <div className="bg-orange-100 p-1.5 rounded-full border border-orange-200 shadow-sm">
                <Medal size={16} className="text-orange-600" />
            </div>
        );
        return (
            <div className="w-8 h-8 flex items-center justify-center font-bold text-gray-400 text-sm bg-gray-50 rounded-full border border-gray-100">
                #{index + 1}
            </div>
        );
    };

    // ---------- Render ----------
    return (
        <div className="h-screen w-screen bg-gray-100 flex flex-col overflow-hidden font-sans">
            {/* Toast */}
            {toast.show && (
                <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-lg shadow-xl text-sm font-bold text-white animate-slideDown ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
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
                                    <button onClick={() => { setShowAccountSettings(true); setSettingsTab('profile'); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
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

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar - EXACT ORIGINAL STYLE */}
                <aside className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-20 ${isSidebarOpen ? 'w-64' : 'w-16'}`}>
                    <div className={`h-16 flex items-center border-b border-gray-100 ${isSidebarOpen ? 'justify-end px-4' : 'justify-center p-0'
                        }`}>
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
                    </nav>
                    <div className={`p-4 border-t border-gray-100 text-xs text-gray-400 text-center whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 h-0 p-0'}`}>
                        © 2025 LitPath AI
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 bg-gray-50 p-4 overflow-hidden flex flex-col relative">
                    {/* ===== OVERVIEW TAB ===== */}
                    {activeTab === 'overview' && (
                        <div className="h-full overflow-y-auto pr-1">
                            <div className="max-w-[1600px] mx-auto w-full flex flex-col gap-2">

                                {/* ===== HEADER + DATE FILTER ===== */}
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-gray-800">Thesis & Dissertation Usage</h2>
                                    {/* Date Filter Dropdown */}
                                    <div className="relative" ref={dateDropdownRef}>
                                        <button
                                            onClick={() => setShowDateDropdown(!showDateDropdown)}
                                            className="flex items-center space-x-2 px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-600 hover:bg-gray-50 text-xs font-medium"
                                        >
                                            <Calendar size={14} />
                                            <span>
                                                {dateFilterType === 'Annual' && `Annual ${selectedYear}`}
                                                {dateFilterType === 'Last week' && 'Last week'}
                                                {dateFilterType === 'Last month' && 'Last month'}
                                                {dateFilterType === 'Custom range' && 'Custom range'}
                                            </span>
                                            <ChevronDown size={14} />
                                        </button>

                                        {showDateDropdown && (
                                            <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-30 min-w-[260px] p-3">
                                                {/* Filter type options */}
                                                {dateFilterOptions.map(opt => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => {
                                                            setDateFilterType(opt);
                                                            if (opt === 'Last week' || opt === 'Last month') {
                                                                fetchAllDashboardData();
                                                                setShowDateDropdown(false);
                                                            }
                                                            if (opt !== 'Custom range') {
                                                                setCustomFrom('');
                                                                setCustomTo('');
                                                            }
                                                        }}
                                                        className={`block w-full text-left px-3 py-2 text-xs rounded-md ${
                                                            dateFilterType === opt
                                                                ? 'bg-blue-50 text-blue-600 font-bold'
                                                                : 'hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}

                                                {/* Annual year picker */}
                                                {dateFilterType === 'Annual' && (
                                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                                        <label className="block text-[10px] font-medium text-gray-500 mb-1">
                                                            Select year
                                                        </label>
                                                        <select
                                                            value={selectedYear}
                                                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                                            className="w-full text-xs border border-gray-300 rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500"
                                                        >
                                                            {yearOptions.map(year => (
                                                                <option key={year} value={year}>{year}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            onClick={() => {
                                                                fetchAllDashboardData();
                                                                setShowDateDropdown(false);
                                                            }}
                                                            className="w-full mt-3 bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700 transition-colors font-medium"
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Custom range picker */}
                                                {dateFilterType === 'Custom range' && (
                                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                                        <div className="flex flex-col gap-2">
                                                            <div>
                                                                <span className="text-[10px] text-gray-500 mb-1 block">From</span>
                                                                <input
                                                                    type="date"
                                                                    value={customFrom}
                                                                    onChange={(e) => setCustomFrom(e.target.value)}
                                                                    className="w-full text-xs border border-gray-300 rounded-md p-1.5"
                                                                />
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] text-gray-500 mb-1 block">To</span>
                                                                <input
                                                                    type="date"
                                                                    value={customTo}
                                                                    onChange={(e) => setCustomTo(e.target.value)}
                                                                    className="w-full text-xs border border-gray-300 rounded-md p-1.5"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    if (customFrom && customTo) {
                                                                        fetchAllDashboardData();
                                                                        setShowDateDropdown(false);
                                                                    } else {
                                                                        showToast('Select both dates', 'error');
                                                                    }
                                                                }}
                                                                className="w-full bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700 transition-colors font-medium"
                                                            >
                                                                Apply Range
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Global Clear Filter button */}
                                                <div className="mt-3 pt-2 border-t border-gray-100">
                                                    <button
                                                        onClick={() => {
                                                            setDateFilterType('Annual');
                                                            setSelectedYear(new Date().getFullYear());
                                                            setCustomFrom('');
                                                            setCustomTo('');
                                                            fetchAllDashboardData();
                                                            setShowDateDropdown(false);
                                                        }}
                                                        disabled={
                                                            dateFilterType === 'Annual' &&
                                                            selectedYear === new Date().getFullYear() &&
                                                            customFrom === '' &&
                                                            customTo === ''
                                                        }
                                                        className={`w-full text-xs py-1.5 rounded border transition-colors ${
                                                            dateFilterType === 'Annual' &&
                                                            selectedYear === new Date().getFullYear() &&
                                                            customFrom === '' &&
                                                            customTo === ''
                                                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-red-600'
                                                        }`}
                                                    >
                                                        Clear Filter
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ===== KPI CARDS – LARGER TITLES & ICONS ===== */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                                    
                                    {/* Total Theses */}
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                            <BookOpen size={18} className="text-blue-600" /> Total Theses
                                        </p>
                                        <p className="text-2xl font-bold text-gray-900 mt-2">{formatNumber(dashboardData.kpi.totalDocuments)}</p>
                                    </div>

                                    {/* Total Searches */}
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                            <Search size={18} className="text-green-600" /> Total Searches
                                        </p>
                                        <p className="text-2xl font-bold text-gray-900 mt-2">{formatNumber(dashboardData.kpi.totalSearches)}</p>
                                    </div>

                                    {/* Collection Utilisation */}
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                            <BarChart3 size={18} className="text-amber-600" /> Collection Utilisation
                                        </p>
                                        <div className="flex items-end gap-2 mt-2">
                                            <p className="text-2xl font-bold text-gray-900">{dashboardData.kpi.utilizationPercent}%</p>
                                            <p className="text-sm text-gray-500 mb-1">
                                                ({dashboardData.kpi.accessedDocuments}/{dashboardData.kpi.totalDocuments})
                                            </p>
                                        </div>
                                    </div>

                                    {/* Avg Response Time */}
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                            <Clock size={18} className="text-purple-600" /> Avg Response Time
                                        </p>
                                        <p className="text-2xl font-bold text-gray-900 mt-2">{formatNumber(dashboardData.kpi.avgResponseTime)} ms</p>
                                    </div>

                                    {/* Failed Queries */}
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                            <AlertCircle size={18} className="text-red-600" /> Failed Queries
                                        </p>
                                        <p className="text-2xl font-bold text-gray-900 mt-2">{formatNumber(dashboardData.failedQueriesCount)}</p>
                                    </div>

                                </div>

                                {/* ===== MIDDLE SECTION: 3-COLUMN GRID ===== */}
                                <div className="grid grid-cols-12 gap-2">

                                    {/* COL 1: TRENDING TOPICS (25%) */}
                                    <div className="col-span-12 lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col">
                                        <h3 className="font-bold text-gray-700 mb-4 text-xs flex items-center gap-2 uppercase tracking-wide">
                                            <TrendingUp size={16} className="text-blue-600" /> TRENDING TOPICS
                                        </h3>
                                        <div className="space-y-4 flex-1">
                                            {dashboardData.trendingTopics.length > 0 ? (
                                                dashboardData.trendingTopics.map((item, i) => {
                                                    const barColor = item.growth > 0 ? 'bg-green-500' : item.growth < 0 ? 'bg-red-400' : 'bg-gray-400';
                                                    const arrow = item.growth > 0 ? '↑' : item.growth < 0 ? '↓' : '–';
                                                    const textColor = item.growth > 0 ? 'text-green-700' : item.growth < 0 ? 'text-red-700' : 'text-gray-500';
                                                    const maxViews = Math.max(...dashboardData.trendingTopics.map(t => t.current_views), 1);
                                                    const barWidth = (item.current_views / maxViews) * 100;
                                                    return (
                                                        <div key={i} className="flex flex-col gap-1">
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="font-medium text-gray-700 truncate max-w-[60%]" title={item.subject}>
                                                                    {i+1}. {item.subject}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-gray-900">{item.current_views}</span>
                                                                    <span className={`text-[10px] font-bold ${textColor} flex items-center`}>
                                                                        {arrow} {Math.abs(item.growth)}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full ${barColor} transition-all duration-300`}
                                                                    style={{ width: `${barWidth}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p className="text-xs text-gray-400 italic">Not enough data yet.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* COL 2: TOP 5 THESES - LEADERBOARD STYLE (50%) */}
                                    <div className="col-span-12 lg:col-span-6 bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col">
                                        <h3 className="font-bold text-gray-700 mb-4 text-xs flex items-center gap-2 uppercase tracking-wide">
                                            <BookOpen size={16} className="text-purple-600" /> Top 5 Most Viewed Theses
                                        </h3>
                                        <div className="flex-1 flex flex-col gap-3">
                                            {dashboardData.topTheses.slice(0, 5).map((item, i) => (
                                                <div
                                                    key={i}
                                                    className={`relative flex items-center gap-4 p-3 rounded-lg border transition-all ${
                                                        i === 0 ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-200 shadow-sm' :
                                                        i === 1 ? 'bg-gradient-to-r from-gray-50 to-white border-gray-200' :
                                                        i === 2 ? 'bg-gradient-to-r from-orange-50 to-white border-orange-100' :
                                                        'bg-white border-gray-100 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {/* Rank Icon */}
                                                    <div className="flex-shrink-0">
                                                        {getRankIcon(i)}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs truncate leading-relaxed ${i === 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}
                                                        title={item.title}>
                                                            {item.title}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 truncate mt-0.5">{item.author || 'Unknown Author'}</p>
                                                    </div>

                                                    {/* Views */}
                                                    <div className="flex-shrink-0 text-right pl-2">
                                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                                                            i === 0 ? 'bg-yellow-100 border-yellow-200 text-yellow-800' :
                                                            'bg-gray-100 border-gray-200 text-gray-600'
                                                        }`}>
                                                            <Eye size={12} className={i === 0 ? "text-yellow-700" : "text-gray-400"} />
                                                            <span className="font-bold text-xs">{formatNumber(item.view_count)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {dashboardData.topTheses.length === 0 && <p className="text-xs text-gray-400 italic">No views recorded.</p>}
                                        </div>
                                    </div>

                                    {/* COL 3: USERS & TRENDS (25%) */}
                                    <div className="col-span-12 lg:col-span-3 flex flex-col gap-2">

                                        {/* Users by Category */}
                                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex-1">
                                            <h3 className="font-bold text-gray-700 mb-4 text-xs flex items-center gap-2 uppercase tracking-wide">
                                                <Users size={16} className="text-indigo-600" /> Users by Category
                                            </h3>
                                            <div className="space-y-3">
                                                {dashboardData.usageByCategory.length > 0 ? (
                                                    dashboardData.usageByCategory.map((cat, i) => {
                                                        // Determine icon
                                                        const Icon = cat.category.includes('Student') ? GraduationCap : 
                                                                    cat.category.includes('DOST') ? Briefcase : 
                                                                    cat.category.includes('Librarian') ? BookOpen : Users;
                                                        return (
                                                            <div key={i} className="flex flex-col gap-1">
                                                                <div className="flex justify-between items-center text-xs">
                                                                    <div className="flex items-center gap-2">
                                                                        <Icon size={12} className="text-gray-500" />
                                                                        <span className="font-medium text-gray-700">{cat.category}</span>
                                                                    </div>
                                                                    <span className="font-semibold text-gray-900">{cat.percentage}%</span>
                                                                </div>
                                                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className="h-full bg-indigo-500 rounded-full"
                                                                        style={{ width: `${cat.percentage}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <p className="text-xs text-gray-400 italic">No user data.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Monthly Trend - Chart */}
                                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex-1 flex flex-col justify-end min-h-[180px]">
                                            <h3 className="font-bold text-gray-700 mb-6 text-xs flex items-center gap-2 uppercase tracking-wide">
                                                <Calendar size={16} className="text-green-600" /> Activity Trends
                                            </h3>
                                            
                                            <div className="flex-1 flex items-end gap-2 w-full">
                                                {dashboardData.monthlyTrends.length > 0 ? (
                                                    dashboardData.monthlyTrends.map((month, i) => {
                                                        const max = Math.max(...dashboardData.monthlyTrends.map(m => m.views), 1);
                                                        const heightPercent = month.views === 0 ? 2 : (month.views / max) * 100;

                                                        return (
                                                            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-default">
                                                                
                                                                {/* Bar Container */}
                                                                <div className="relative w-full flex justify-center items-end h-full">
                                                                    {/* The Bar */}
                                                                    <div 
                                                                        className="w-full max-w-[20px] bg-gradient-to-t from-green-600 to-green-400 rounded-t-sm transition-all duration-500 relative hover:from-green-500 hover:to-green-300"
                                                                        style={{ height: `${heightPercent}%` }}
                                                                    >
                                                                        {/* Tooltip – always centered, with wrapping text */}
                                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                                                            <div className="bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-lg max-w-[200px] text-center whitespace-normal font-medium">
                                                                                {month.month} {month.year}: {month.views} views
                                                                            </div>
                                                                            {/* Tooltip Arrow – always centered under tooltip */}
                                                                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* X-Axis Label (Month abbreviation – keep short) */}
                                                                <span className="text-[9px] text-gray-500 font-bold uppercase truncate w-full text-center">
                                                                    {month.month.substring(0, 3)}
                                                                </span>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2 opacity-50">
                                                        <TrendingUp size={32} />
                                                        <span className="text-xs">No activity recorded yet</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ===== BOTTOM SECTION: AGE DISTRIBUTION + CITATIONS ===== */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    
                                    {/* Age Distribution */}
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                                        <h3 className="font-bold text-gray-700 mb-3 text-xs flex items-center gap-2 uppercase tracking-wide">
                                            <Users size={16} className="text-purple-600" /> Age Distribution
                                        </h3>
                                        {(() => {
                                            // Filter to only ages with data, sort by count descending, take top 8
                                            const agesWithData = dashboardData.ageDistribution
                                                .filter(a => a.count > 0)
                                                .sort((a, b) => b.count - a.count)
                                                .slice(0, 8);
                                            const total = dashboardData.ageDistribution.reduce((sum, a) => sum + a.count, 0);

                                            // Categorical color palette
                                            const colorPalette = [
                                                '#3b82f6', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#a855f7', '#ec4899', '#6366f1', '#8b5cf6'
                                            ];

                                            if (agesWithData.length === 0) {
                                                return <p className="text-xs text-gray-400 italic">No age data.</p>;
                                            }

                                            // Build conic-gradient string
                                            let cumulativePercent = 0;
                                            const gradientStops = agesWithData.map((item, i) => {
                                                const percentage = (item.count / total) * 100;
                                                const start = cumulativePercent;
                                                cumulativePercent += percentage;
                                                const color = colorPalette[i % colorPalette.length];
                                                return `${color} ${start}% ${cumulativePercent}%`;
                                            }).join(', ');

                                            return (
                                                <div className="flex flex-col md:flex-row items-center gap-4">
                                                    {/* Donut chart */}
                                                    <div className="relative w-32 h-32 flex-shrink-0">
                                                        <div
                                                            className="w-full h-full rounded-full"
                                                            style={{
                                                                background: `conic-gradient(${gradientStops})`,
                                                                mask: 'radial-gradient(circle at 50% 50%, transparent 50%, black 51%)',
                                                                WebkitMask: 'radial-gradient(circle at 50% 50%, transparent 50%, black 51%)'
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                                                            {total} total
                                                        </div>
                                                    </div>
                                                    {/* Legend */}
                                                    <div className="flex-1 space-y-1 max-h-40 overflow-y-auto pr-1">
                                                        {agesWithData.map((item, i) => {
                                                            const color = colorPalette[i % colorPalette.length];
                                                            return (
                                                                <div key={i} className="flex items-center gap-2 text-[10px]">
                                                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                                                    <span className="flex-1 truncate" title={item.age}>
                                                                        {item.age}
                                                                    </span>
                                                                    <span className="font-semibold text-gray-700">
                                                                        {item.count} ({item.percentage}%)
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Citation Activity */}
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                                        <h3 className="font-bold text-gray-700 mb-3 text-xs flex items-center gap-2 uppercase tracking-wide">
                                            <Copy size={16} className="text-amber-600" /> Citation Activity
                                        </h3>
                                        
                                        {dashboardData.citationStats.total_copies > 0 ? (
                                            <>
                                                <p className="text-2xl font-bold text-gray-900">{dashboardData.citationStats.total_copies}</p>
                                                <p className="text-xs text-gray-500 mb-3">total copies in this period</p>

                                                {/* Monthly bar chart */}
                                                <div className="h-16 flex items-end gap-0.5 mb-3">
                                                    {dashboardData.citationMonthly.length > 0 ? (
                                                        dashboardData.citationMonthly.map((month, i) => {
                                                            const max = Math.max(...dashboardData.citationMonthly.map(m => m.copies), 1);
                                                            // Even zero months get a visible bar (8px)
                                                            const barHeight = month.copies === 0 ? 8 : Math.max(8, (month.copies / max) * 100);
                                                            return (
                                                                <div key={i} className="flex-1 flex flex-col items-center group cursor-default">
                                                                    <div className="relative w-full flex justify-center items-end h-full">
                                                                        <div 
                                                                            className="w-full max-w-[20px] bg-amber-500 rounded-t transition-all duration-300 hover:bg-amber-600"
                                                                            style={{ height: `${barHeight}%`, minHeight: '8px' }}
                                                                        >
                                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                                                                <div className="bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap font-medium">
                                                                                    {month.month}: {month.copies} copies
                                                                                </div>
                                                                                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-[8px] text-gray-500 mt-1">
                                                                        {month.month.substring(0,3)}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="w-full text-center text-gray-400 text-xs">No monthly data</div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-center h-24 bg-amber-50 rounded-lg border border-dashed border-amber-200">
                                                <p className="text-sm text-gray-500 italic">No citation copies yet</p>
                                            </div>
                                        )}
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
                            {/* Summary Cards */}
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

                            {/* Rating Distribution */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                                <h3 className="font-bold text-gray-800 mb-3 text-sm">Rating Distribution</h3>
                                <div className="space-y-2">
                                    {[5, 4, 3, 2, 1].map(star => {
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

                            {/* Recent Ratings Table */}
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
                </main>
            </div>

            {/* Account Settings Modal */}
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