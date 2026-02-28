import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LitPathAI from './pages/LitPathAI';
import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import FeedbackForm from './pages/FeedbackForm';
import FeedbackDetail from './pages/FeedbackDetail';
import ResetPassword from './pages/ResetPassword';

// ------------------------------------------------------------
//  Protected Route
// ------------------------------------------------------------
const ProtectedRoute = ({ children, requireStaff = false }: { children: React.ReactNode; requireStaff?: boolean }) => {
    const { user, loading, isStaff } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (requireStaff && !isStaff()) {
        return <Navigate to="/search" replace />;
    }

    return children;
};

// ------------------------------------------------------------
//  Auth Route – redirect if already logged in
// ------------------------------------------------------------
const AuthRoute = ({ children }: { children: React.ReactNode }) => {

    const { user, loading } = useAuth();
    const location = useLocation();
    // Check for ?mode=login in URL using useLocation
    const urlParams = new URLSearchParams(location.search);
    const isLoginMode = urlParams.get('mode') === 'login';

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (user) {
        // Allow guest to see login form if ?mode=login
        if (user.role === 'guest' && isLoginMode) {
            return children;
        }
        if (user.role === 'admin' || user.role === 'staff') {
            return <Navigate to="/admin/dashboard" replace />;
        }
        return <Navigate to="/search" replace />;
    }

    return children;
};

// ------------------------------------------------------------
//  Redirect from old /admin/feedback (list) to dashboard with state
// ------------------------------------------------------------
const RedirectToFeedbackTab = () => {
    return <Navigate to="/admin/dashboard" replace state={{ activeTab: 'feedback' }} />;
};

// ------------------------------------------------------------
//  Main Routes
// ------------------------------------------------------------
const AppContent = () => {
    return (
        <Routes>
            {/* Auth page */}
            <Route path="/" element={<AuthRoute><AuthPage /></AuthRoute>} />

            {/* Legacy login redirect */}
            <Route path="/login" element={<Navigate to="/" replace />} />

            {/* Search page – requires auth (including guest) */}
            <Route path="/search" element={<ProtectedRoute><LitPathAI /></ProtectedRoute>} />

            {/* Admin dashboard – main staff/admin hub */}
            <Route path="/admin/dashboard" element={<ProtectedRoute requireStaff={true}><AdminDashboard /></ProtectedRoute>} />

            {/* Redirect old /admin/feedback (list) to dashboard with feedback tab active */}
            <Route path="/admin/feedback" element={<ProtectedRoute requireStaff={true}><RedirectToFeedbackTab /></ProtectedRoute>} />

            {/* ✅ DETAIL PAGE – still exists, back button returns to dashboard */}
            <Route path="/admin/feedback/:id" element={<ProtectedRoute requireStaff={true}><FeedbackDetail /></ProtectedRoute>} />

            {/* CSM Feedback Form */}
            <Route path="/feedback-form" element={<ProtectedRoute><FeedbackForm /></ProtectedRoute>} />

            {/* Reset password */}
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

// ------------------------------------------------------------
//  App
// ------------------------------------------------------------
function App() {
    return (
        <Router>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </Router>
    );
}

export default App;