import React, { useState } from 'react';

import { useNavigate, Link } from 'react-router-dom';
import dostLogo from "./components/images/dost-logo.png";

const API_BASE_URL = 'http://localhost:8000/api';

const Login = () => {

    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // Forgot password state hooks (must be at top level)
    const [showForgot, setShowForgot] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetMessage, setResetMessage] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/admin/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                // Store admin info in localStorage
                localStorage.setItem('admin_user', JSON.stringify(data.admin));
                console.log('Login successful:', data.admin);
                
                // Redirect to dashboard
                navigate('/admin/dashboard');
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Connection error. Please ensure the backend server is running.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setResetMessage('');
        setResetLoading(true);
        // No backend call yet
        setTimeout(() => {
            setResetMessage('If this email exists, a reset link will be sent.');
            setResetLoading(false);
        }, 1200);
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <div className="bg-[#1F1F1F] text-white p-4 shadow-md">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center space-x-4">
                        <img src={dostLogo} alt="DOST SciNet-Phil Logo" className="h-12 w-50" />
                        <div className="text-xl font-bold">DOST UNION CATALOG</div>
                        <div className="text-sm border-l border-white pl-4 ml-4">LitPath AI: <br /> Smart PathFinder of Theses and Dissertation</div>
                    </div>
                    <nav className="flex space-x-6">
                        <a href="http://scinet.dost.gov.ph/#/opac" target="_blank" rel="noopener noreferrer" className="hover:text-blue-200 transition-colors"> Online Public Access Catalog</a>
                        <Link to="/" className="font-bold text-blue-200">LitPath AI</Link>
                        <a href="#" className="flex items-center hover:text-blue-200 transition-colors">
                        </a>
                    </nav>
                </div>
            </div>

            
            <div className="flex justify-center items-center flex-1 py-10 px-4">
                <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl text-center">
                    <h2 className="text-3xl font-bold text-gray-800 mb-8">Hello, Librarian!</h2>
                    
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                            {error}
                        </div>
                    )}
                    
                    {!showForgot ? (
                        <>
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="sr-only">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email address"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-700 placeholder-gray-500"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="sr-only">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-700 placeholder-gray-500"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold text-lg shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Logging in...' : 'Log In'}
                            </button>
                        </form>
                        <div className="mt-6 text-sm">
                            <button
                                type="button"
                                className="text-blue-600 hover:underline"
                                onClick={() => setShowForgot(true)}
                            >
                                Forgot password?
                            </button>
                        </div>
                        </>
                    ) : (
                        <form onSubmit={handleForgotSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-1">Enter your email to reset password</label>
                                <input
                                    type="email"
                                    id="resetEmail"
                                    name="resetEmail"
                                    value={resetEmail}
                                    onChange={e => setResetEmail(e.target.value)}
                                    placeholder="Enter your email address"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E74BC] focus:border-transparent"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={resetLoading}
                                className="w-full bg-[#1E74BC] text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {resetLoading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                            <div className="text-right mt-2">
                                <button
                                    type="button"
                                    className="text-sm text-gray-600 hover:underline focus:outline-none"
                                    onClick={() => setShowForgot(false)}
                                >
                                    Back to Login
                                </button>
                            </div>
                            {resetMessage && <div className="text-green-600 text-sm mt-2">{resetMessage}</div>}
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;