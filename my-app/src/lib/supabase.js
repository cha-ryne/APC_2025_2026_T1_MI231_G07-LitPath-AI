import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// Replace these with your actual Supabase project credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
const isSupabaseConfigured = supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== 'YOUR_SUPABASE_URL' && 
    supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
    supabaseUrl.startsWith('https://');

// Create Supabase client only if configured, otherwise null
export const supabase = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    })
    : null;

// Log configuration status
if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Running in local-only mode. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file to enable Supabase.');
}

// Helper functions for session management
export const sessionHelpers = {
    // Create a guest session in Supabase
    async createGuestSession() {
        const sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // If Supabase is not configured, return local-only session
        if (!supabase) {
            return { 
                session_id: sessionId, 
                is_anonymous: true,
                local_only: true 
            };
        }
        
        const { data, error } = await supabase
            .from('sessions')
            .insert({
                session_is_anonymous: true,
                session_created_at: new Date().toISOString(),
                session_last_seen: new Date().toISOString(),
                user_accounts_user_id: null
            })
            .select()
            .single();
        
        if (error) {
            console.error('Error creating guest session:', error);
            // Fallback to local-only session
            return { 
                session_id: sessionId, 
                is_anonymous: true,
                local_only: true 
            };
        }
        
        return data;
    },

    // Update session last seen timestamp
    async updateSessionActivity(sessionId) {
        if (!supabase) return;
        
        const { error } = await supabase
            .from('sessions')
            .update({ session_last_seen: new Date().toISOString() })
            .eq('session_id', sessionId);
        
        if (error) {
            console.error('Error updating session activity:', error);
        }
    },

    // Delete guest session (for privacy on public devices)
    async deleteGuestSession(sessionId) {
        if (!supabase) return;
        
        const { error } = await supabase
            .from('sessions')
            .delete()
            .eq('session_id', sessionId)
            .eq('session_is_anonymous', true);
        
        if (error) {
            console.error('Error deleting guest session:', error);
        }
    },

    // Clear all guest-related localStorage data
    clearGuestLocalStorage() {
        const keysToRemove = [
            'litpath_user_id',
            'litpath_bookmarks',
            'litpath_research_history',
            'litpath_guest_session',
            'litpath_conversation'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
    }
};

// Export configuration status for other components
export const isSupabaseEnabled = isSupabaseConfigured;

export default supabase;
