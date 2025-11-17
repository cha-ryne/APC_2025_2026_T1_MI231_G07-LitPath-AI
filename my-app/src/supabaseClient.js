import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: Log environment variables (remove in production)
console.log('🔧 Supabase Configuration:');
console.log('  URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
console.log('  Key:', supabaseAnonKey ? '✅ Found' : '❌ Missing');

// Only create Supabase client if environment variables are configured
export const supabase = supabaseUrl && supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
    const configured = !!supabase;
    console.log('  isSupabaseConfigured():', configured);
    return configured;
};