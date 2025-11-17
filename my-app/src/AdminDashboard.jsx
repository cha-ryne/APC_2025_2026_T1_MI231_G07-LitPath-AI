import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom"; 
import { Line } from 'react-chartjs-2';
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    PointElement, 
    LineElement, 
    ArcElement, 
    Tooltip, 
    Legend, 
    Title 
} from 'chart.js';
import {
    LogOut,
    Star,
    Bookmark, 
    BookOpen,
    BarChart2,
    TrendingUp,
    AlertCircle,
    MessageSquare,
    Clock,
    Users, 
    ChevronDown, 
    Filter,
} from "lucide-react";
import dostLogo from "./components/images/dost-logo.png"; 

// Register Chart.js components globally
ChartJS.register(
    CategoryScale, 
    LinearScale, 
    PointElement, 
    LineElement, 
    ArcElement, 
    Tooltip, 
    Legend, 
    Title
);

// Helper function to format numbers
const formatNumber = (num) => num.toLocaleString();

const AdminDashboard = () => {
    const navigate = useNavigate();
    
    const [dateRange, setDateRange] = useState('7_days'); 
    const [filterType, setFilterType] = useState('All'); 

    // Mock statistics
    const stats = {
        totalViews: 47892,
        bookmarks: 3264,
        activeUsers: 2847,
        citations: 8743,
        relatedPapers: 12459,
        totalTheses: 15692,
        avgSession: 4.2,
    };

    // MOCK DATA FOR CHARTS
    const dailyActivityTrends = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: [2400, 1300, 7000, 3000, 5100, 2200, 3000],
    };
    
    // NEW MOCK DATA FOR FEEDBACK TRENDS
    const feedbackVolumeTrends = {
        labels: ['Day -6', 'Day -5', 'Day -4', 'Day -3', 'Day -2', 'Day -1', 'Today'],
        data: [10, 12, 7, 23, 24, 13, 11], // Number of feedback/issues per day
    };

    const thesisCategoriesDistribution = {
        labels: ['Computer Science', 'Environmental Science', 'Business', 'Education', 'Others'],
        data: [25, 22, 18, 15, 20], 
        colors: ['#4A90E2', '#7ED321', '#F5A623', '#BD10E0', '#9B9B9B'],
    };

    
    // Daily Activity Line Chart
    const dailyActivityChartData = {
        labels: dailyActivityTrends.labels,
        datasets: [
            {
                label: 'Daily Activity',
                data: dailyActivityTrends.data,
                fill: true,
                backgroundColor: 'rgba(74, 144, 226, 0.4)',
                borderColor: '#4A90E2',
                tension: 0.3,
            },
        ],
    };

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false },
        },
        scales: {
            x: {
                grid: { display: false },
            },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.05)' },
            },
        },
    };

    // Feedback Volume Line Chart
    const feedbackVolumeChartData = {
        labels: feedbackVolumeTrends.labels,
        datasets: [
            {
                label: 'Feedback Volume',
                data: feedbackVolumeTrends.data,
                fill: true,
                backgroundColor: 'rgba(34, 197, 94, 0.3)', // Green shade
                borderColor: '#22C55E',
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 5,
            },
        ],
    };

    // Other Mock Data
    const MOCK_POPULAR_SEARCHES = [
        'AI Ethics in Philippine Education',
        'COVID-19 Impact on Local Fisheries',
        'Geothermal Energy Innovations',
        'E-Government Implementation',
        'Indigenous Language Preservation',
    ];
    
    const monitoring = [
        { label: "System Uptime", value: "98.7%", color: "text-green-600", icon: <TrendingUp /> },
        { label: "Active Feedback", value: "102", color: "text-blue-600", icon: <MessageSquare /> },
        { label: "Pending Issues", value: "1", color: "text-yellow-600", icon: <AlertCircle /> },
        { label: "System Rating", value: "5.0", color: "text-purple-600", icon: <Star /> },
    ];

    const feedbackList = [
        { id: 1, message: "Database query timeout on user search", date: "2 days ago" },
        { id: 2, message: "System monitoring integrated with user tracking", date: "3 days ago" },
        { id: 3, message: "User suggestion: Add dark mode toggle", date: "1 week ago" },
    ];

    const handleLogout = () => {
        navigate("/login");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
            {/* Header */}
            <div className="bg-[#1F1F1F] text-white p-4 shadow-md">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center space-x-4">
                        <img src={dostLogo} alt="DOST SciNet-Phil Logo" className="h-12 w-50" />
                        <div className="text-xl font-bold">DOST UNION CATALOG</div>
                        <div className="text-sm border-l border-white pl-4 ml-4">
                            LitPath AI: <br /> Smart PathFinder of Theses and Dissertation
                        </div>
                    </div>
                    <nav className="flex space-x-6 items-center">
                        <a
                            href="http://scinet.dost.gov.ph/#/opac"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-200 transition-colors"
                        >
                            Online Public Access Catalog
                        </a>
                        <Link
                            to="/"
                            className="font-bold text-blue-200 hover: transition-colors"
                        >
                            LitPath AI
                        </Link>
                    </nav>
                </div>
            </div>

            {/* Dashboard Content */}
            <div className="flex-1 max-w-7xl mx-auto w-full p-6">
                
                {/* Title and Filter Controls */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Welcome back, Librarian!</h1>
                    <div className="flex space-x-3">
                        <div className="relative">
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-3 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition duration-150"
                            >
                                <option value="7_days">Last 7 Days</option>
                                <option value="30_days">Last 30 Days</option>
                                <option value="90_days">Last 90 Days</option>
                                <option value="all_time">All Time</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <ChevronDown size={16} />
                            </div>
                        </div>
                        <button
                            onClick={() => alert(`Filtering data by: ${dateRange} and Type: ${filterType}`)}
                            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition duration-150 text-sm font-medium"
                        >
                            <Filter size={16} />
                            <span>Filter</span>
                        </button>
                    </div>
                </div>

                {/* Top Charts and Lists */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    
                    {/* Daily Activity Trend */}
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h2 className="font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                            <BarChart2 className="text-blue-600" /> <span>Daily Activity Trends (Last 7 Days)</span>
                        </h2>
                        {/* CHART IMPLEMENTATION */}
                        <div className="h-48 p-3"> 
                            <Line data={dailyActivityChartData} options={lineChartOptions} />
                        </div>
                    </div>

                    {/* Most Cited Theses */}
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h2 className="font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                            <BookOpen className="text-indigo-600" /> <span>Most Cited Theses</span>
                        </h2>
                        <ul className="text-sm space-y-2 text-gray-700">
                            <li>1. Deep Learning Applications in Medical Imaging</li>
                            <li>2. Renewable Energy Optimization Models</li>
                            <li>3. Blockchain Integration in Supply Chain Management</li>
                            <li>4. Climate Change Adaptation Policies</li>
                            <li>5. Advanced Natural Language Systems</li>
                        </ul>
                    </div>
                </div>

                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">                    
                    {/* Popular Searches */}
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h2 className="font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                            <TrendingUp className="text-red-500" /> <span>Popular Searches</span>
                        </h2>
                        <ul className="text-sm space-y-2 text-gray-700">
                            {MOCK_POPULAR_SEARCHES.map((search, index) => (
                                <li key={index} className="flex justify-between items-center border-b border-gray-100 pb-1">
                                    <span className="font-medium">
                                        {index + 1}. {search}
                                    </span>
                                    <span className="text-xs text-gray-400">({formatNumber(Math.floor(Math.random() * 500) + 50)} hits)</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* STATS GROUP */}
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4"> 
                            <StatCard label="Total Views" value={formatNumber(stats.totalViews)} icon={<EyeIcon />} colorClass="text-blue-600" />
                            <StatCard label="Bookmarks" value={formatNumber(stats.bookmarks)} icon={<Bookmark />} colorClass="text-purple-600" />
                            <StatCard label="Citation Clicks" value={formatNumber(stats.citations)} icon={<BookOpen />} colorClass="text-green-600" /> 
                            <StatCard label="Related Papers" value={formatNumber(stats.relatedPapers)} icon={<FileIcon />} colorClass="text-orange-600" />
                        </div>
                        <GroupedStatCard stats={stats} formatNumber={formatNumber} />
                    </div>
                </div>

                {/* System Monitoring */}
                <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        System Monitoring & Feedback
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {monitoring.map((item, i) => (
                            <div
                                key={i}
                                className="flex flex-col items-center bg-gray-50 rounded-lg p-4 shadow-sm"
                            >
                                <div className={`${item.color} mb-2`}>{item.icon}</div>
                                <p className="text-lg font-bold text-gray-800">{item.value}</p>
                                <p className="text-sm text-gray-500">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Feedback Volume Trends */}
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h2 className="font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                            <TrendingUp className="text-green-600" /> <span>Feedback Volume Trends (Last 7 Days)</span>
                        </h2>
                        {/* CHART IMPLEMENTATION */}
                        <div className="h-48 p-3">
                             <Line data={feedbackVolumeChartData} options={lineChartOptions} />
                        </div>
                    </div>

                    {/* Recent Feedback */}
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h2 className="font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                            <MessageSquare className="text-indigo-600" /> <span>Recent Feedback & Issues</span>
                        </h2>
                        <ul className="text-sm space-y-3">
                            {feedbackList.map((fb) => (
                                <li
                                    key={fb.id}
                                    className="border-b border-gray-100 pb-2 last:border-none text-gray-700"
                                >
                                    <p className="font-medium">{fb.message}</p>
                                    <p className="text-xs text-gray-500">{fb.date}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

            </div>

            {/* Logout Button */}
            <div className="fixed bottom-8 right-8 z-50">
                <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-full hover:bg-red-700 transition-all shadow-xl font-semibold text-lg"
                >
                    <LogOut size={20} />
                    <span>Log Out</span>
                </button>
            </div>
        </div>
    );
};

// Grouped Stat Card 
const GroupedStatCard = ({ stats, formatNumber }) => (
    <div className="bg-white rounded-xl shadow-md p-4 flex flex-col justify-between">
        <div className="text-xs font-bold text-gray-700 mb-2 border-b pb-1">Operational Summary</div>
        <div className="grid grid-cols-3 divide-x divide-gray-200">
            {/* Active Users */}
            <div className="flex flex-col items-center justify-center px-1">
                <div className="text-blue-600 mb-1"><Users size={20} /></div>
                <p className="text-xl font-bold text-gray-800">{formatNumber(stats.activeUsers)}</p>
                <p className="text-xs text-gray-500 text-center">Active Users</p>
            </div>
            {/* Total Thesis */}
            <div className="flex flex-col items-center justify-center px-1">
                <div className="text-green-600 mb-1"><BookOpen size={20} /></div>
                <p className="text-xl font-bold text-gray-800">{formatNumber(stats.totalTheses)}</p>
                <p className="text-xs text-gray-500 text-center">Total Theses</p>
            </div>
            {/* Avg. Session Duration (min) */}
            <div className="flex flex-col items-center justify-center px-1">
                <div className="text-yellow-600 mb-1"><Clock size={20} /></div>
                <p className="text-xl font-bold text-gray-800">{stats.avgSession}</p>
                <p className="text-xs text-gray-500 text-center">Avg Session (min)</p>
            </div>
        </div>
    </div>
);

// Reusable Stat Card 
const StatCard = ({ label, value, icon, colorClass }) => (
    <div className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center justify-center">
        <div className={`${colorClass} mb-2`}>{icon}</div>
        <p className="text-xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
    </div>
);

// Placeholder icons 
const EyeIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>;
const FileIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;

export default AdminDashboard;