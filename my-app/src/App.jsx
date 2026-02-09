import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LitPathAI from './LitPathAI';
import Login from './Login';
import AuthPage from './AuthPage';
import AdminDashboard from './AdminDashboard';
import FeedbackManager from './FeedbackManager';
import FeedbackDetail from './FeedbackDetail';
import FeedbackForm from './FeedbackForm';
import ResetPassword from './ResetPassword';

// Protected Route component - requires authentication (user, staff, or admin)
const ProtectedRoute = ({ children, requireStaff = false }) => {
    const { user, loading, isGuest, isStaff } = useAuth();

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

    // If no user at all, redirect to auth page
    if (!user) {
        return <Navigate to="/" replace />;
    }

    // If staff access is required, check role
    if (requireStaff && !isStaff()) {
        return <Navigate to="/search" replace />;
    }

    return children;
};

// Auth Route - redirect if already authenticated
const AuthRoute = ({ children }) => {
    const { user, loading } = useAuth();

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

    // If already logged in, redirect to appropriate page
    if (user) {
        if (user.role === 'admin' || user.role === 'staff') {
            return <Navigate to="/admin/dashboard" replace />;
        }
        return <Navigate to="/search" replace />;
    }

    return children;
};

// Main App Content with Routes
const AppContent = () => {
    return (
        <Routes>
            {/* Auth page - landing page with login/register/guest options */}
            <Route 
                path="/" 
                element={
                    <AuthRoute>
                        <AuthPage />
                    </AuthRoute>
                } 
            />
            
            {/* Legacy login page - redirects to new auth page */}
            <Route 
                path="/login" 
                element={<Navigate to="/" replace />} 
            />

            {/* Search page - requires authentication (including guest) */}
            <Route 
                path="/search" 
                element={
                    <ProtectedRoute>
                        <LitPathAI />
                    </ProtectedRoute>
                } 
            />

            {/* Admin dashboard - requires staff or admin role */}
            <Route 
                path="/admin/dashboard" 
                element={
                    <ProtectedRoute requireStaff={true}>
                        <AdminDashboard />
                    </ProtectedRoute>
                } 
            />

            <Route 
                path="/admin/feedback" 
                element={
                    <ProtectedRoute requireStaff={true}>
                        <FeedbackManager />
                    </ProtectedRoute>
                } 
            />

            {/* The Detail Page */}
            <Route 
                path="/admin/feedback/:id" 
                element={
                    <ProtectedRoute requireStaff={true}>
                        <FeedbackDetail />
                    </ProtectedRoute>
                } 
            />

            {/* Reset password page */}
            <Route 
                path="/reset-password/:token" 
                element={<ResetPassword />} 
            />

            {/* CSM Feedback Form page - requires authentication */}
            <Route 
                path="/feedback-form" 
                element={
                    <ProtectedRoute>
                        <FeedbackForm />
                    </ProtectedRoute>
                } 
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

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