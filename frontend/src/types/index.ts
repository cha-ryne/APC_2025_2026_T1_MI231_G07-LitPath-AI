// ────────────────────────────────────────────────
//  Shared TypeScript interfaces for LitPath AI
// ────────────────────────────────────────────────

// ── Auth / User ─────────────────────────────────

export interface UserData {
    id: number | string;
    email: string | null;
    username: string;
    full_name: string;
    role: string;
}

export interface SessionData {
    session_id: number | string;
    created_at: string;
    is_anonymous: boolean;
    session_token?: string;
    guest_id?: string;
    local_only?: boolean;
}

export interface AuthResult {
    success: boolean;
    error?: string;
    user?: UserData;
}

// ── Toast / Notifications ───────────────────────

export type ToastType = 'success' | 'error';

export interface Toast {
    show: boolean;
    message: string;
    type: ToastType;
}

// ── Search / Thesis ─────────────────────────────

export interface Source {
    file: string;
    title: string;
    author: string;
    year: number | null;
    abstract: string;
    degree: string;
    subjects: string | string[];
    school: string;
    fullTextPath?: string;
    view_count?: number;
    avg_rating?: number;
}

export interface SearchResult {
    query: string;
    overview: string;
    sources: Source[];
    relatedQuestions: string[];
    isLoadingSummary: boolean;
}

export interface ConversationItem {
    query: string;
    overview: string;
    sources: Source[];
    relatedQuestions: string[];
    isLoadingSummary: boolean;
}

export interface ResearchHistorySession {
    id: string;
    userId: string;
    queries: string[];
    mainQuery: string;
    followUpQueries: string[];
    conversationHistory: ConversationItem[];
    timestamp: string;
    sourcesCount: number;
    conversationLength: number;
}

export interface Bookmark {
    userId: string;
    title: string;
    author: string;
    year: number | null;
    abstract: string;
    file: string;
    degree: string;
    subjects: string;
    school: string;
    bookmarkedAt?: string;
}

// ── Feedback ────────────────────────────────────

export interface FeedbackFormProps {
    embedded?: boolean;
    onClose?: () => void;
}

export interface CSMModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export interface FeedbackEditForm {
    status: string;
    admin_category: string;
    is_valid: boolean | null;
    validity_remarks: string;
    is_doable: boolean | null;
    feasibility_remarks: string;
}

// ── Dashboard ───────────────────────────────────

export interface DashboardKPI {
    total_searches: number;
    total_users: number;
    total_theses: number;
    total_feedback: number;
    avg_rating: number;
    [key: string]: unknown;
}
