import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import {
    LayoutDashboard, MessageSquare, Star, LogOut, Settings,
    ShieldCheck, ChevronDown, Eye, Search, ThumbsUp, ThumbsDown,
    Clock, Bookmark, AlertCircle, TrendingUp, BookOpen, CheckCircle,
    X, EyeOff, Menu, Calendar, Users, ChevronLeft, ChevronRight,
    Trophy, Medal, Briefcase, GraduationCap, BarChart3, Copy, Info,
    User, Key, RefreshCw, Download, Home
} from "lucide-react";
import dostLogo from "./components/images/dost-logo.png";

const API_BASE_URL = 'http://localhost:8000/api';

const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toLocaleString();
};

const hideDefaultPasswordEyeStyles = `
  input[type="password"]::-webkit-credentials-auto-fill-button,
  input[type="password"]::-webkit-outer-spin-button,
  input[type="password"]::-webkit-inner-spin-button {
    display: none !important;
  }
  input[type="password"]::-ms-reveal,
  input[type="password"]::-ms-clear {
    display: none !important;
  }
`;

const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { logout, user, changePassword, updateProfile } = useAuth();

    // ---------- Tab State from URL ----------
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

    // ---------- UI State ----------
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef(null);

    // ---------- Overview Date Filter (unified for all dashboard data) ----------
    const overviewDateFilterOptions = ['Year', 'Month', 'Last 7 days', 'Custom range'];
    const [overviewDateFilterType, setOverviewDateFilterType] = useState('Year');
    const [overviewSelectedYear, setOverviewSelectedYear] = useState(new Date().getFullYear());
    const [overviewSelectedMonth, setOverviewSelectedMonth] = useState(new Date().getMonth() + 1);
    const [overviewSelectedMonthYear, setOverviewSelectedMonthYear] = useState(new Date().getFullYear());
    const [overviewCustomFrom, setOverviewCustomFrom] = useState('');
    const [overviewCustomTo, setOverviewCustomTo] = useState('');
    const [showOverviewDateDropdown, setShowOverviewDateDropdown] = useState(false);
    const overviewDateDropdownRef = useRef(null);

    // ---------- Data States ----------
    const [dashboardData, setDashboardData] = useState({
        kpi: { totalDocuments: 0, failedQueriesCount: 0, totalSearches: 0, accessedDocuments: 0, utilizationPercent: 0, avgResponseTime: 0 },
        trendingTopics: [],
        topTheses: [],
        usageByCategory: [],
        ageDistribution: [],
        citationTrends: [],
        citationStats: { total_copies: 0, top_cited: [] },
        trends: [] // for activity trends (monthly/weekly/daily)
    });
    const [loading, setLoading] = useState(false);

    // ---------- Feedback States ----------
    const [feedbacks, setFeedbacks] = useState([]);
    const [feedbackFilter, setFeedbackFilter] = useState('All');

    // ---------- Feedback Manager Date Filter ----------
    const feedbackDateFilterOptions = ['All', 'Year', 'Month', 'Last 7 days', 'Custom range'];
    const [feedbackDateFilterType, setFeedbackDateFilterType] = useState('All');
    const [feedbackSelectedYear, setFeedbackSelectedYear] = useState(new Date().getFullYear());
    const [feedbackSelectedMonth, setFeedbackSelectedMonth] = useState(new Date().getMonth() + 1);
    const [feedbackSelectedMonthYear, setFeedbackSelectedMonthYear] = useState(new Date().getFullYear());
    const [feedbackCustomFrom, setFeedbackCustomFrom] = useState('');
    const [feedbackCustomTo, setFeedbackCustomTo] = useState('');
    const [showFeedbackDateDropdown, setShowFeedbackDateDropdown] = useState(false);
    const feedbackDateDropdownRef = useRef(null);

    // ---------- Feedback Manager Rating Filter ----------
    const [showRatingDropdown, setShowRatingDropdown] = useState(false);
    const ratingDropdownRef = useRef(null);

    // ---------- Material Ratings ----------
    const [materialRatings, setMaterialRatings] = useState([]);

    // ---------- Material Ratings: interactive filter ----------
    const [selectedMaterialFilter, setSelectedMaterialFilter] = useState(null);
    const feedbackLogRef = useRef(null);

    // ---------- Dormant Materials Count ----------
    const [dormantCount, setDormantCount] = useState(0);

    // ---------- Material Ratings Date Filter ----------
    const ratingsDateFilterOptions = ['All', 'Year', 'Month', 'Last 7 days', 'Custom range'];
    const [ratingsDateFilterType, setRatingsDateFilterType] = useState('All');
    const [ratingsSelectedYear, setRatingsSelectedYear] = useState(new Date().getFullYear());
    const [ratingsSelectedMonth, setRatingsSelectedMonth] = useState(new Date().getMonth() + 1);
    const [ratingsSelectedMonthYear, setRatingsSelectedMonthYear] = useState(new Date().getFullYear());
    const [ratingsCustomFrom, setRatingsCustomFrom] = useState('');
    const [ratingsCustomTo, setRatingsCustomTo] = useState('');
    const [showRatingsDateDropdown, setShowRatingsDateDropdown] = useState(false);
    const ratingsDateDropdownRef = useRef(null);

    // ---------- Least Accessed Materials ----------
    const [leastAccessedMaterials, setLeastAccessedMaterials] = useState([]);

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
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // ---------- Year options for dropdowns ----------
    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let y = 2020; y <= currentYear + 1; y++) {
        yearOptions.push(y);
    }

    // ---------- Date Range Helper for Overview (Fixed Timezone Issue) ----------
    const getDateRange = () => {
        const today = new Date();
        
        // Helper to format date as YYYY-MM-DD in LOCAL time, not UTC
        const formatDateLocal = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        if (overviewDateFilterType === 'Year') {
            return { from: `${overviewSelectedYear}-01-01`, to: `${overviewSelectedYear}-12-31` };
        }
        if (overviewDateFilterType === 'Month') {
            const firstDay = new Date(overviewSelectedMonthYear, overviewSelectedMonth - 1, 1);
            const lastDay = new Date(overviewSelectedMonthYear, overviewSelectedMonth, 0);
            return {
                from: formatDateLocal(firstDay),
                to: formatDateLocal(lastDay)
            };
        }
        if (overviewDateFilterType === 'Last 7 days') {
            const from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return {
                from: formatDateLocal(from),
                to: formatDateLocal(today)
            };
        }
        if (overviewDateFilterType === 'Custom range') {
            return { from: overviewCustomFrom, to: overviewCustomTo };
        }
        return { from: '', to: '' };
    };

    // ---------- Date Range Helper for Feedback ----------
    const isFeedbackInDateRange = (feedbackDate) => {
        if (feedbackDateFilterType === 'All') return true;
        
        const date = new Date(feedbackDate);
        const today = new Date();
        
        if (feedbackDateFilterType === 'Year') {
            return date.getFullYear() === feedbackSelectedYear;
        }
        
        if (feedbackDateFilterType === 'Last 7 days') {
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return date >= weekAgo;
        }
        
        if (feedbackDateFilterType === 'Month') {
            return date.getMonth() + 1 === feedbackSelectedMonth && 
                date.getFullYear() === feedbackSelectedMonthYear;
        }
        
        if (feedbackDateFilterType === 'Custom range') {
            if (!feedbackCustomFrom || !feedbackCustomTo) return true;
            const from = new Date(feedbackCustomFrom);
            const to = new Date(feedbackCustomTo);
            to.setHours(23, 59, 59, 999);
            return date >= from && date <= to;
        }
        
        return true;
    };

    // ---------- Date Range Helper for Material Ratings ----------
    const isRatingInDateRange = (ratingDate) => {
        if (ratingsDateFilterType === 'All') return true;
        
        const date = new Date(ratingDate);
        const today = new Date();
        
        if (ratingsDateFilterType === 'Year') {
            return date.getFullYear() === ratingsSelectedYear;
        }
        
        if (ratingsDateFilterType === 'Last 7 days') {
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return date >= weekAgo;
        }
        
        if (ratingsDateFilterType === 'Month') {
            return date.getMonth() + 1 === ratingsSelectedMonth && 
                date.getFullYear() === ratingsSelectedMonthYear;
        }
        
        if (ratingsDateFilterType === 'Custom range') {
            if (!ratingsCustomFrom || !ratingsCustomTo) return true;
            const from = new Date(ratingsCustomFrom);
            const to = new Date(ratingsCustomTo);
            to.setHours(23, 59, 59, 999);
            return date >= from && date <= to;
        }
        
        return true;
    };

    // ---------- OVERVIEW DASHBOARD FETCH FUNCTIONS (all use getDateRange()) ----------
    const fetchDashboardKPI = async () => {
        const { from, to } = getDateRange();
        if (overviewDateFilterType === 'Custom range' && (!from || !to)) return;
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
        if (overviewDateFilterType === 'Custom range' && (!from || !to)) return;
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
        if (overviewDateFilterType === 'Custom range' && (!from || !to)) return;
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
        if (overviewDateFilterType === 'Custom range' && (!from || !to)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/dashboard/usage-by-category/?from=${from}&to=${to}`);
            if (res.ok) {
                const data = await res.json();
                setDashboardData(prev => ({ ...prev, usageByCategory: data }));
            }
        } catch (error) { console.error(error); }
    };

    const fetchAgeDistribution = async () => {
        const { from, to } = getDateRange();
        if (overviewDateFilterType === 'Custom range' && (!from || !to)) return;
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
        if (overviewDateFilterType === 'Custom range' && (!from || !to)) return;
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
        if (overviewDateFilterType === 'Custom range' && (!from || !to)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/dashboard/citation-stats/?from=${from}&to=${to}`);
            if (res.ok) {
                const data = await res.json();
                setDashboardData(prev => ({ ...prev, citationStats: data }));
            }
        } catch (error) { console.error(error); }
    };

    const fetchCitationTrends = async () => {
        const { from, to } = getDateRange();
        if (!from || !to) return;

        let endpoint = '';
        if (overviewDateFilterType === 'Year') {
            endpoint = '/dashboard/citation-monthly/';
        } else if (overviewDateFilterType === 'Month') {
            endpoint = '/dashboard/citation-weekly/';
        } else if (overviewDateFilterType === 'Last 7 days' || overviewDateFilterType === 'Custom range') {
            endpoint = '/dashboard/citation-daily/';
        }

        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}?from=${from}&to=${to}`);
            if (res.ok) {
                let data = await res.json();

                // Format data identical to Activity Trends
                if (overviewDateFilterType === 'Month') {
                    data = data.map((item, index) => ({
                        ...item,
                        displayLabel: `W${index + 1}`,
                        tooltipRange: item.label
                    }));
                } else if (overviewDateFilterType === 'Last 7 days') {
                    data = data.map(item => {
                        const date = new Date(item.day);
                        return {
                            ...item,
                            displayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
                            tooltipRange: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                        };
                    });
                } else if (overviewDateFilterType === 'Custom range') {
                    if (data.length === 0) {
                        setDashboardData(prev => ({ ...prev, citationTrends: [] }));
                        return;
                    }
                    const totalDays = data.length;
                    let intervalSize = 1;
                    if (totalDays > 30) intervalSize = 5;
                    else if (totalDays > 15) intervalSize = 3;
                    else intervalSize = 2;

                    const grouped = [];
                    for (let i = 0; i < data.length; i += intervalSize) {
                        const groupItems = data.slice(i, i + intervalSize);
                        const startDate = new Date(groupItems[0].day);
                        const endDate = new Date(groupItems[groupItems.length - 1].day);
                        const totalCopies = groupItems.reduce((sum, d) => sum + d.copies, 0);

                        const startLabel = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const endLabel = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const rangeLabel = startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;

                        grouped.push({
                            displayLabel: startLabel,
                            tooltipRange: rangeLabel,
                            copies: totalCopies,
                        });
                    }
                    data = grouped;
                } else {
                    // Year filter
                    data = data.map(item => ({
                        ...item,
                        displayLabel: item.month.substring(0, 3),
                        tooltipRange: `${item.month} ${item.year}`
                    }));
                }

                setDashboardData(prev => ({ ...prev, citationTrends: data }));
            }
        } catch (error) { console.error(error); }
    };

    const fetchTrends = async () => {
        const { from, to } = getDateRange();
        if (!from || !to) return;

        let endpoint = '';
        if (overviewDateFilterType === 'Year') {
            endpoint = '/dashboard/monthly-trends/';
        } else if (overviewDateFilterType === 'Month') {
            endpoint = '/dashboard/weekly-trends/';
        } else if (overviewDateFilterType === 'Last 7 days') {
            endpoint = '/dashboard/daily-trends/';
        } else if (overviewDateFilterType === 'Custom range') {
            endpoint = '/dashboard/daily-trends/'; // we'll group the daily data
        }

        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}?from=${from}&to=${to}`);
            if (res.ok) {
                let data = await res.json();

                // Transform based on filter type
                if (overviewDateFilterType === 'Month') {
                    // Weekly data: each item has week_start, week_end, label, views
                    // We'll keep the label as "Week N" and store full range for tooltip
                    data = data.map((item, index) => ({
                        ...item,
                        label: `Week ${index + 1}`,
                        tooltipRange: item.label, // e.g., "Mar 01 - Mar 07"
                    }));
                } else if (overviewDateFilterType === 'Last 7 days') {
                    // Daily data: each item has day, label, views
                    data = data.map(item => {
                        const date = new Date(item.day);
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                        const fullDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                        return {
                            ...item,
                            label: dayName,
                            fullDate: fullDate,
                            weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
                        };
                    });
                } else if (overviewDateFilterType === 'Custom range') {
                    // Group daily data into intervals
                    if (data.length === 0) {
                        setDashboardData(prev => ({ ...prev, trends: [] }));
                        return;
                    }

                    const totalDays = data.length;
                    let intervalSize = 1;
                    if (totalDays > 30) intervalSize = 5;
                    else if (totalDays > 15) intervalSize = 3;
                    else intervalSize = 2; // for shorter ranges, keep daily but we'll still group? Let's use 2 for >7 days.

                    const grouped = [];
                    for (let i = 0; i < data.length; i += intervalSize) {
                        const groupItems = data.slice(i, i + intervalSize);
                        const startDate = new Date(groupItems[0].day);
                        const endDate = new Date(groupItems[groupItems.length - 1].day);
                        const totalViews = groupItems.reduce((sum, d) => sum + d.views, 0);

                        const startLabel = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const endLabel = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const rangeLabel = startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;

                        grouped.push({
                            label: startLabel, // show only start date under bar
                            tooltipRange: rangeLabel,
                            views: totalViews,
                        });
                    }
                    data = grouped;
                }
                // For Year, data already has month names and year; no transformation needed.

                setDashboardData(prev => ({ ...prev, trends: data }));
            }
        } catch (error) { console.error(error); }
    };

    const fetchAllDashboardData = () => {
        setLoading(true);
        Promise.all([
            fetchDashboardKPI(),
            fetchFailedQueriesCount(),
            fetchTrendingTopics(),
            fetchTopTheses(),
            fetchUsageByCategory(),
            fetchAgeDistribution(),
            fetchCitationStats(),
            fetchCitationTrends(),
            fetchTrends()
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
        if (activeTab === 'overview') {
            fetchAllDashboardData();
        }
        if (activeTab === 'feedback') fetchFeedback();
    }, [
        activeTab,
        overviewDateFilterType,
        overviewSelectedYear,
        overviewSelectedMonth,
        overviewSelectedMonthYear,
        overviewCustomFrom,
        overviewCustomTo
    ]);

    // ---------- Fetch ratings & least accessed when filters change ----------
    useEffect(() => {
        if (activeTab === 'ratings') {
            fetchMaterialRatings();
            fetchLeastAccessedMaterials();
            fetchDormantCount();
        }
    }, [activeTab]);


    // ---------- Click outside handlers ----------
    useEffect(() => {
        const handleClickOutside = (event) => {
            // User Menu
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
            // Feedback Date Dropdown
            if (feedbackDateDropdownRef.current && !feedbackDateDropdownRef.current.contains(event.target)) {
                const isInput = event.target.tagName === 'INPUT';
                if (!isInput) setShowFeedbackDateDropdown(false);
            }
            // Feedback Rating Filter
            if (ratingDropdownRef.current && !ratingDropdownRef.current.contains(event.target)) {
                setShowRatingDropdown(false);
            }
            // Overview Date Dropdown
            if (overviewDateDropdownRef.current && !overviewDateDropdownRef.current.contains(event.target)) {
                const isInput = event.target.tagName === 'INPUT';
                if (!isInput) setShowOverviewDateDropdown(false);
            }
            // Ratings Date Dropdown
            if (ratingsDateDropdownRef.current && !ratingsDateDropdownRef.current.contains(event.target)) {
                const isInput = event.target.tagName === 'INPUT'; 
                if (!isInput) setShowRatingsDateDropdown(false);
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
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/csm-feedback/`);
            if (res.ok) {
                const data = await res.json();
                setFeedbacks(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
            }
        } catch (error) { console.error("Failed to load feedback", error); }
        finally { setLoading(false); }
    };

    const fetchMaterialRatings = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/feedback/`);
            if (res.ok) {
                const data = await res.json();
                const ratings = data.filter(item => item.relevant !== null);
                setMaterialRatings(ratings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLeastAccessedMaterials = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/dashboard/least-browsed/`);
            if (res.ok) {
                const data = await res.json();
                setLeastAccessedMaterials(data);
            }
        } catch (error) { console.error("Failed to load least accessed materials", error); }
    };

    const fetchDormantCount = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/dashboard/dormant-count/`);
            if (res.ok) {
                const data = await res.json();
                setDormantCount(data.count);
            }
        } catch (error) {
            console.error("Failed to fetch dormant count", error);
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

    // Helper to get filtered feedbacks based on current rating and date filters
    const getFilteredFeedbacks = () => {
        return feedbacks
            .filter(fb => feedbackFilter === 'All' || fb.litpath_rating?.toString() === feedbackFilter)
            .filter(fb => isFeedbackInDateRange(fb.created_at));
    };

    
    // ---------- Feedback Manager Export Data to CSV ----------
    const handleFeedbackExportCSV = () => {
        const filteredFeedbacks = getFilteredFeedbacks();
        if (filteredFeedbacks.length === 0) {
            showToast('No data to export', 'error');
            return;
        }

        let csvContent = "";
        const addRow = (rowArray) => {
            const formattedRow = rowArray.map(col => {
                const cell = col === null || col === undefined ? "" : String(col);
                return `"${cell.replace(/"/g, '""')}"`; // Escape quotes
            }).join(",");
            csvContent += formattedRow + "\r\n";
        };

        // CSV Header (match table columns, excluding the "Action" button)
        addRow([
            "Date",
            "Client Type",
            "Rating",
            "User Category",
            "Region",
            "Comment",
            "Status",
            "Valid?",
            "Doable?"
        ]);

        // Data rows
        filteredFeedbacks.forEach(fb => {
            // Rating as words (e.g., "5 stars", "1 star")
            let ratingText = '';
            if (fb.litpath_rating) {
                const num = fb.litpath_rating;
                ratingText = `${num} star${num > 1 ? 's' : ''}`;
            }

            // Comment: use "N/A" if empty
            const comment = fb.message_comment && fb.message_comment.trim() !== '' 
                ? fb.message_comment 
                : 'N/A';

            addRow([
                new Date(fb.created_at).toLocaleDateString(),
                fb.client_type || '',
                ratingText,
                fb.category || '',
                fb.region || '',
                comment,
                fb.status || '',
                fb.is_valid === true ? 'Yes' : fb.is_valid === false ? 'No' : '',
                fb.is_doable === true ? 'Yes' : fb.is_doable === false ? 'No' : ''
            ]);
        });

        // Trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `LitPathAI_FeedbackReport_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('Feedback exported successfully!', 'success');
    };


    // --- HELPER LOGIC FOR MATERIAL RATINGS TAB VISUALS ---
    const filteredRatings = materialRatings.filter(r => isRatingInDateRange(r.created_at));

    // Now functions that depend on filteredRatings
    const getRelevanceScore = () => {
        if (!filteredRatings.length) return 0;
        const positive = filteredRatings.filter(r => r.relevant === true).length;
        return ((positive / filteredRatings.length) * 100).toFixed(0);
    };

    const getRecentNegatives = () => {
        return materialRatings
            .filter(r => r.relevant === false)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 3);
    };

    const getTopMaterials = (ratingsArray) => {
        const counts = {};
        ratingsArray.forEach(r => {
            if (r.relevant === true) {
                const title = r.material_title || r.document_file || 'Unknown';
                counts[title] = (counts[title] || 0) + 1;
            }
        });
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([title, count]) => ({ title, count }));
    };

    // Then counts that depend on filteredRatings
    const helpfulCount = filteredRatings.filter(r => r.relevant === true).length;
    const notRelevantCount = filteredRatings.filter(r => r.relevant === false).length;
    const totalVotes = helpfulCount + notRelevantCount;
    const helpfulPercent = totalVotes ? (helpfulCount / totalVotes) * 100 : 0;


    // Returns { start, end } as Date objects for the current filter
    const getCurrentDateRange = () => {
        const filterType = ratingsDateFilterType;

        if (filterType === 'Year') {
            const year = ratingsSelectedYear;
            return {
                start: new Date(year, 0, 1, 0, 0, 0, 0),
                end: new Date(year, 11, 31, 23, 59, 59, 999)
            };
        } else if (filterType === 'Month') {
            const year = ratingsSelectedMonthYear;
            const month = ratingsSelectedMonth - 1; // 0-based
            return {
                start: new Date(year, month, 1, 0, 0, 0, 0),
                end: new Date(year, month + 1, 0, 23, 59, 59, 999)
            };
        } else if (filterType === 'Last 7 days') {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 7);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        } else if (filterType === 'Custom range' && ratingsCustomFrom && ratingsCustomTo) {
            const fromParts = ratingsCustomFrom.split('-').map(Number);
            const toParts = ratingsCustomTo.split('-').map(Number);
            return {
                start: new Date(fromParts[0], fromParts[1] - 1, fromParts[2], 0, 0, 0, 0),
                end: new Date(toParts[0], toParts[1] - 1, toParts[2], 23, 59, 59, 999)
            };
        } else {
            // 'All' – no specific range, return null to indicate whole dataset
            return null;
        }
    };

    // Helper function to get vote count for the previous period
    const getPreviousPeriodVotes = () => {
        const currentRange = getCurrentDateRange();
        if (!currentRange) return null; // 'All' filter – no previous period defined

        const { start, end } = currentRange;
        const duration = end - start; // milliseconds

        let prevStart, prevEnd;

        if (ratingsDateFilterType === 'Last 7 days') {
            // Previous 7 days: shift back by 7 days
            prevStart = new Date(start.getTime() - duration - 1);
            prevEnd = new Date(start.getTime() - 1);
        } else if (ratingsDateFilterType === 'Month') {
            // Previous month: shift back by one month
            const year = ratingsSelectedMonthYear;
            const month = ratingsSelectedMonth - 1;
            if (month === 0) {
                // January -> previous December of previous year
                prevStart = new Date(year - 1, 11, 1);
                prevEnd = new Date(year - 1, 11, 31, 23, 59, 59, 999);
            } else {
                prevStart = new Date(year, month - 1, 1);
                prevEnd = new Date(year, month, 0, 23, 59, 59, 999);
            }
        } else if (ratingsDateFilterType === 'Year') {
            // Previous year
            const year = ratingsSelectedYear - 1;
            prevStart = new Date(year, 0, 1);
            prevEnd = new Date(year, 11, 31, 23, 59, 59, 999);
        } else if (ratingsDateFilterType === 'Custom range') {
            // Shift the whole range back by its own duration
            prevStart = new Date(start.getTime() - duration - 1);
            prevEnd = new Date(start.getTime() - 1);
        } else {
            return null;
        }

        // Count votes in materialRatings that fall within the previous period
        return materialRatings.filter(r => {
            const d = new Date(r.created_at);
            return d >= prevStart && d <= prevEnd;
        }).length;
    };

    // Generate trend data for the Rating Trend chart (same with Citation Activity style)
    const getRatingTrendData = () => {
        if (!filteredRatings.length) return [];

        const filterType = ratingsDateFilterType;
        const today = new Date();
        let buckets = []; // will hold { start, end, label, tooltip, helpful, total }

        // Helper to create a bucket with proper day boundaries
        const createBucket = (startDate, endDate, label, tooltip) => ({
            start: new Date(startDate.setHours(0,0,0,0)),
            end: new Date(endDate.setHours(23,59,59,999)),
            label,
            tooltip,
            helpful: 0,
            total: 0
        });

        if (filterType === 'Year') {
            const year = ratingsSelectedYear;
            for (let m = 0; m < 12; m++) {
                const monthStart = new Date(year, m, 1);
                const monthEnd = new Date(year, m + 1, 0);
                const monthName = monthStart.toLocaleString('default', { month: 'short' }).toUpperCase();
                const tooltip = monthStart.toLocaleString('default', { month: 'long', year: 'numeric' });
                buckets.push(createBucket(monthStart, monthEnd, monthName, tooltip));
            }
        } else if (filterType === 'Month') {
            const year = ratingsSelectedMonthYear;
            const month = ratingsSelectedMonth - 1; // 0‑based
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            let week = 1;
            for (let d = 1; d <= daysInMonth; d += 7) {
                const weekStart = new Date(year, month, d);
                const weekEnd = new Date(year, month, Math.min(d + 6, daysInMonth));
                const label = `W${week}`;
                const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const tooltip = startStr === endStr ? startStr : `${startStr} - ${endStr}`;
                buckets.push(createBucket(weekStart, weekEnd, label, tooltip));
                week++;
            }
        } else if (filterType === 'Last 7 days') {
            // last 7 days including today
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dayStart = new Date(date.setHours(0,0,0,0));
                const dayEnd = new Date(date.setHours(23,59,59,999));
                const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
                const tooltip = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                buckets.push(createBucket(dayStart, dayEnd, label, tooltip));
            }
        } else if (filterType === 'Custom range' && ratingsCustomFrom && ratingsCustomTo) {
            // Parse the custom range
            const fromParts = ratingsCustomFrom.split('-').map(Number);
            const toParts = ratingsCustomTo.split('-').map(Number);
            const fromDate = new Date(fromParts[0], fromParts[1]-1, fromParts[2]);
            const toDate = new Date(toParts[0], toParts[1]-1, toParts[2]);
            
            // Create daily buckets for every day in the range (inclusive)
            const diffTime = toDate - fromDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
            for (let i = 0; i < diffDays; i++) {
                const current = new Date(fromDate);
                current.setDate(fromDate.getDate() + i);
                const dayStart = new Date(current.setHours(0,0,0,0));
                const dayEnd = new Date(current.setHours(23,59,59,999));
                const label = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
                const tooltip = current.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                buckets.push(createBucket(dayStart, dayEnd, label, tooltip));
            }

            // If the range is long, group days into intervals (like Citation Activity)
            if (diffDays > 15) {
                let intervalSize;
                if (diffDays > 30) intervalSize = 5;
                else if (diffDays > 15) intervalSize = 3;
                else intervalSize = 2;

                const grouped = [];
                for (let i = 0; i < buckets.length; i += intervalSize) {
                    const groupItems = buckets.slice(i, i + intervalSize);
                    const startBucket = groupItems[0];
                    const endBucket = groupItems[groupItems.length - 1];
                    const totalHelpful = groupItems.reduce((sum, b) => sum + b.helpful, 0);
                    const totalVotes = groupItems.reduce((sum, b) => sum + b.total, 0);
                    const startLabel = startBucket.label;
                    const endLabel = endBucket.label;
                    const rangeLabel = startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
                    grouped.push({
                        start: startBucket.start,
                        end: endBucket.end,
                        label: startLabel,        // display first date in group
                        tooltip: rangeLabel,
                        helpful: totalHelpful,
                        total: totalVotes
                    });
                }
                buckets = grouped;
            }
        } else {
            // 'All' filter – group by month first, then maybe group months into larger intervals
            if (filteredRatings.length === 0) return [];
            const dates = filteredRatings.map(r => new Date(r.created_at));
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));
            
            // Create monthly buckets from the first to the last month (inclusive)
            let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
            const endDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
            while (current <= endDate) {
                const year = current.getFullYear();
                const month = current.getMonth();
                const monthStart = new Date(year, month, 1);
                const monthEnd = new Date(year, month + 1, 0);
                const monthName = monthStart.toLocaleString('default', { month: 'short' }).toUpperCase();
                const tooltip = monthStart.toLocaleString('default', { month: 'long', year: 'numeric' });
                buckets.push(createBucket(monthStart, monthEnd, monthName, tooltip));
                current.setMonth(current.getMonth() + 1);
            }

            // If there are many months, group them into intervals to avoid overcrowding
            const totalMonths = buckets.length;
            const MAX_VISIBLE_POINTS = 18; // max number of x-axis labels we want
            if (totalMonths > MAX_VISIBLE_POINTS) {
                // Determine interval size: group months so that the number of groups ≤ MAX_VISIBLE_POINTS
                let intervalSize = Math.ceil(totalMonths / MAX_VISIBLE_POINTS);
                // But we also want intervals that make sense (e.g., 3 months = quarter, 6 months = half-year, 12 months = year)
                // Round intervalSize to nearest sensible value: 3, 6, or 12? Or just keep the calculated size.
                // For simplicity, we'll use the calculated size, but ensure it's at least 2.
                intervalSize = Math.max(2, intervalSize);
                
                const grouped = [];
                for (let i = 0; i < buckets.length; i += intervalSize) {
                    const groupItems = buckets.slice(i, i + intervalSize);
                    const startBucket = groupItems[0];
                    const endBucket = groupItems[groupItems.length - 1];
                    const totalHelpful = groupItems.reduce((sum, b) => sum + b.helpful, 0);
                    const totalVotes = groupItems.reduce((sum, b) => sum + b.total, 0);
                    
                    // Determine a label for the group: if interval spans multiple months, show range
                    const startMonth = startBucket.start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    const endMonth = endBucket.end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    const rangeLabel = startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`;
                    
                    // For display label, we might want a shorter version (e.g., "Q1 2023" or just the first month)
                    // Let's use the first month's abbreviated name + year if needed, but keep it compact.
                    // Alternatively, we could use quarter labels if intervalSize is 3.
                    // But to keep it simple, we'll use the first month's short label (e.g., "Jan 2023") and the full range in tooltip.
                    const firstMonthShort = startBucket.start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    
                    grouped.push({
                        start: startBucket.start,
                        end: endBucket.end,
                        label: firstMonthShort,   // displayed under the bar
                        tooltip: rangeLabel,      // full range in tooltip
                        helpful: totalHelpful,
                        total: totalVotes
                    });
                }
                buckets = grouped;
            }
        }

        // Fill buckets with actual ratings
        filteredRatings.forEach(r => {
            const ratingDate = new Date(r.created_at);
            const bucket = buckets.find(b => ratingDate >= b.start && ratingDate <= b.end);
            if (bucket) {
                if (r.relevant === true) bucket.helpful += 1;
                if (r.relevant !== null) bucket.total += 1;
            }
        });

        // Return the data in the format expected by the chart
        return buckets.map(b => ({
            displayLabel: b.label,
            tooltipRange: b.tooltip,
            avgScore: b.total > 0 ? (b.helpful / b.total) * 100 : 0,
            count: b.total,
            helpful: b.helpful
        }));
    };

    // Dynamic trend for Total Votes
    const currentVotes = filteredRatings.length;
    const previousVotes = getPreviousPeriodVotes();
    const voteTrend = previousVotes !== null ? currentVotes - previousVotes : null;
    const trendLabel = 
        ratingsDateFilterType === 'Last 7 days' ? 'last week' :
        ratingsDateFilterType === 'Month' ? 'previous month' :
        ratingsDateFilterType === 'Year' ? 'previous year' :
        ratingsDateFilterType === 'Custom range' ? 'previous period' : '';

    
    // ---------- Overview Export Data to CSV ----------
    const handleExportCSV = () => {
        // 1. Generate a descriptive subtitle for the export
        let filterText = '';
        if (overviewDateFilterType === 'Year') filterText = `Year ${overviewSelectedYear}`;
        else if (overviewDateFilterType === 'Month') filterText = `${new Date(0, overviewSelectedMonth - 1).toLocaleString('default', { month: 'long' })} ${overviewSelectedMonthYear}`;
        else if (overviewDateFilterType === 'Last 7 days') filterText = 'Last 7 days';
        else filterText = `${overviewCustomFrom} to ${overviewCustomTo}`;

        // 2. Helper to add rows safely
        let csvContent = "";
        const addRow = (rowArray) => {
            const formattedRow = rowArray.map(col => {
                const cell = col === null || col === undefined ? "" : String(col);
                return `"${cell.replace(/"/g, '""')}"`; // Escape quotes
            }).join(",");
            csvContent += formattedRow + "\r\n";
        };

        // 3. Build CSV Content
        addRow(["LITPATH AI - DASHBOARD REPORT"]);
        addRow([`Date Filter Applied: ${filterText}`]);
        addRow([`Exported On: ${new Date().toLocaleString()}`]);
        addRow([]);

        // --- KPIs ---
        addRow(["KEY PERFORMANCE INDICATORS"]);
        addRow(["Metric", "Value"]);
        addRow(["Total Theses", dashboardData.kpi.totalDocuments]);
        addRow(["Total Searches", dashboardData.kpi.totalSearches]);
        addRow(["Collection Utilisation (%)", dashboardData.kpi.utilizationPercent]);
        addRow(["Avg Response Time (ms)", dashboardData.kpi.avgResponseTime]);
        addRow(["Failed Queries", dashboardData.failedQueriesCount]);
        addRow([]);

        // --- TOP THESES ---
        addRow(["TOP THESES BROWSED"]);
        addRow(["Rank", "Title", "Author", "Year", "Degree", "Views", "Avg Rating"]);
        dashboardData.topTheses.forEach((t, i) => {
            addRow([i + 1, t.title, t.author, t.year, t.degree, t.view_count, t.avg_rating]);
        });
        addRow([]);

        // --- USAGE BY CATEGORY ---
        addRow(["USAGE BY CATEGORY"]);
        addRow(["Category", "User Count", "Percentage (%)"]);
        dashboardData.usageByCategory.forEach(c => {
            addRow([c.category, c.views, c.percentage]);
        });
        addRow([]);

        // --- AGE DISTRIBUTION ---
        addRow(["AGE DISTRIBUTION"]);
        addRow(["Age Group", "User Count", "Percentage (%)"]);
        dashboardData.ageDistribution.forEach(a => {
            addRow([a.age, a.count, a.percentage]);
        });
        addRow([]);

        // --- ACTIVITY TRENDS ---
        addRow(["ACTIVITY TRENDS (Views)"]);
        addRow(["Date Range", "Total Views"]);
        dashboardData.trends.forEach(t => {
            addRow([t.tooltipRange || t.label || t.month, t.views]);
        });
        addRow([]);

        // --- CITATION ACTIVITY ---
        addRow(["CITATION ACTIVITY"]);
        addRow(["Total Citations Copied", dashboardData.citationStats.total_copies]);
        addRow(["Date Range", "Copies"]);
        if (dashboardData.citationTrends && dashboardData.citationTrends.length > 0) {
            dashboardData.citationTrends.forEach(c => {
                addRow([c.tooltipRange || c.label || c.month, c.copies]);
            });
        }

        // 4. Trigger Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `LitPath_Report_${filterText.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Report exported successfully!', 'success');
    };


    // ---------- RENDER ----------
    return (
        <>
        {/* Inject CSS to hide browser's default password eye icons */}
        <style>{hideDefaultPasswordEyeStyles}</style>

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
                                    {/* New Home button */}
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
                                            setShowAccountSettings(true);
                                            setSettingsTab('profile');
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

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">

                {/* Sidebar */}
                <aside className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-20 ${isSidebarOpen ? 'w-64' : 'w-16'}`}>
                    <div className={`h-16 flex items-center border-b border-gray-100 ${isSidebarOpen ? 'justify-start px-4' : 'justify-center p-0'}`}>
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

                    {/* ===== LOADING OVERLAY ===== */}
                    {loading && (
                        <div className="absolute inset-0 bg-gray-50/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center transition-opacity duration-300">
                            <RefreshCw size={40} className="animate-spin text-[#1E74BC] mb-4 shadow-sm rounded-full" />
                            <p className="text-gray-600 font-semibold animate-pulse tracking-wide">Gathering dashboard insights...</p>
                        </div>
                    )}

                    {/* ===== OVERVIEW TAB ===== */}
                    {activeTab === 'overview' && (
                        <div className="h-full overflow-y-auto pr-1">
                            <div className="max-w-[1600px] mx-auto w-full flex flex-col gap-2">

                                {/* ===== HEADER + DATE FILTER ===== */}
                                <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                                    <h2 className="text-xl font-bold text-gray-800">Thesis & Dissertation Usage</h2>
                                    <div className="flex gap-2">

                                        {/* EXPORT BUTTON */}
                                        <button
                                            onClick={handleExportCSV}
                                            className="flex items-center space-x-2 px-3 py-1.5 border border-[#1E74BC] rounded-md bg-white text-[#1E74BC] hover:bg-blue-50 text-xs font-bold transition-colors shadow-sm"
                                            title="Export current data to CSV"
                                        >
                                            <Download size={14} />
                                            <span>Export Data</span>
                                        </button>

                                        {/* Date Filter Dropdown */}
                                        <div className="relative" ref={overviewDateDropdownRef}>
                                            <button
                                                onClick={() => setShowOverviewDateDropdown(!showOverviewDateDropdown)}
                                                className="flex items-center space-x-2 px-3 py-1.5 border border-gray-400 rounded-md bg-white text-gray-650 hover:bg-gray-100 text-xs font-medium"
                                            >
                                                <Calendar size={14} />
                                                <span>
                                                    {overviewDateFilterType === 'Year' && `Year ${overviewSelectedYear}`}
                                                    {overviewDateFilterType === 'Month' && `${new Date(0, overviewSelectedMonth-1).toLocaleString('default', { month: 'long' })} ${overviewSelectedMonthYear}`}
                                                    {overviewDateFilterType === 'Last 7 days' && 'Last 7 days'}
                                                    {overviewDateFilterType === 'Custom range' && 'Custom range'}
                                                </span>
                                                <ChevronDown size={14} />
                                            </button>

                                            {showOverviewDateDropdown && (
                                                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-30 min-w-[260px] p-3">
                                                    {/* Filter type options */}
                                                    {overviewDateFilterOptions.map(opt => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => {
                                                                setOverviewDateFilterType(opt);
                                                                if (opt === 'Last 7 days') {
                                                                    setShowOverviewDateDropdown(false);
                                                                    fetchTrends();
                                                                }
                                                                if (opt !== 'Custom range') {
                                                                    setOverviewCustomFrom('');
                                                                    setOverviewCustomTo('');
                                                                }
                                                            }}
                                                            className={`block w-full text-left px-3 py-2 text-xs rounded-md ${
                                                                overviewDateFilterType === opt
                                                                    ? 'bg-blue-50 text-blue-600 font-bold'
                                                                    : 'hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}

                                                    {/* Year picker */}
                                                    {overviewDateFilterType === 'Year' && (
                                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                                            <label className="block text-[10px] font-medium text-gray-500 mb-1">
                                                                Select year
                                                            </label>
                                                            <select
                                                                value={overviewSelectedYear}
                                                                onChange={(e) => setOverviewSelectedYear(parseInt(e.target.value))}
                                                                className="w-full text-xs border border-gray-300 rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500"
                                                            >
                                                                {yearOptions.map(year => (
                                                                    <option key={year} value={year}>{year}</option>
                                                                ))}
                                                            </select>
                                                            <button
                                                                onClick={() => {
                                                                    setShowOverviewDateDropdown(false);
                                                                    fetchTrends();
                                                                }}
                                                                className="w-full mt-3 bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700 transition-colors font-medium"
                                                            >
                                                                Apply
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Month picker */}
                                                    {overviewDateFilterType === 'Month' && (
                                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                                            <div className="flex flex-col gap-2">
                                                                <div>
                                                                    <label className="block text-[10px] font-medium text-gray-500 mb-1">
                                                                        Month
                                                                    </label>
                                                                    <select
                                                                        value={overviewSelectedMonth}
                                                                        onChange={(e) => setOverviewSelectedMonth(parseInt(e.target.value))}
                                                                        className="w-full text-xs border border-gray-300 rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500"
                                                                    >
                                                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                                                            <option key={month} value={month}>
                                                                                {new Date(0, month-1).toLocaleString('default', { month: 'long' })}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-medium text-gray-500 mb-1">
                                                                        Year
                                                                    </label>
                                                                    <select
                                                                        value={overviewSelectedMonthYear}
                                                                        onChange={(e) => setOverviewSelectedMonthYear(parseInt(e.target.value))}
                                                                        className="w-full text-xs border border-gray-300 rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500"
                                                                    >
                                                                        {yearOptions.map(year => (
                                                                            <option key={year} value={year}>{year}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setShowOverviewDateDropdown(false);
                                                                        fetchTrends();
                                                                    }}
                                                                    className="w-full bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700 transition-colors font-medium"
                                                                >
                                                                    Apply
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Custom range picker */}
                                                    {overviewDateFilterType === 'Custom range' && (
                                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                                            <div className="flex flex-col gap-2">
                                                                <div>
                                                                    <span className="text-[10px] text-gray-500 mb-1 block">From</span>
                                                                    <input
                                                                        type="date"
                                                                        value={overviewCustomFrom}
                                                                        onChange={(e) => setOverviewCustomFrom(e.target.value)}
                                                                        className="w-full text-xs border border-gray-300 rounded-md p-1.5"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <span className="text-[10px] text-gray-500 mb-1 block">To</span>
                                                                    <input
                                                                        type="date"
                                                                        value={overviewCustomTo}
                                                                        onChange={(e) => setOverviewCustomTo(e.target.value)}
                                                                        className="w-full text-xs border border-gray-300 rounded-md p-1.5"
                                                                    />
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        if (overviewCustomFrom && overviewCustomTo) {
                                                                            setShowOverviewDateDropdown(false);
                                                                            fetchTrends();
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

                                                    {/* Clear Filter button – resets to current year */}
                                                    <div className="mt-3 pt-2 border-t border-gray-100">
                                                        <button
                                                            onClick={() => {
                                                                setOverviewDateFilterType('Year');
                                                                setOverviewSelectedYear(new Date().getFullYear());
                                                                setOverviewSelectedMonth(new Date().getMonth() + 1);
                                                                setOverviewSelectedMonthYear(new Date().getFullYear());
                                                                setOverviewCustomFrom('');
                                                                setOverviewCustomTo('');
                                                                setShowOverviewDateDropdown(false);
                                                                fetchTrends();
                                                            }}
                                                            disabled={overviewDateFilterType === 'Year' && overviewSelectedYear === new Date().getFullYear()}
                                                            className={`w-full text-xs py-1.5 rounded border transition-colors ${
                                                                overviewDateFilterType === 'Year' && overviewSelectedYear === new Date().getFullYear()
                                                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-red-600'
                                                            }`}
                                                        >
                                                            Reset to Current Year
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ===== KPI CARDS – LARGER TITLES & ICONS ===== */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                                    
                                    {/* Total Theses */}
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                        <div className="flex items-center gap-1">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                <BookOpen size={18} className="text-blue-600" /> Total Theses
                                            </p>
                                            <div className="relative group">
                                                <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-48">
                                                    <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center">
                                                        Total number of thesis/dissertation documents in the database.
                                                    </div>
                                                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900 mt-2">{formatNumber(dashboardData.kpi.totalDocuments)}</p>
                                    </div>

                                    {/* Total Searches – same pattern, just change tooltip text */}
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                        <div className="flex items-center gap-1">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                <Search size={18} className="text-green-600" /> Total Searches
                                            </p>
                                            <div className="relative group">
                                                <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-48">
                                                    <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center">
                                                        Number of search queries performed in the selected period.
                                                    </div>
                                                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900 mt-2">{formatNumber(dashboardData.kpi.totalSearches)}</p>
                                    </div>

                                    {/* Collection Utilisation */}
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                        <div className="flex items-center gap-1">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                <BarChart3 size={18} className="text-amber-600" /> Collection Utilisation
                                            </p>
                                            <div className="relative group">
                                                <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-48">
                                                    <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center">
                                                        Percentage of documents accessed at least once vs. total documents.
                                                    </div>
                                                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-end gap-2 mt-2">
                                            <p className="text-2xl font-bold text-gray-900">{dashboardData.kpi.utilizationPercent}%</p>
                                            <p className="text-sm text-gray-500 mb-1">
                                                ({dashboardData.kpi.accessedDocuments}/{dashboardData.kpi.totalDocuments})
                                            </p>
                                        </div>
                                    </div>

                                    {/* Avg Response Time */}
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                        <div className="flex items-center gap-1">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                <Clock size={18} className="text-purple-600" /> Avg Response Time
                                            </p>
                                            <div className="relative group">
                                                <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-48">
                                                    <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center">
                                                        Average time (in milliseconds) to process a search query.
                                                    </div>
                                                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900 mt-2">{formatNumber(dashboardData.kpi.avgResponseTime)} ms</p>
                                    </div>

                                    {/* Failed Queries */}
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                        <div className="flex items-center gap-1">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                <AlertCircle size={18} className="text-red-600" /> Failed Queries
                                            </p>
                                            <div className="relative group">
                                                <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-48">
                                                    <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center">
                                                        Number of searches that returned zero results.
                                                    </div>
                                                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900 mt-2">{formatNumber(dashboardData.failedQueriesCount)}</p>
                                    </div>

                                </div>

                                {/* ===== MIDDLE SECTION: 3-COLUMN GRID ===== */}
                                <div className="grid grid-cols-12 gap-2">

                                    {/* COL 1: TRENDING TOPICS (25%) */}
                                    <div className="col-span-12 lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col">
                                        <div className="flex items-center gap-1 mb-4">
                                            <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wide flex items-center gap-2">
                                                <TrendingUp size={16} className="text-blue-600" /> TRENDING TOPICS
                                            </h3>
                                            {/* Info icon for view count explanation */}
                                            <div className="relative group">
                                                <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-48">
                                                    <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center">
                                                        Number of views in the selected period. Growth percentage compared to previous period; may exceed 100% for new topics.
                                                    </div>
                                                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4 flex-1">
                                            {dashboardData.trendingTopics.length > 0 ? (
                                                dashboardData.trendingTopics.map((item, i) => {
                                                    // Updated colors: positive growth now emerald (vibrant green)
                                                    const barColor = item.growth > 0 ? 'bg-emerald-500' : item.growth < 0 ? 'bg-red-400' : 'bg-gray-400';
                                                    const arrow = item.growth > 0 ? '↑' : item.growth < 0 ? '↓' : '–';
                                                    const textColor = item.growth > 0 ? 'text-emerald-700' : item.growth < 0 ? 'text-red-700' : 'text-gray-500';
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
                                                <p className="text-xs text-gray-400 italic">Not enough data yet</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* COL 2: TOP 5 THESES - LEADERBOARD STYLE (50%) */}
                                    <div className="col-span-12 lg:col-span-6 bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col">
                                        <div className="flex items-center gap-1 mb-4">
                                            <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wide flex items-center gap-2">
                                                <BookOpen size={16} className="text-purple-600" /> Top 5 Most Viewed Theses
                                            </h3>
                                            <div className="relative group">
                                                <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-48">
                                                    <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center">
                                                        Ranked by number of views within the selected date range.
                                                    </div>
                                                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                                </div>
                                            </div>
                                        </div>
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
                                            {dashboardData.topTheses.length === 0 && <p className="text-xs text-gray-400 italic">No views recorded</p>}
                                        </div>
                                    </div>

                                    {/* COL 3: USERS & AGE DISTRIBUTION (25%) */}
                                    <div className="col-span-12 lg:col-span-3 flex flex-col gap-2">

                                        {/* Users by Category */}
                                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex-1">
                                            <div className="flex items-center gap-1 mb-4">
                                                <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wide flex items-center gap-2">
                                                    <Users size={16} className="text-indigo-600" /> Users by Category
                                                </h3>
                                                <div className="relative group">
                                                    <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-48">
                                                        <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center">
                                                            Distribution of users by their self‑identified category from CSM feedback.
                                                        </div>
                                                        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                                    </div>
                                                </div>
                                            </div>
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

                                        {/* Age Distribution */}
                                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex-1">
                                            <div className="flex items-center gap-1 mb-3">
                                                <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wide flex items-center gap-2">
                                                    <Users size={16} className="text-purple-600" /> Age Distribution
                                                </h3>
                                                <div className="relative group">
                                                    <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-48">
                                                        <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center">
                                                            Age breakdown of users who provided feedback.
                                                        </div>
                                                        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            {(() => {
                                                // Filter to only ages with data, sort by count descending, take top 8
                                                const agesWithData = dashboardData.ageDistribution
                                                    .filter(a => a.count > 0)
                                                    .sort((a, b) => b.count - a.count)
                                                    .slice(0, 8);
                                                const total = dashboardData.ageDistribution.reduce((sum, a) => sum + a.count, 0);

                                                const colorPalette = [
                                                    '#3b82f6', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#a855f7', '#ec4899', '#6366f1', '#8b5cf6'
                                                ];

                                                if (agesWithData.length === 0) {
                                                    return <p className="text-xs text-gray-400 italic">No records yet</p>;
                                                }

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
                                    </div>
                                </div>

                                {/* ===== BOTTOM SECTION: ACTIVITY TRENDS + CITATIONS ===== */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

                                    {/* Activity Trends */}
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 min-h-[200px] flex flex-col">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-1 flex-wrap">
                                                <div className="flex items-center gap-1">
                                                    <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wide flex items-center gap-2">
                                                        <Calendar size={16} className="text-blue-600" /> Activity Trends
                                                    </h3>
                                                    <div className="relative group">
                                                        <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-48">
                                                            <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center font-normal normal-case tracking-normal">
                                                                Number of material views within the selected date range.
                                                            </div>
                                                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <span className="text-[10px] text-gray-500 italic ml-2">
                                                    {overviewDateFilterType === 'Year' && `(Monthly material views for ${overviewSelectedYear})`}
                                                    {overviewDateFilterType === 'Month' && `(Weekly material views for ${new Date(0, overviewSelectedMonth - 1).toLocaleString('default', { month: 'long' })} ${overviewSelectedMonthYear})`}
                                                    {overviewDateFilterType === 'Last 7 days' && '(Daily material views from the last 7 days)'}
                                                    {overviewDateFilterType === 'Custom range' && overviewCustomFrom && overviewCustomTo &&
                                                        `(Material views summary from ${new Date(overviewCustomFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${new Date(overviewCustomTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
                                                    }
                                                </span>
                                            </div>
                                        </div>

                                        {/* Dynamic Total and Chart Rendering */}
                                        {(() => {
                                            const totalActivityViews = dashboardData.trends ? dashboardData.trends.reduce((sum, t) => sum + t.views, 0) : 0;

                                            return dashboardData.trends && dashboardData.trends.length > 0 ? (
                                                <>
                                                    <p className="text-2xl font-bold text-gray-900">{formatNumber(totalActivityViews)}</p>
                                                    <p className="text-xs text-gray-500 mb-2">total material views in this period</p>

                                                    {(() => {
                                                        const max = Math.max(...dashboardData.trends.map(t => t.views), 1);
                                                        // Helper to format Y-axis accurately
                                                        const tick = (mult) => {
                                                            const val = max * mult;
                                                            return max < 4 ? val.toFixed(1) : formatNumber(Math.round(val));
                                                        };

                                                        return (
                                                            <>
                                                                {/* mt-10 provides safe airspace for tooltips so they never clip the top container */}
                                                                <div className="flex w-full mt-10 h-[150px] relative">
                                                                    
                                                                    {/* Y-Axis Labels - Absolutely positioned for perfect line alignment */}
                                                                    <div className="relative w-10 shrink-0">
                                                                        <span className="absolute right-2 top-0 -translate-y-1/2 text-[10px] text-gray-400 font-medium">{tick(1)}</span>
                                                                        <span className="absolute right-2 top-[25%] -translate-y-1/2 text-[10px] text-gray-400 font-medium">{tick(0.75)}</span>
                                                                        <span className="absolute right-2 top-[50%] -translate-y-1/2 text-[10px] text-gray-400 font-medium">{tick(0.5)}</span>
                                                                        <span className="absolute right-2 top-[75%] -translate-y-1/2 text-[10px] text-gray-400 font-medium">{tick(0.25)}</span>
                                                                        <span className="absolute right-2 bottom-0 translate-y-1/2 text-[10px] text-gray-400 font-medium">0</span>
                                                                    </div>

                                                                    {/* Chart Area */}
                                                                    <div className="flex-1 relative border-b-2 border-l-2 border-gray-200">
                                                                        
                                                                        {/* Horizontal Grid Lines - fixed z-index so they show up! */}
                                                                        <div className="absolute inset-x-0 top-0 border-t border-dashed border-gray-200 z-0"></div>
                                                                        <div className="absolute inset-x-0 top-[25%] border-t border-dashed border-gray-200 z-0"></div>
                                                                        <div className="absolute inset-x-0 top-[50%] border-t border-dashed border-gray-200 z-0"></div>
                                                                        <div className="absolute inset-x-0 top-[75%] border-t border-dashed border-gray-200 z-0"></div>

                                                                        {/* Bars Container */}
                                                                        <div className="absolute inset-0 flex items-end justify-around gap-1">
                                                                            {dashboardData.trends.map((item, i) => {
                                                                                const heightPercent = item.views === 0 ? 0 : Math.max((item.views / max) * 100, 1);
                                                                                
                                                                                let displayLabel = '';
                                                                                if (overviewDateFilterType === 'Year') {
                                                                                    displayLabel = item.month ? item.month.substring(0, 3) : '';
                                                                                } else if (overviewDateFilterType === 'Month' || overviewDateFilterType === 'Last 7 days' || overviewDateFilterType === 'Custom range') {
                                                                                    displayLabel = item.label;
                                                                                }

                                                                                let tooltipContent;
                                                                                if (overviewDateFilterType === 'Year') {
                                                                                    tooltipContent = (
                                                                                        <div className="text-center">
                                                                                            <div className="font-semibold text-gray-200">{item.month} {item.year}:</div>
                                                                                            <div>{item.views} view{item.views !== 1 ? 's' : ''}</div>
                                                                                        </div>
                                                                                    );
                                                                                } else if (overviewDateFilterType === 'Month' || overviewDateFilterType === 'Custom range') {
                                                                                    tooltipContent = (
                                                                                        <div className="text-center">
                                                                                            <div className="font-semibold text-gray-200">{item.tooltipRange}:</div>
                                                                                            <div>{item.views} view{item.views !== 1 ? 's' : ''}</div>
                                                                                        </div>
                                                                                    );
                                                                                } else if (overviewDateFilterType === 'Last 7 days') {
                                                                                    tooltipContent = (
                                                                                        <div className="text-center">
                                                                                            <div className="font-semibold text-gray-200">{item.fullDate}, {item.weekday}:</div>
                                                                                            <div>{item.views} view{item.views !== 1 ? 's' : ''}</div>
                                                                                        </div>
                                                                                    );
                                                                                }

                                                                                const isFirst = i === 0;
                                                                                const isLast = i === dashboardData.trends.length - 1;
                                                                                let tooltipPositionClass = "left-1/2 -translate-x-1/2"; 
                                                                                let arrowPositionClass = "left-1/2 -translate-x-1/2";   

                                                                                if (isFirst) {
                                                                                    tooltipPositionClass = "left-0 translate-x-0";      
                                                                                    arrowPositionClass = "left-4 -translate-x-1/2";     
                                                                                } else if (isLast) {
                                                                                    tooltipPositionClass = "right-0 translate-x-0";     
                                                                                    arrowPositionClass = "right-4 translate-x-1/2";     
                                                                                }

                                                                                return (
                                                                                    /* hover:z-50 makes sure the active tooltip is ALWAYS on top of neighboring bars */
                                                                                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group cursor-default relative hover:z-50">
                                                                                        
                                                                                        {/* Ghost Background Track */}
                                                                                        <div className="absolute inset-y-0 bottom-0 w-full max-w-[32px] bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors rounded-t-sm z-0"></div>

                                                                                        {/* Actual Data Bar */}
                                                                                        <div
                                                                                            className={`w-full max-w-[32px] absolute bottom-0 z-10 rounded-t-sm transition-all duration-500 ${item.views > 0 ? 'bg-gradient-to-t from-blue-600 to-blue-400 group-hover:from-blue-500 group-hover:to-blue-300 shadow-sm' : 'bg-transparent'}`}
                                                                                            style={{ height: `${heightPercent}%` }}
                                                                                        >
                                                                                            {/* Tooltip Wrapper - Added whitespace-nowrap here so text doesn't squish */}
                                                                                            <div className={`absolute bottom-full mb-2 hidden group-hover:flex flex-col z-50 pointer-events-none ${tooltipPositionClass}`}>
                                                                                                <div className="bg-gray-800 text-white text-[10px] px-3 py-1.5 rounded shadow-lg whitespace-nowrap w-max text-center leading-tight border border-gray-700">
                                                                                                    {tooltipContent}
                                                                                                </div>
                                                                                                <div className={`absolute -bottom-[4px] w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800 ${arrowPositionClass}`}></div>
                                                                                            </div>
                                                                                        </div>
                                                                                        
                                                                                        {/* X-Axis Label */}
                                                                                        <div className="absolute -bottom-7 text-[9px] text-gray-500 font-bold uppercase whitespace-nowrap text-center">
                                                                                            {displayLabel}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {/* Spacer to protect X-Axis labels from bottom margin */}
                                                                <div className="h-8 w-full"></div>
                                                            </>
                                                        );
                                                    })()}
                                                </>
                                            ) : (
                                                <div className="w-full flex-1 flex flex-col items-center justify-center text-gray-400 gap-2 opacity-50 min-h-[120px]">
                                                    <TrendingUp size={32} />
                                                    <span className="text-xs">No activity recorded yet</span>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Citation Activity */}
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col">
                                        <div className="flex items-center gap-1 mb-3 flex-wrap">
                                            <div className="flex items-center gap-1">
                                                <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wide flex items-center gap-2">
                                                    <Copy size={16} className="text-red-600" /> Citation Activity
                                                </h3>
                                                <div className="relative group">
                                                    <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-48">
                                                        <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center font-normal normal-case tracking-normal">
                                                            Number of times citations were copied within the selected date range.
                                                        </div>
                                                        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <span className="text-[10px] text-gray-500 italic ml-2">
                                                {overviewDateFilterType === 'Year' && `(Monthly  citation copies for ${overviewSelectedYear})`}
                                                {overviewDateFilterType === 'Month' && `(Weekly  citation copies for ${new Date(0, overviewSelectedMonth - 1).toLocaleString('default', { month: 'long' })} ${overviewSelectedMonthYear})`}
                                                {overviewDateFilterType === 'Last 7 days' && '(Daily citation copies from the last 7 days)'}
                                                {overviewDateFilterType === 'Custom range' && overviewCustomFrom && overviewCustomTo &&
                                                    `(Citation copies summary from ${new Date(overviewCustomFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${new Date(overviewCustomTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
                                                }
                                            </span>
                                        </div>
                                        
                                        {dashboardData.citationStats.total_copies > 0 ? (
                                            <>
                                                <p className="text-2xl font-bold text-gray-900">{formatNumber(dashboardData.citationStats.total_copies)}</p>
                                                <p className="text-xs text-gray-500 mb-2">total citation copies in this period</p>

                                                {(() => {
                                                    const max = Math.max(...dashboardData.citationTrends.map(m => m.copies), 1);
                                                    const dataLen = dashboardData.citationTrends.length;

                                                    // Helper to format Y-axis accurately
                                                    const tick = (mult) => {
                                                        const val = max * mult;
                                                        return max < 4 ? val.toFixed(1) : formatNumber(Math.round(val));
                                                    };
                                                    
                                                    const points = dashboardData.citationTrends.map((item, i) => {
                                                        const x = ((i + 0.5) / dataLen) * 100;
                                                        const y = 100 - ((item.copies / max) * 100); 
                                                        return { x, y, ...item };
                                                    });

                                                    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                                                    const areaPath = `${linePath} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;

                                                    return (
                                                        <>
                                                            <div className="flex w-full mt-10 h-[150px] relative">
                                                                
                                                                {/* Y-Axis Labels */}
                                                                <div className="relative w-10 shrink-0">
                                                                    <span className="absolute right-2 top-0 -translate-y-1/2 text-[10px] text-gray-400 font-medium">{tick(1)}</span>
                                                                    <span className="absolute right-2 top-[25%] -translate-y-1/2 text-[10px] text-gray-400 font-medium">{tick(0.75)}</span>
                                                                    <span className="absolute right-2 top-[50%] -translate-y-1/2 text-[10px] text-gray-400 font-medium">{tick(0.5)}</span>
                                                                    <span className="absolute right-2 top-[75%] -translate-y-1/2 text-[10px] text-gray-400 font-medium">{tick(0.25)}</span>
                                                                    <span className="absolute right-2 bottom-0 translate-y-1/2 text-[10px] text-gray-400 font-medium">0</span>
                                                                </div>
                                                                
                                                                {/* Chart Area */}
                                                                <div className="flex-1 relative border-b-2 border-l-2 border-gray-200">
                                                                    
                                                                    {/* Horizontal Grid Lines */}
                                                                    <div className="absolute inset-x-0 top-0 border-t border-dashed border-gray-200 z-0"></div>
                                                                    <div className="absolute inset-x-0 top-[25%] border-t border-dashed border-gray-200 z-0"></div>
                                                                    <div className="absolute inset-x-0 top-[50%] border-t border-dashed border-gray-200 z-0"></div>
                                                                    <div className="absolute inset-x-0 top-[75%] border-t border-dashed border-gray-200 z-0"></div>
                                                                    
                                                                    {/* SVG Area Fill */}
                                                                    <div className="absolute inset-0 w-full h-full overflow-visible z-10">
                                                                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                                                            <defs>
                                                                                <linearGradient id="citationGradient" x1="0" x2="0" y1="0" y2="1">
                                                                                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                                                                                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                                                                                </linearGradient>
                                                                            </defs>
                                                                            <path d={areaPath} fill="url(#citationGradient)" />
                                                                            <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                        </svg>
                                                                    </div>

                                                                    {/* Overlay Grid for Tooltips, Dots, and X-labels */}
                                                                    <div className="absolute inset-0 flex z-20">
                                                                        {points.map((p, i) => {
                                                                            const isFirst = i === 0;
                                                                            const isLast = i === dataLen - 1;
                                                                            let tooltipClass = "left-1/2 -translate-x-1/2";
                                                                            let arrowClass = "left-1/2 -translate-x-1/2";
                                                                            
                                                                            if (isFirst) {
                                                                                tooltipClass = "left-1/2 -translate-x-3";
                                                                                arrowClass = "left-3";
                                                                            } else if (isLast) {
                                                                                tooltipClass = "right-1/2 translate-x-3";
                                                                                arrowClass = "right-3";
                                                                            }

                                                                            return (
                                                                                /* hover:z-50 brings the hovered point to the very front */
                                                                                <div key={`hover-${i}`} className="flex-1 relative group cursor-default h-full flex justify-center hover:z-50">
                                                                                    
                                                                                    {/* Ghost Hover Highlight Area */}
                                                                                    <div className="absolute inset-y-0 w-[80%] max-w-[32px] z-0 bg-red-500/0 group-hover:bg-red-500/10 transition-colors rounded-sm"></div>
                                                                                    
                                                                                    {/* Dot and Tooltip Anchor */}
                                                                                    <div 
                                                                                        className="absolute z-20 flex justify-center items-center"
                                                                                        style={{ top: `${p.y}%`, transform: 'translateY(-50%)' }}
                                                                                    >
                                                                                        {/* Data Dot */}
                                                                                        <div className={`w-2.5 h-2.5 bg-white border-[2px] border-red-600 rounded-full transition-transform group-hover:scale-[1.4] shadow-sm ${p.copies === 0 ? 'opacity-30 group-hover:opacity-100' : 'opacity-100'}`} />
                                                                                        
                                                                                        {/* Tooltip Popup */}
                                                                                        <div className={`absolute bottom-full mb-2 hidden group-hover:flex flex-col z-50 pointer-events-none w-max ${tooltipClass}`}>
                                                                                            <div className="bg-gray-800 text-white text-[10px] px-3 py-1.5 rounded shadow-lg whitespace-nowrap text-center leading-tight border border-gray-700">
                                                                                                <div className="font-semibold text-gray-200">{p.tooltipRange}:</div>
                                                                                                <div>{p.copies} copies</div>
                                                                                            </div>
                                                                                            <div className={`absolute -bottom-[4px] w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800 ${arrowClass}`}></div>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* X-Axis Label */}
                                                                                    <div className="absolute -bottom-7 text-[9px] text-gray-500 font-bold uppercase whitespace-nowrap text-center">
                                                                                        {p.displayLabel}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="h-8 w-full"></div>
                                                        </>
                                                    );
                                                })()}
                                            </>
                                        ) : (
                                            <div className="flex flex-1 items-center justify-center min-h-[120px] bg-red-50 rounded-lg border border-dashed border-red-200 mt-2">
                                                <p className="text-sm text-red-500 italic">No citation copies recorded yet</p>
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
                                    {/* Export Button */}
                                    <button
                                        onClick={handleFeedbackExportCSV}
                                        className="flex items-center space-x-2 px-3 py-1.5 border border-[#1E74BC] rounded-md bg-white text-[#1E74BC] hover:bg-blue-50 text-xs font-bold transition-colors shadow-sm"
                                        title="Export filtered feedback to CSV"
                                    >
                                        <Download size={14} />
                                        <span>Export Data</span>
                                    </button>

                                    {/* Date Filter Dropdown */}
                                    <div className="relative" ref={feedbackDateDropdownRef}>
                                        <button
                                            onClick={() => setShowFeedbackDateDropdown(!showFeedbackDateDropdown)}
                                            className="flex items-center space-x-2 px-3 py-1.5 border border-gray-400 rounded-md bg-white text-gray-650 hover:bg-gray-100 text-xs font-medium"
                                        >
                                            <Calendar size={14} />
                                            <span>
                                                {feedbackDateFilterType === 'All' && 'All dates'}
                                                {feedbackDateFilterType === 'Year' && `Year ${feedbackSelectedYear}`}
                                                {feedbackDateFilterType === 'Last 7 days' && 'Last 7 days'}
                                                {feedbackDateFilterType === 'Month' && `${new Date(0, feedbackSelectedMonth-1).toLocaleString('default', { month: 'long' })} ${feedbackSelectedMonthYear}`}
                                                {feedbackDateFilterType === 'Custom range' && 'Custom range'}
                                            </span>
                                            <ChevronDown size={14} />
                                        </button>

                                        {showFeedbackDateDropdown && (
                                            <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-30 min-w-[260px] p-3">
                                                {/* Filter type options */}
                                                {feedbackDateFilterOptions.map(opt => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => {
                                                            setFeedbackDateFilterType(opt);
                                                            if (opt === 'Last 7 days') {
                                                                setShowFeedbackDateDropdown(false);
                                                            }
                                                            if (opt !== 'Custom range') {
                                                                setFeedbackCustomFrom('');
                                                                setFeedbackCustomTo('');
                                                            }
                                                        }}
                                                        className={`block w-full text-left px-3 py-2 text-xs rounded-md ${
                                                            feedbackDateFilterType === opt
                                                                ? 'bg-blue-50 text-blue-600 font-bold'
                                                                : 'hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}

                                                {/* Year picker */}
                                                {feedbackDateFilterType === 'Year' && (
                                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                                        <label className="block text-[10px] font-medium text-gray-500 mb-1">
                                                            Select year
                                                        </label>
                                                        <select
                                                            value={feedbackSelectedYear}
                                                            onChange={(e) => setFeedbackSelectedYear(parseInt(e.target.value))}
                                                            className="w-full text-xs border border-gray-300 rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500"
                                                        >
                                                            {yearOptions.map(year => (
                                                                <option key={year} value={year}>{year}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            onClick={() => setShowFeedbackDateDropdown(false)}
                                                            className="w-full mt-3 bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700 transition-colors font-medium"
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Month picker */}
                                                {feedbackDateFilterType === 'Month' && (
                                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                                        <div className="flex flex-col gap-2">
                                                            <div>
                                                                <label className="block text-[10px] font-medium text-gray-500 mb-1">
                                                                    Month
                                                                </label>
                                                                <select
                                                                    value={feedbackSelectedMonth}
                                                                    onChange={(e) => setFeedbackSelectedMonth(parseInt(e.target.value))}
                                                                    className="w-full text-xs border border-gray-300 rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500"
                                                                >
                                                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                                                        <option key={month} value={month}>
                                                                            {new Date(0, month-1).toLocaleString('default', { month: 'long' })}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-medium text-gray-500 mb-1">
                                                                    Year
                                                                </label>
                                                                <select
                                                                    value={feedbackSelectedMonthYear}
                                                                    onChange={(e) => setFeedbackSelectedMonthYear(parseInt(e.target.value))}
                                                                    className="w-full text-xs border border-gray-300 rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500"
                                                                >
                                                                    {yearOptions.map(year => (
                                                                        <option key={year} value={year}>{year}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <button
                                                                onClick={() => setShowFeedbackDateDropdown(false)}
                                                                className="w-full bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700 transition-colors font-medium"
                                                            >
                                                                Apply
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Custom range picker */}
                                                {feedbackDateFilterType === 'Custom range' && (
                                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                                        <div className="flex flex-col gap-2">
                                                            <div>
                                                                <span className="text-[10px] text-gray-500 mb-1 block">From</span>
                                                                <input
                                                                    type="date"
                                                                    value={feedbackCustomFrom}
                                                                    onChange={(e) => setFeedbackCustomFrom(e.target.value)}
                                                                    className="w-full text-xs border border-gray-300 rounded-md p-1.5"
                                                                />
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] text-gray-500 mb-1 block">To</span>
                                                                <input
                                                                    type="date"
                                                                    value={feedbackCustomTo}
                                                                    onChange={(e) => setFeedbackCustomTo(e.target.value)}
                                                                    className="w-full text-xs border border-gray-300 rounded-md p-1.5"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    if (feedbackCustomFrom && feedbackCustomTo) {
                                                                        setShowFeedbackDateDropdown(false);
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

                                                {/* Clear Filter button (disabled when filter type is 'All') */}
                                                <div className="mt-3 pt-2 border-t border-gray-100">
                                                    <button
                                                        onClick={() => {
                                                            setFeedbackDateFilterType('All');
                                                            setFeedbackSelectedYear(new Date().getFullYear());
                                                            setFeedbackSelectedMonth(new Date().getMonth() + 1);
                                                            setFeedbackSelectedMonthYear(new Date().getFullYear());
                                                            setFeedbackCustomFrom('');
                                                            setFeedbackCustomTo('');
                                                            setShowFeedbackDateDropdown(false);
                                                        }}
                                                        disabled={feedbackDateFilterType === 'All'}
                                                        className={`w-full text-xs py-1.5 rounded border transition-colors ${
                                                            feedbackDateFilterType === 'All'
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

                                    {/* Rating filter dropdown (custom, matching date filter) */}
                                    <div className="relative" ref={ratingDropdownRef}>
                                        <button
                                            onClick={() => setShowRatingDropdown(!showRatingDropdown)}
                                            className="flex items-center space-x-2 px-3 py-1.5 border border-gray-400 rounded-md bg-white text-gray-650 hover:bg-gray-100 text-xs font-medium"
                                        >
                                            <span>
                                                {feedbackFilter === 'All' ? 'All ratings' : `${feedbackFilter} Stars`}
                                            </span>
                                            <ChevronDown size={14} className={`transition-transform ${showRatingDropdown ? 'rotate-180' : ''}`} />
                                        </button>

                                        {showRatingDropdown && (
                                            <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-30 min-w-[140px] p-1">
                                                {[
                                                    { value: 'All', label: 'All ratings' },
                                                    { value: '5', label: '5 Stars' },
                                                    { value: '4', label: '4 Stars' },
                                                    { value: '3', label: '3 Stars' },
                                                    { value: '2', label: '2 Stars' },
                                                    { value: '1', label: '1 Star' }
                                                ].map(option => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => {
                                                            setFeedbackFilter(option.value);
                                                            setShowRatingDropdown(false);
                                                        }}
                                                        className={`block w-full text-left px-3 py-2 text-xs rounded-md ${
                                                            feedbackFilter === option.value
                                                                ? 'bg-blue-50 text-blue-600 font-bold'
                                                                : 'hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
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
                                            (() => {
                                                const filtered = feedbacks
                                                    .filter(fb => feedbackFilter === 'All' || fb.litpath_rating?.toString() === feedbackFilter)
                                                    .filter(fb => isFeedbackInDateRange(fb.created_at));
                                                
                                                if (filtered.length === 0) {
                                                    return (
                                                        <tr>
                                                            <td colSpan="10" className="px-6 py-10 text-center text-gray-500 text-sm">
                                                                No records match your filter.
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                                
                                                return filtered.map((fb) => (
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
                                                ));
                                            })()
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}


                    {/* ----- MATERIAL RATINGS TAB ----- */}
                    {activeTab === 'ratings' && (
                        <div className="h-full flex flex-col gap-2 max-w-[1600px] mx-auto w-full overflow-y-auto pb-8 pr-2">

                            {/* 1. Header & Filter Section */}
                            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">Content Relevance & Quality</h2>
                                    <p className="text-sm text-gray-500">Monitor user satisfaction and identify materials for archiving.</p>
                                </div>
                                
                                {/* Date Filter Dropdown */}
                                <div className="relative" ref={ratingsDateDropdownRef}>
                                    <button
                                        onClick={() => setShowRatingsDateDropdown(!showRatingsDateDropdown)}
                                        className="flex items-center space-x-2 px-3 py-1.5 border border-gray-400 rounded-md bg-white text-gray-650 hover:bg-gray-100 text-xs font-medium"
                                    >
                                        <Calendar size={14} />
                                        <span>
                                            {ratingsDateFilterType === 'All' && 'All Time'}
                                            {ratingsDateFilterType === 'Year' && `Year ${ratingsSelectedYear}`}
                                            {ratingsDateFilterType === 'Last 7 days' && 'Last 7 Days'}
                                            {ratingsDateFilterType === 'Month' && `${new Date(0, ratingsSelectedMonth - 1).toLocaleString('default', { month: 'short' })} ${ratingsSelectedMonthYear}`}
                                            {ratingsDateFilterType === 'Custom range' && 'Custom Range'}
                                        </span>
                                        <ChevronDown size={14} />
                                    </button>

                                    {showRatingsDateDropdown && (
                                        <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-30 min-w-[260px] p-3 animate-fadeIn">
                                            {/* Filter type options */}
                                            {ratingsDateFilterOptions.map(opt => (
                                                <button
                                                    key={opt}
                                                    onClick={() => {
                                                        setRatingsDateFilterType(opt);
                                                        if (opt === 'Last 7 days') setShowRatingsDateDropdown(false);
                                                        if (opt !== 'Custom range') {
                                                            setRatingsCustomFrom('');
                                                            setRatingsCustomTo('');
                                                        }
                                                    }}
                                                    className={`block w-full text-left px-3 py-2 text-sm rounded-lg mb-1 ${
                                                        ratingsDateFilterType === opt
                                                            ? 'bg-blue-50 text-blue-600 font-bold'
                                                            : 'hover:bg-gray-50 text-gray-600'
                                                    }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}

                                            {/* Year picker */}
                                            {ratingsDateFilterType === 'Year' && (
                                                <div className="mt-2 pt-2 border-t border-gray-100">
                                                    <label className="block text-[10px] font-medium text-gray-500 mb-1">
                                                        Select year
                                                    </label>
                                                    <select
                                                        value={ratingsSelectedYear}
                                                        onChange={(e) => setRatingsSelectedYear(parseInt(e.target.value))}
                                                        className="w-full text-xs border border-gray-300 rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        {yearOptions.map(year => (
                                                            <option key={year} value={year}>{year}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => setShowRatingsDateDropdown(false)}
                                                        className="w-full mt-3 bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700 transition-colors font-medium"
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            )}

                                            {/* Month picker */}
                                            {ratingsDateFilterType === 'Month' && (
                                                <div className="mt-2 pt-2 border-t border-gray-100">
                                                    <div className="flex flex-col gap-2">
                                                        <div>
                                                            <label className="block text-[10px] font-medium text-gray-500 mb-1">
                                                                Month
                                                            </label>
                                                            <select
                                                                value={ratingsSelectedMonth}
                                                                onChange={(e) => setRatingsSelectedMonth(parseInt(e.target.value))}
                                                                className="w-full text-xs border border-gray-300 rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500"
                                                            >
                                                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                                                    <option key={month} value={month}>
                                                                        {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-medium text-gray-500 mb-1">
                                                                Year
                                                            </label>
                                                            <select
                                                                value={ratingsSelectedMonthYear}
                                                                onChange={(e) => setRatingsSelectedMonthYear(parseInt(e.target.value))}
                                                                className="w-full text-xs border border-gray-300 rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500"
                                                            >
                                                                {yearOptions.map(year => (
                                                                    <option key={year} value={year}>{year}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <button
                                                            onClick={() => setShowRatingsDateDropdown(false)}
                                                            className="w-full bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700 transition-colors font-medium"
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Custom range picker */}
                                            {ratingsDateFilterType === 'Custom range' && (
                                                <div className="mt-2 pt-2 border-t border-gray-100">
                                                    <div className="flex flex-col gap-2">
                                                        <div>
                                                            <span className="text-[10px] text-gray-500 mb-1 block">From</span>
                                                            <input
                                                                type="date"
                                                                value={ratingsCustomFrom}
                                                                onChange={(e) => setRatingsCustomFrom(e.target.value)}
                                                                className="w-full text-xs border border-gray-300 rounded-md p-1.5"
                                                            />
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-gray-500 mb-1 block">To</span>
                                                            <input
                                                                type="date"
                                                                value={ratingsCustomTo}
                                                                onChange={(e) => setRatingsCustomTo(e.target.value)}
                                                                className="w-full text-xs border border-gray-300 rounded-md p-1.5"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                if (ratingsCustomFrom && ratingsCustomTo) {
                                                                    setShowRatingsDateDropdown(false);
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

                                            {/* Clear Filter button (resets to All) */}
                                            <div className="mt-3 pt-2 border-t border-gray-100">
                                                <button
                                                    onClick={() => {
                                                        setRatingsDateFilterType('All');
                                                        setRatingsSelectedYear(new Date().getFullYear());
                                                        setRatingsSelectedMonth(new Date().getMonth() + 1);
                                                        setRatingsSelectedMonthYear(new Date().getFullYear());
                                                        setRatingsCustomFrom('');
                                                        setRatingsCustomTo('');
                                                        setShowRatingsDateDropdown(false);
                                                    }}
                                                    disabled={ratingsDateFilterType === 'All'}
                                                    className={`w-full text-xs py-1.5 rounded border transition-colors ${
                                                        ratingsDateFilterType === 'All'
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

                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
                                
                                {/* Total Votes */}
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-1">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                            <MessageSquare size={18} className="text-blue-600" /> Total Votes
                                        </p>
                                        <div className="relative group">
                                            <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-48">
                                                <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center">
                                                    Number of relevance votes (helpful / not relevant) in the selected period.
                                                </div>
                                                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 mt-2">{formatNumber(currentVotes)}</p>
                                    {voteTrend !== null && (
                                        <div className="flex items-center text-xs text-gray-500 mt-1">
                                            <span className={`font-bold mr-1 ${voteTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {voteTrend > 0 ? '+' : ''}{voteTrend}
                                            </span>
                                            from {trendLabel}
                                        </div>
                                    )}
                                </div>

                                {/* Relevance Score */}
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-1">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                            <Star size={18} className="text-yellow-500" /> Relevance Score
                                        </p>
                                        <div className="relative group">
                                            <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-48">
                                                <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center">
                                                    Percentage of votes marked as helpful.
                                                </div>
                                                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-2 mt-2">
                                        <p className="text-2xl font-bold text-gray-900">{getRelevanceScore()}%</p>
                                        <span className="text-xs text-gray-400">satisfaction</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-1.5 rounded-full" style={{ width: `${getRelevanceScore()}%` }}></div>
                                    </div>
                                </div>

                                {/* Helpful */}
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-1">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                            <ThumbsUp size={18} className="text-green-600" /> Helpful
                                        </p>
                                        <div className="relative group">
                                            <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-48">
                                                <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center">
                                                    Number of materials rated as relevant.
                                                </div>
                                                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-green-600 mt-2">
                                        {filteredRatings.filter(r => r.relevant === true).length}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">Rated as relevant</p>
                                </div>

                                {/* Dormant Materials */}
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-1">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                            <LogOut size={18} className="text-purple-600" /> Dormant Materials
                                        </p>
                                        <div className="relative group">
                                            <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-48">
                                                <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center">
                                                    Number of materials that have never been accessed.
                                                </div>
                                                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 mt-2">{formatNumber(dormantCount)}</p>
                                    <p className="text-xs text-gray-400 mt-1">Never accessed</p>
                                </div>
                            </div>

                            {/* Top Rated & Least Accessed Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">

                                {/* 1. Top Rated Materials */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col h-full">
                                    <div className="flex items-center gap-1.5 mb-2 border-b border-gray-100 pb-3">
                                        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                            <ThumbsUp size={16} className="text-blue-600" />
                                            Top Rated Materials
                                        </h3>
                                        <div className="relative group">
                                            <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-64">
                                                <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center">
                                                    Materials ranked by a weighted score that balances positive votes and total votes to avoid "one‑hit wonders". Higher confidence materials appear first.
                                                </div>
                                                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto max-h-[300px] pr-1">
                                        {getTopMaterials(filteredRatings).length > 0 ? (
                                            getTopMaterials(filteredRatings).map((item, index) => {
                                                const maxCount = getTopMaterials(filteredRatings)[0].count;
                                                return (
                                                    <div
                                                        key={index}
                                                        className={`flex items-start gap-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-100 cursor-pointer ${
                                                            selectedMaterialFilter === item.title ? 'bg-green-100 border-green-300' : ''
                                                        }`}
                                                    >
                                                        <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                                                            index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                                            index === 1 ? 'bg-gray-100 text-gray-600' : 
                                                            index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-white border border-gray-200 text-gray-500'
                                                        }`}>
                                                            {index + 1}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium text-gray-800 truncate" title={item.title}>
                                                                {item.title}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className="h-full bg-blue-500 rounded-full" 
                                                                        style={{ width: `${(item.count / maxCount) * 100}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex-shrink-0 text-right">
                                                            <span className="text-xs font-bold mr-1" >{item.count}</span>
                                                            <span className="text-[10px] text-gray-400 block">likes</span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-400 min-h-[150px]">
                                                <Star size={24} className="mb-2 opacity-20" />
                                                <p className="text-xs">No positive ratings yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 2. Least Accessed Materials */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col h-full">
                                    <div className="flex items-center gap-1.5 mb-2 border-b border-gray-100 pb-3">
                                        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                            <LogOut size={16} className="text-red-500" />
                                            Top 8 Least Accessed Materials
                                        </h3>
                                        <div className="relative group">
                                            <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-64">
                                                <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center">
                                                    Materials with the lowest number of views. Consider reviewing these for potential archiving or promotion to increase engagement.
                                                </div>
                                                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto max-h-[450px] pr-1">
                                        {leastAccessedMaterials.length > 0 ? (
                                            <div className="space-y-2">
                                                {leastAccessedMaterials.slice(0, 8).map((item, index) => (
                                                    <div key={index} className="flex items-center justify-between p-1.5 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 group">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <div className="flex-shrink-0 bg-red-100 text-red-600 p-1.5 rounded-md">
                                                                <BookOpen size={14} className="text-red-600" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-medium text-gray-700 truncate group-hover:text-gray-900" title={item.title}>
                                                                    {item.title}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                    <Clock size={10} />
                                                                    Last accessed: {item.last_accessed ? new Date(item.last_accessed).toLocaleDateString() : 'Never'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex-shrink-0 text-right pl-2">
                                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold border border-gray-200">
                                                                {item.view_count || 0} views
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-400 min-h-[150px]">
                                                <BookOpen size={24} className="mb-2 opacity-20" />
                                                <p className="text-xs">No low-traffic materials found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Column 3: Rating Distribution (top) + placeholder (bottom) */}
                                <div className="flex flex-col gap-2 h-full min-h-[300px]">

                                    {/* Top half: Rating Distribution */}
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-1">
                                        <div className="flex items-center gap-1.5 mb-3">
                                            <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wide flex items-center gap-2">
                                                <BarChart3 size={16} className="text-blue-600" />
                                                Rating Distribution
                                            </h3>
                                            <div className="relative group">
                                                <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-64">
                                                    <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center">
                                                        Breakdown of all relevance votes (helpful vs. not relevant) within the selected date range.
                                                    </div>
                                                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                                </div>
                                            </div>
                                        </div>
                                        {filteredRatings.length > 0 ? (
                                            <div className="flex flex-col md:flex-row items-center gap-4">
                                                {/* Donut with centered total */}
                                                <div className="relative w-32 h-32 flex-shrink-0">
                                                    <div
                                                        className="w-full h-full rounded-full"
                                                        style={{
                                                            background: `conic-gradient(#22c55e 0% ${helpfulPercent}%, #ef4444 ${helpfulPercent}% 100%)`,
                                                            mask: 'radial-gradient(circle at 50% 50%, transparent 50%, black 51%)',
                                                            WebkitMask: 'radial-gradient(circle at 50% 50%, transparent 50%, black 51%)'
                                                        }}
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                                                        {filteredRatings.length} total
                                                    </div>
                                                </div>
                                                {/* Legend */}
                                                <div className="flex-1 space-y-1 px-6">
                                                    <div className="flex items-center gap-2 text-[10px]">
                                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }}></span>
                                                        <span className="flex-1">Helpful</span>
                                                        <span className="font-semibold text-gray-700">{helpfulCount} ({helpfulPercent.toFixed(1)}%)</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px]">
                                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></span>
                                                        <span className="flex-1">Not relevant</span>
                                                        <span className="font-semibold text-gray-700">{notRelevantCount} {(100 - helpfulPercent).toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                                No ratings yet
                                            </div>
                                        )}
                                    </div>

                                    {/* Rating Trend Chart */}
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-1">
                                        <div className="flex items-center justify-between mb-3 flex-wrap">
                                            <div className="flex items-center gap-1.5">
                                                <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wide flex items-center gap-2">
                                                    <TrendingUp size={16} className="text-blue-600" /> Rating Trend
                                                </h3>
                                                <div className="relative group">
                                                    <Info size={14} className="text-gray-400 cursor-help hover:text-gray-600" />
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none w-48">
                                                        <div className="bg-gray-800 text-white text-[10px] px-3 py-2 rounded shadow-lg text-center font-normal normal-case tracking-normal">
                                                            Average relevance score over time, based on your current date filter.
                                                        </div>
                                                        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-gray-500 italic">
                                                {ratingsDateFilterType === 'Year' && `(Monthly averages for ${ratingsSelectedYear})`}
                                                {ratingsDateFilterType === 'Month' && `(Weekly averages for ${new Date(0, ratingsSelectedMonth-1).toLocaleString('default', { month: 'long' })} ${ratingsSelectedMonthYear})`}
                                                {ratingsDateFilterType === 'Last 7 days' && '(Daily averages for the last 7 days)'}
                                                {ratingsDateFilterType === 'Custom range' && ratingsCustomFrom && ratingsCustomTo &&
                                                    `(Daily averages from ${new Date(ratingsCustomFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${new Date(ratingsCustomTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
                                                }
                                                {ratingsDateFilterType === 'All' && '(Monthly averages over all time)'}
                                            </span>
                                        </div>

                                        {(() => {
                                            const trendData = getRatingTrendData();
                                            const totalHelpful = filteredRatings.filter(r => r.relevant === true).length;
                                            const totalVotes = filteredRatings.length;
                                            const overallAvg = totalVotes > 0 ? (totalHelpful / totalVotes) * 100 : 0;

                                            if (trendData.length === 0) {
                                                return (
                                                    <div className="flex flex-1 items-center justify-center min-h-[120px] bg-blue-50 rounded-lg border border-dashed border-blue-200 mt-2">
                                                        <p className="text-sm text-blue-500 italic">No rating data available</p>
                                                    </div>
                                                );
                                            }

                                            const maxAvg = 100; // percentage scale
                                            const dataLen = trendData.length;

                                            // Helper to format Y-axis ticks (0–100%)
                                            const tick = (mult) => `${Math.round(maxAvg * mult)}%`;

                                            // Build points for the line chart (SVG coordinates)
                                            const points = trendData.map((item, i) => {
                                                const x = ((i + 0.5) / dataLen) * 100;
                                                const y = 100 - item.avgScore; // invert for SVG (0 at top, 100 at bottom)
                                                return { x, y, ...item };
                                            });

                                            const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                                            const areaPath = `${linePath} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;

                                            return (
                                                <>
                                                    {/* Overall average score displayed prominently */}
                                                    <p className="text-2xl font-bold text-gray-900">{overallAvg.toFixed(1)}%</p>
                                                    <p className="text-xs text-gray-500 mb-2">average relevance in this period ({totalVotes} votes)</p>

                                                    <div className="flex w-full mt-6 h-[150px] relative">
                                                        {/* Y-Axis Labels */}
                                                        <div className="relative w-10 shrink-0">
                                                            <span className="absolute right-2 top-0 -translate-y-1/2 text-[10px] text-gray-400 font-medium">{tick(1)}</span>
                                                            <span className="absolute right-2 top-[25%] -translate-y-1/2 text-[10px] text-gray-400 font-medium">{tick(0.75)}</span>
                                                            <span className="absolute right-2 top-[50%] -translate-y-1/2 text-[10px] text-gray-400 font-medium">{tick(0.5)}</span>
                                                            <span className="absolute right-2 top-[75%] -translate-y-1/2 text-[10px] text-gray-400 font-medium">{tick(0.25)}</span>
                                                            <span className="absolute right-2 bottom-0 translate-y-1/2 text-[10px] text-gray-400 font-medium">0%</span>
                                                        </div>

                                                        {/* Chart Area */}
                                                        <div className="flex-1 relative border-b-2 border-l-2 border-gray-200">
                                                            {/* Horizontal Grid Lines */}
                                                            <div className="absolute inset-x-0 top-0 border-t border-dashed border-gray-200 z-0"></div>
                                                            <div className="absolute inset-x-0 top-[25%] border-t border-dashed border-gray-200 z-0"></div>
                                                            <div className="absolute inset-x-0 top-[50%] border-t border-dashed border-gray-200 z-0"></div>
                                                            <div className="absolute inset-x-0 top-[75%] border-t border-dashed border-gray-200 z-0"></div>

                                                            {/* SVG for area and line */}
                                                            <div className="absolute inset-0 w-full h-full overflow-visible z-10">
                                                                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                                                    <defs>
                                                                        <linearGradient id="ratingGradient" x1="0" x2="0" y1="0" y2="1">
                                                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                                                                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                                                                        </linearGradient>
                                                                    </defs>
                                                                    <path d={areaPath} fill="url(#ratingGradient)" />
                                                                    <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                            </div>

                                                            {/* Overlay for tooltips, dots, and x‑axis labels */}
                                                            <div className="absolute inset-0 flex z-20">
                                                                {points.map((p, i) => {
                                                                    const isFirst = i === 0;
                                                                    const isLast = i === dataLen - 1;
                                                                    let tooltipClass = "left-1/2 -translate-x-1/2";
                                                                    let arrowClass = "left-1/2 -translate-x-1/2";

                                                                    if (isFirst) {
                                                                        tooltipClass = "left-1/2 -translate-x-3";
                                                                        arrowClass = "left-3";
                                                                    } else if (isLast) {
                                                                        tooltipClass = "right-1/2 translate-x-3";
                                                                        arrowClass = "right-3";
                                                                    }

                                                                    return (
                                                                        <div key={`hover-${i}`} className="flex-1 relative group cursor-default h-full flex justify-center hover:z-50">
                                                                            {/* Ghost hover highlight */}
                                                                            <div className="absolute inset-y-0 w-[80%] max-w-[32px] z-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors rounded-sm"></div>

                                                                            {/* Dot and tooltip anchor */}
                                                                            <div
                                                                                className="absolute z-20 flex justify-center items-center"
                                                                                style={{ top: `${p.y}%`, transform: 'translateY(-50%)' }}
                                                                            >
                                                                                <div className={`w-2.5 h-2.5 bg-white border-[2px] border-blue-600 rounded-full transition-transform group-hover:scale-[1.4] shadow-sm ${p.avgScore === 0 ? 'opacity-30 group-hover:opacity-100' : 'opacity-100'}`} />

                                                                                {/* Tooltip */}
                                                                                <div className={`absolute bottom-full mb-2 hidden group-hover:flex flex-col z-50 pointer-events-none w-max ${tooltipClass}`}>
                                                                                    <div className="bg-gray-800 text-white text-[10px] px-3 py-1.5 rounded shadow-lg whitespace-nowrap text-center leading-tight border border-gray-700">
                                                                                        <div className="font-semibold text-gray-200">{p.tooltipRange}</div>
                                                                                        <div>{p.avgScore.toFixed(1)}% helpful ({p.helpful}/{p.count} votes)</div>
                                                                                    </div>
                                                                                    <div className={`absolute -bottom-[4px] w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800 ${arrowClass}`}></div>
                                                                                </div>
                                                                            </div>

                                                                            {/* X-Axis Label */}
                                                                            <div className="absolute -bottom-7 text-[9px] text-gray-500 font-bold uppercase whitespace-nowrap text-center">
                                                                                {p.displayLabel}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="h-8 w-full"></div> {/* spacer for x‑axis labels */}
                                                </>
                                            );
                                        })()}
                                    </div>
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
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#1E74BC] to-[#155a8f] text-white p-4">
                        <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Settings size={24} />
                            Account Settings
                        </h2>
                        <button
                            onClick={() => setShowAccountSettings(false)}
                            className="text-white hover:text-gray-200 transition-colors"
                        >
                            <X size={24} />
                        </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200">
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
                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={editFullName}
                                onChange={(e) => setEditFullName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-black focus:outline-none"
                                required
                            />
                            </div>
                            <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Username
                            </label>
                            <input
                                type="text"
                                value={editUsername}
                                onChange={(e) => setEditUsername(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-black focus:outline-none"
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
                        </form>
                        )}

                        {settingsTab === 'password' && (
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            {/* Current Password */}
                            <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Current Password
                            </label>
                            <div className="relative">
                                <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-black focus:outline-none pr-10"
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

                            {/* New Password */}
                            <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-black focus:outline-none pr-10"
                                required
                                minLength={8}
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

                            {/* Confirm New Password */}
                            <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-black focus:outline-none pr-10"
                                required
                                minLength={8}
                                />
                                <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            </div>

                            {/* Password hint */}
                            <p className="text-xs text-gray-500 mt-1">
                            Password must be at least 8 characters long
                            </p>

                            <button
                            type="submit"
                            disabled={settingsLoading}
                            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                            {settingsLoading ? (
                                <>
                                <RefreshCw size={16} className="animate-spin" />
                                Updating...
                                </>
                            ) : (
                                <>
                                <Key size={16} />
                                Change Password
                                </>
                            )}
                            </button>
                        </form>
                        )}
                    </div>
                    </div>
                </div>
                )}
            </div>
        </>
    );
};

export default AdminDashboard;