import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import dostLogo from "../components/images/dost-logo.png";
import dostBg from "../components/images/dost.png";

const AuthPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, continueAsGuest, loading: authLoading } = useAuth();

    // Check for ?mode=login in URL
    const getModeFromUrl = (search) => {
        const urlParams = new URLSearchParams(search);
        return urlParams.get('mode') === 'login' ? 'login' : 'welcome';
    };
    const [mode, setMode] = useState(getModeFromUrl(location.search)); // 'welcome' or 'login' or 'forgot'

    // Keep mode in sync with URL (for guest login button after logout)
    useEffect(() => {
        setMode(getModeFromUrl(location.search));
    }, [location.search]);
        // Forgot password state
        const [resetEmail, setResetEmail] = useState('');
        const [resetMessage, setResetMessage] = useState('');
        const [resetLoading, setResetLoading] = useState(false);

        const handleForgotSubmit = async (e) => {
            e.preventDefault();
            setResetMessage('');
            setResetLoading(true);
            try {
                // Call backend endpoint for password reset
                const response = await fetch('http://localhost:8000/api/auth/password-reset-request/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: resetEmail })
                });
                const data = await response.json();
                setResetMessage(data.message || 'If this email exists, a reset link will be sent.');
            } catch (err) {
                setResetMessage('Error sending reset request.');
            } finally {
                setResetLoading(false);
            }
        };
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await login(email, password);
            
            if (result.success) {
                // Check role and redirect accordingly
                if (result.user.role === 'admin' || result.user.role === 'staff') {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/search');
                }
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Connection error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinueAsGuest = async () => {
        setIsLoading(true);
        setError('');

        try {
            const result = await continueAsGuest();
            
            if (result.success) {
                navigate('/search');
            } else {
                setError('Could not create guest session. Please try again.');
            }
        } catch (err) {
            console.error('Guest session error:', err);
            setError('Connection error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col relative">
            {/* Background Image with Blur */}
            <div 
                className="absolute inset-0 z-0"
                style={{ 
                    backgroundImage: `url(${dostBg})`, 
                    backgroundSize: 'cover', 
                    backgroundPosition: 'center', 
                    backgroundRepeat: 'no-repeat',
                    filter: 'blur(4px)'
                }}
            />
            {/* Header */}
            <div className="sticky top-0 left-0 right-0 z-40 bg-gradient-to-b from-[#555555] to-[#212121] text-white shadow-md relative">
                <div className="flex items-center justify-between max-w-[100rem] mx-auto px-3 py-3 w-full">
                    
                    {/* Left Side: Branding */}
                    <div className="flex items-center space-x-4">
                        <img src={dostLogo} alt="DOST SciNet-Phil Logo" className="h-12 w-auto" />
                        <div className="hidden md:block text-sm border-l border-white pl-4 ml-4 leading-tight opacity-100">
                            LitPath AI: <br /> Smart PathFinder for Theses and Dissertation
                        </div>
                    </div>

                    {/* Right Side: OPAC Link */}
                    <nav className="flex space-x-6">
                        <a 
                            href="http://scinet.dost.gov.ph/#/opac" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:text-blue-200 transition-colors text-sm font-medium"
                        >
                            Online Public Access Catalog
                        </a>
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex justify-center items-center flex-1 py-10 px-4 relative z-10">
                <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-xl">
                    
                    {/* Welcome Screen */}
                    {mode === 'welcome' && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <BookOpen className="w-16 h-16 text-[#1E74BC] mx-auto mb-4" />
                                <h2 className="text-3xl font-bold text-gray-800">Welcome to LitPath AI</h2>
                                <p className="text-gray-600 mt-2">Smart PathFinder for Theses and Dissertations</p>
                            </div>

                            <div className="space-y-4">
                                <button
                                    onClick={() => setMode('login')}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-3 bg-[#1E74BC] text-white py-4 rounded-lg hover:bg-[#184d79] transition-colors font-semibold text-lg shadow-md disabled:bg-gray-400"
                                >
                                    <User className="w-5 h-5" />
                                    Login
                                </button>

                                <div className="relative my-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-300"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-4 bg-white text-gray-500">or</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleContinueAsGuest}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-3 bg-gray-100 text-gray-700 py-4 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-lg border border-gray-300 disabled:bg-gray-200"
                                >
                                    <ArrowRight className="w-5 h-5" />
                                    {isLoading ? 'Starting...' : 'Continue as Guest'}
                                </button>

                                <p className="text-xs text-center text-gray-500 mt-4">
                                    Guest sessions are temporary. Your data will be cleared when you start a new search session.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Login Form */}
                    {mode === 'login' && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">Login</h2>
                                <p className="text-gray-600 mt-1">Access your research and bookmarks</p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            id="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter your password"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                                            required
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-3 bg-[#1E74BC] text-white py-4 rounded-lg hover:bg-[#184d79] transition-colors font-semibold text-lg shadow-md disabled:bg-gray-400"
                                >
                                    {isLoading ? 'Logging in...' : 'Login'}
                                </button>
                            </form>

                            <div className="flex flex-col items-center gap-2">
                                <button
                                    type="button"
                                    className="text-[#1E74BC] hover:underline text-sm"
                                    onClick={() => { setMode('forgot'); setResetEmail(''); setResetMessage(''); }}
                                >
                                    Forgot password?
                                </button>
                                <button
                                    onClick={() => { setMode('welcome'); setError(''); }}
                                    className="text-gray-500 hover:underline text-sm"
                                >
                                    ← Back to options
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Forgot Password Form */}
                    {mode === 'forgot' && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">Forgot Password</h2>
                                <p className="text-gray-600 mt-1">Enter your email to receive a reset link</p>
                            </div>
                            <form onSubmit={handleForgotSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        id="resetEmail"
                                        value={resetEmail}
                                        onChange={e => setResetEmail(e.target.value)}
                                        placeholder="Enter your email address"
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        disabled={resetLoading}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={resetLoading}
                                    className="w-full flex items-center justify-center gap-3 bg-[#1E74BC] text-white py-4 rounded-lg hover:bg-[#184d79] transition-colors font-semibold text-lg shadow-md disabled:bg-gray-400"
                                >
                                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </form>
                            {resetMessage && <div className="text-green-600 text-sm text-center">{resetMessage}</div>}
                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => setMode('login')}
                                    className="text-gray-500 hover:underline text-sm"
                                >
                                    ← Back to Login
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-200 py-4 text-center text-gray-500 text-[10px] flex-none">
                <p>© 2025 DOST-STII Science and Technology Information Institute</p>
            </div>
        </div>
    );
};

export default AuthPage;