import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LitPathAI from './LitPathAI';
import Login from './Login';
import AdminDashboard from './AdminDashboard';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<LitPathAI />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Routes>
        </Router>
    );
}

export default App;