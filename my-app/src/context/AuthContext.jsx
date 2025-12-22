import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, sessionHelpers } from '../lib/supabase';

const API_BASE_URL = 'http://localhost:8000/api';

// Auth Context
const AuthContext = createContext(null);

// User roles
export const USER_ROLES = {
    GUEST: 'guest',
    USER: 'user',
    STAFF: 'staff',
    ADMIN: 'admin'
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(false);

    // Initialize auth state on mount
    useEffect(() => {
        initializeAuth();
    }, []);

    // Initialize authentication state
    const initializeAuth = async () => {
        setLoading(true);
        try {
            // Check for existing authenticated user in localStorage (from backend)
            const storedUser = localStorage.getItem('litpath_auth_user');
            const storedSession = localStorage.getItem('litpath_session');

            if (storedUser && storedSession) {
                const userData = JSON.parse(storedUser);
                const sessionData = JSON.parse(storedSession);
                
                // Verify session is still valid with backend
                const isValid = await validateSession(sessionData.session_id);
                
                if (isValid) {
                    setUser(userData);
                    setSession(sessionData);
                    setIsGuest(userData.role === USER_ROLES.GUEST);
                } else {
                    // Session expired, clear local data
                    clearAuthData();
                }
            }
        } catch (error) {
            console.error('Error initializing auth:', error);
            clearAuthData();
        } finally {
            setLoading(false);
        }
    };

    // Validate session with backend
    const validateSession = async (sessionId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/validate-session/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            });
            const data = await response.json();
            return data.valid === true;
        } catch (error) {
            console.error('Session validation error:', error);
            return false;
        }
    };

    // Login with email and password
    const login = async (email, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                const userData = {
                    id: data.user.id,
                    email: data.user.email,
                    username: data.user.username,
                    full_name: data.user.full_name,
                    role: data.user.role
                };

                const sessionData = {
                    session_id: data.session.session_id,
                    created_at: data.session.created_at,
                    is_anonymous: false
                };

                // Store in localStorage (not for guests)
                localStorage.setItem('litpath_auth_user', JSON.stringify(userData));
                localStorage.setItem('litpath_session', JSON.stringify(sessionData));

                // Also sync to Supabase for real-time features if needed
                await syncSessionToSupabase(sessionData, userData.id);

                setUser(userData);
                setSession(sessionData);
                setIsGuest(false);

                return { success: true, user: userData };
            } else {
                return { success: false, error: data.message || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Connection error. Please try again.' };
        }
    };

    // Continue as guest
    const continueAsGuest = async () => {
        try {
            // Create guest session via backend
            const response = await fetch(`${API_BASE_URL}/auth/guest-session/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (data.success) {
                const guestUser = {
                    id: data.session.guest_id,
                    email: null,
                    username: 'Guest',
                    full_name: 'Guest User',
                    role: USER_ROLES.GUEST
                };

                const sessionData = {
                    session_id: data.session.session_id,
                    created_at: data.session.created_at,
                    is_anonymous: true,
                    guest_id: data.session.guest_id
                };

                // Store guest session in both localStorage (temporary) and Supabase
                localStorage.setItem('litpath_guest_session', JSON.stringify(sessionData));
                
                // Sync to Supabase for data persistence
                await syncSessionToSupabase(sessionData, null);

                setUser(guestUser);
                setSession(sessionData);
                setIsGuest(true);

                return { success: true, user: guestUser };
            } else {
                // Fallback to local-only guest session
                return createLocalGuestSession();
            }
        } catch (error) {
            console.error('Guest session error:', error);
            // Fallback to local-only guest session
            return createLocalGuestSession();
        }
    };

    // Create local-only guest session (fallback)
    const createLocalGuestSession = () => {
        const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const guestUser = {
            id: guestId,
            email: null,
            username: 'Guest',
            full_name: 'Guest User',
            role: USER_ROLES.GUEST
        };

        const sessionData = {
            session_id: `session_${Date.now()}`,
            created_at: new Date().toISOString(),
            is_anonymous: true,
            guest_id: guestId,
            local_only: true
        };

        localStorage.setItem('litpath_guest_session', JSON.stringify(sessionData));

        setUser(guestUser);
        setSession(sessionData);
        setIsGuest(true);

        return { success: true, user: guestUser };
    };

    // Sync session to Supabase
    const syncSessionToSupabase = async (sessionData, userId) => {
        try {
            const { error } = await supabase
                .from('sessions')
                .upsert({
                    session_id: sessionData.session_id,
                    session_is_anonymous: sessionData.is_anonymous,
                    session_created_at: sessionData.created_at,
                    session_last_seen: new Date().toISOString(),
                    user_accounts_user_id: userId
                });

            if (error) {
                console.error('Error syncing session to Supabase:', error);
            }
        } catch (error) {
            console.error('Supabase sync error:', error);
        }
    };

    // Logout
    const logout = async () => {
        try {
            // End session on backend
            if (session?.session_id) {
                await fetch(`${API_BASE_URL}/auth/logout/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: session.session_id })
                });
            }

            // Clear Supabase session
            if (session?.session_id) {
                await sessionHelpers.deleteGuestSession(session.session_id);
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            clearAuthData();
        }
    };

    // Start new chat (for guests - clears localStorage data)
    const startNewChat = useCallback(async () => {
        if (isGuest) {
            // Delete guest data from Supabase
            if (session?.session_id) {
                await sessionHelpers.deleteGuestSession(session.session_id);
            }
            
            // Clear all guest localStorage data for privacy on public devices
            sessionHelpers.clearGuestLocalStorage();
            
            // Create a new guest session
            return await continueAsGuest();
        }
        
        // For authenticated users, just clear conversation but keep account
        return { success: true, user };
    }, [isGuest, session, user]);

    // Clear all auth data
    const clearAuthData = () => {
        localStorage.removeItem('litpath_auth_user');
        localStorage.removeItem('litpath_session');
        localStorage.removeItem('litpath_guest_session');
        sessionHelpers.clearGuestLocalStorage();
        setUser(null);
        setSession(null);
        setIsGuest(false);
    };

    // Update session activity (call periodically)
    const updateActivity = useCallback(async () => {
        if (session?.session_id) {
            await sessionHelpers.updateSessionActivity(session.session_id);
        }
    }, [session]);

    // Get user ID for API calls
    const getUserId = useCallback(() => {
        if (user) {
            return user.id;
        }
        return null;
    }, [user]);

    // Check if user is authenticated (not guest)
    const isAuthenticated = useCallback(() => {
        return user && user.role !== USER_ROLES.GUEST;
    }, [user]);

    // Check if user has specific role
    const hasRole = useCallback((role) => {
        return user?.role === role;
    }, [user]);

    // Check if user is staff or admin
    const isStaff = useCallback(() => {
        return user?.role === USER_ROLES.STAFF || user?.role === USER_ROLES.ADMIN;
    }, [user]);

    const value = {
        user,
        session,
        loading,
        isGuest,
        login,
        logout,
        continueAsGuest,
        startNewChat,
        updateActivity,
        getUserId,
        isAuthenticated,
        hasRole,
        isStaff,
        USER_ROLES
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
