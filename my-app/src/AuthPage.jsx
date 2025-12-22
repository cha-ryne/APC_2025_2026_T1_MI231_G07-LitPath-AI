import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { BookOpen, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import dostLogo from "./components/images/dost-logo.png";

const AuthPage = () => {
    const navigate = useNavigate();
    const { login, continueAsGuest, loading: authLoading } = useAuth();
    
    const [mode, setMode] = useState('welcome'); // 'welcome' or 'login'
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
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
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
                    <nav className="flex space-x-6">
                        <a 
                            href="http://scinet.dost.gov.ph/#/opac" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:text-blue-200 transition-colors"
                        >
                            Online Public Access Catalog
                        </a>
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex justify-center items-center flex-1 py-10 px-4">
                <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-xl">
                    
                    {/* Welcome Screen */}
                    {mode === 'welcome' && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <BookOpen className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                                <h2 className="text-3xl font-bold text-gray-800">Welcome to LitPath AI</h2>
                                <p className="text-gray-600 mt-2">Smart PathFinder for Theses and Dissertations</p>
                            </div>

                            <div className="space-y-4">
                                <button
                                    onClick={() => setMode('login')}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-md disabled:bg-gray-400"
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
                                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-md disabled:bg-gray-400"
                                >
                                    {isLoading ? 'Logging in...' : 'Login'}
                                </button>
                            </form>

                            <div className="text-center">
                                <button
                                    onClick={() => { setMode('welcome'); setError(''); }}
                                    className="text-gray-500 hover:underline text-sm"
                                >
                                    ← Back to options
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-100 py-4 text-center text-gray-500 text-sm">
                <p>© 2025 DOST-STII Science and Technology Information Institute</p>
            </div>
        </div>
    );
};

export default AuthPage;