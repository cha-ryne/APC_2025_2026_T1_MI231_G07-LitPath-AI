import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import {
    LayoutDashboard, MessageSquare, Star, LogOut, Settings,
    ShieldCheck, ChevronDown, Eye, Search, ThumbsUp, ThumbsDown,
    Clock, Bookmark, AlertCircle, TrendingUp, BookOpen, CheckCircle,
    X, EyeOff, Menu, Calendar, Users, ChevronLeft, ChevronRight,
    Trophy, Medal, Briefcase, GraduationCap, BarChart3, Copy, Info,
    User, Key, RefreshCw, Download
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

    // ---------- DASHBOARD FETCH FUNCTIONS (all use getDateRange()) ----------
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
            fetchTrends() // fetch trends with the new granularity & date filter
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
            fetchTrends();
        }
        if (activeTab === 'feedback') fetchFeedback();
        if (activeTab === 'ratings') fetchMaterialRatings();
    }, [
        activeTab,
        overviewDateFilterType,
        overviewSelectedYear,
        overviewSelectedMonth,
        overviewSelectedMonthYear,
        overviewCustomFrom,
        overviewCustomTo
    ]);

    // ---------- Click outside handlers ----------
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
            if (feedbackDateDropdownRef.current && !feedbackDateDropdownRef.current.contains(event.target)) {
                const isInput = event.target.tagName === 'INPUT';
                if (!isInput) setShowFeedbackDateDropdown(false);
            }
            if (ratingDropdownRef.current && !ratingDropdownRef.current.contains(event.target)) {
                setShowRatingDropdown(false);
            }
            if (overviewDateDropdownRef.current && !overviewDateDropdownRef.current.contains(event.target)) {
                const isInput = event.target.tagName === 'INPUT';
                if (!isInput) setShowOverviewDateDropdown(false);
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

    // ---------- Export Data to CSV ----------
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

    // ---------- Render ----------
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
                                            <span>Export Report</span>
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
                                                    {overviewDateFilterType === 'Year' && `(Monthly report for year ${overviewSelectedYear})`}
                                                    {overviewDateFilterType === 'Month' && `(Weekly report for ${new Date(0, overviewSelectedMonth - 1).toLocaleString('default', { month: 'long' })} ${overviewSelectedMonthYear})`}
                                                    {overviewDateFilterType === 'Last 7 days' && '(Report from the last 7 days)'}
                                                    {overviewDateFilterType === 'Custom range' && overviewCustomFrom && overviewCustomTo &&
                                                        `(Report from ${new Date(overviewCustomFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${new Date(overviewCustomTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
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
                                                {overviewDateFilterType === 'Year' && `(Monthly report for year ${overviewSelectedYear})`}
                                                {overviewDateFilterType === 'Month' && `(Weekly report for ${new Date(0, overviewSelectedMonth - 1).toLocaleString('default', { month: 'long' })} ${overviewSelectedMonthYear})`}
                                                {overviewDateFilterType === 'Last 7 days' && '(Report from the last 7 days)'}
                                                {overviewDateFilterType === 'Custom range' && overviewCustomFrom && overviewCustomTo &&
                                                    `(Report from ${new Date(overviewCustomFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${new Date(overviewCustomTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
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
                                    {/* Date Filter Dropdown */}
                                    <div className="relative" ref={feedbackDateDropdownRef}>
                                        <button
                                            onClick={() => setShowFeedbackDateDropdown(!showFeedbackDateDropdown)}
                                            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-600 hover:bg-gray-50 text-xs font-medium"
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
                                            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-600 hover:bg-gray-50 text-xs font-medium"
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