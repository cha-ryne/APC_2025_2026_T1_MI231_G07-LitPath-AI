import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

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
    const [showInactivityWarning, setShowInactivityWarning] = useState(false);
    const logoutTimerRef = useRef(null);
    const warningTimerRef = useRef(null);
    const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 min
    const WARNING_TIME = 30 * 1000; // 30 sec

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

                // Ensure sessionData includes session_token for API auth
                const sessionData = {
                    session_id: data.session.session_id,
                    created_at: data.session.created_at,
                    is_anonymous: false,
                    session_token: data.session.session_token || data.session.session_id // fallback if session_token not present
                };

                // Store in localStorage (not for guests)
                localStorage.setItem('litpath_auth_user', JSON.stringify(userData));
                localStorage.setItem('litpath_session', JSON.stringify(sessionData));

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

                // Store guest session in localStorage (temporary)
                localStorage.setItem('litpath_guest_session', JSON.stringify(sessionData));
                
                // No need to sync - Django writes directly to Supabase PostgreSQL

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

    // Logout
    const logout = async () => {
        try {
            // End session on backend (Django handles Supabase PostgreSQL directly)
            if (session?.session_id) {
                await fetch(`${API_BASE_URL}/auth/logout/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: session.session_id })
                });
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
            // Clear all guest localStorage data for privacy on public devices
            clearGuestLocalStorage();
            
            // Create a new guest session
            return await continueAsGuest();
        }
        
        // For authenticated users, just clear conversation but keep account
        return { success: true, user };
    }, [isGuest, session, user]);

    // Clear guest localStorage helper
    const clearGuestLocalStorage = () => {
        const keysToRemove = [
            'litpath_user_id',
            'litpath_bookmarks',
            'litpath_research_history',
            'litpath_guest_session',
            'litpath_conversation'
        ];
        keysToRemove.forEach(key => localStorage.removeItem(key));
    };

    // Clear all auth data
    const clearAuthData = () => {
        localStorage.removeItem('litpath_auth_user');
        localStorage.removeItem('litpath_session');
        localStorage.removeItem('litpath_guest_session');
        clearGuestLocalStorage();
        setUser(null);
        setSession(null);
        setIsGuest(false);
    };

    // Update session activity (call periodically) - handled by Django/Supabase
    const updateActivity = useCallback(async () => {
        // Activity is tracked by Django which writes to Supabase PostgreSQL
        // No additional client-side sync needed
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

    // Change password
    const changePassword = async (currentPassword, newPassword) => {
        if (!user || isGuest) {
            return { success: false, error: 'Must be logged in to change password' };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/change-password/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            const data = await response.json();
            return { success: data.success, error: data.message };
        } catch (error) {
            console.error('Change password error:', error);
            return { success: false, error: 'Connection error. Please try again.' };
        }
    };

    // Delete account
    const deleteAccount = async (password) => {
        if (!user || isGuest) {
            return { success: false, error: 'Must be logged in to delete account' };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/delete-account/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    password: password
                })
            });

            const data = await response.json();

            if (data.success) {
                // Clear all local data after account deletion
                clearAuthData();
            }

            return { success: data.success, error: data.message };
        } catch (error) {
            console.error('Delete account error:', error);
            return { success: false, error: 'Connection error. Please try again.' };
        }
    };

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
        changePassword,
        deleteAccount,
        USER_ROLES
    };

    // Inactivity tracking
    useEffect(() => {
        if (!user) return;
        // Activity handler
        const resetTimers = () => {
            if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
            if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
            setShowInactivityWarning(false);
            // Set warning timer for 9.5 min
            warningTimerRef.current = setTimeout(() => {
                setShowInactivityWarning(true);
            }, INACTIVITY_LIMIT - WARNING_TIME);
            // Set logout timer for 10 min
            logoutTimerRef.current = setTimeout(() => {
                setShowInactivityWarning(false);
                logout();
            }, INACTIVITY_LIMIT);
        };
        // Listen to user activity
        const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
        events.forEach(e => window.addEventListener(e, resetTimers));
        // Start timers
        resetTimers();
        // Cleanup
        return () => {
            events.forEach(e => window.removeEventListener(e, resetTimers));
            if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
            if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        };
    }, [user]);

    return (
        <AuthContext.Provider value={value}>
            {children}
            {showInactivityWarning && (
                <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.3)',zIndex:10000,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <div style={{background:'#fff',padding:32,borderRadius:12,boxShadow:'0 2px 16px #0002',textAlign:'center',maxWidth:320}}>
                        <h2 style={{fontWeight:'bold',fontSize:22,marginBottom:12}}>Inactivity Warning</h2>
                        <p style={{marginBottom:16}}>You will be logged out in 30 seconds due to inactivity.</p>
                        <button onClick={()=>setShowInactivityWarning(false)} style={{background:'#2563eb',color:'#fff',padding:'8px 20px',border:'none',borderRadius:6,fontWeight:'bold',fontSize:16,cursor:'pointer'}}>Stay Logged In</button>
                    </div>
                </div>
            )}
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
