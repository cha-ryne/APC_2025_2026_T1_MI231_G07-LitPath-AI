// ────────────────────────────────────────────────
//  Centralized API configuration & helper
// ────────────────────────────────────────────────

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Get the current auth token from localStorage.
 * Returns null when no session exists.
 */
export function getAuthToken(): string | null {
    try {
        const raw = localStorage.getItem('litpath_session');
        if (!raw) return null;
        const session = JSON.parse(raw);
        return session?.session_token ?? null;
    } catch {
        return null;
    }
}

/**
 * Build standard headers for JSON API calls.
 * Includes Authorization when a session token is available.
 */
export function apiHeaders(includeAuth = false): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (includeAuth) {
        const token = getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }
    return headers;
}
