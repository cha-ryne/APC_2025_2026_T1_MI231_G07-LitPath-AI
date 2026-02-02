import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
    ChevronLeft, ThumbsUp, ThumbsDown, ShieldCheck 
} from "lucide-react";
import dostLogo from "./components/images/dost-logo.png"; 

const API_BASE_URL = 'http://localhost:8000/api';

const FeedbackDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Form State
    const [editForm, setEditForm] = useState({
        status: '',
        category: '',
        is_valid: null,
        validity_remarks: '',
        is_doable: null,
        feasibility_remarks: ''
    });

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/feedback/${id}/`);
                if (!response.ok) throw new Error("Not found");
                const data = await response.json();
                setFeedback(data);
                
                setEditForm({
                    status: data.status || 'Pending',
                    category: data.category || '',
                    is_valid: data.is_valid,
                    validity_remarks: data.validity_remarks || '',
                    is_doable: data.is_doable,
                    feasibility_remarks: data.feasibility_remarks || ''
                });
            } catch (error) {
                console.error(error);
                navigate('/admin/feedback');
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id, navigate]);

    const handleSave = async () => {
        if (editForm.is_valid !== null && (!editForm.validity_remarks || editForm.validity_remarks.trim() === "")) {
            alert("⚠️ Please provide a reason why this is valid (or invalid).");
            return;
        }
        if (editForm.is_doable !== null && (!editForm.feasibility_remarks || editForm.feasibility_remarks.trim() === "")) {
            alert("⚠️ Please justify the feasibility.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/feedback/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });

            if (!response.ok) throw new Error('Failed to update');
            alert("Feedback updated successfully!");
            navigate('/admin/feedback');
        } catch (error) {
            console.error(error);
            alert("Failed to update.");
        }
    };

    if (loading) return <div className="p-10 text-center text-sm text-gray-500 font-sans">Loading details...</div>;
    if (!feedback) return null;

    return (
        // CHANGED: Plain bg-gray-100 background, consistent font-sans
        <div className="h-screen flex flex-col bg-gray-100 overflow-hidden font-sans">
            
            {/* --- HEADER --- */}
            <div className="bg-[#1F1F1F] text-white shadow-md flex-none z-50">
                <div className="flex items-center justify-between max-w-[100rem] mx-auto px-3 py-3 w-full">
                    
                    {/* Left: Logo + DOST Title + LitPath Subtitle */}
                    <div className="flex items-center space-x-4">
                        <img src={dostLogo} alt="DOST SciNet-Phil Logo" className="h-12 w-auto" />
                        
                        <div className="hidden md:block text-sm border-l border-white pl-4 ml-4 leading-tight opacity-90">
                            LitPath AI: <br /> Smart PathFinder for Theses and Dissertation
                        </div>
                    </div>

                    {/* Right: Admin Badge & Back Button */}
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700 shadow-sm">
                            <ShieldCheck size={16} className="text-blue-400" />
                            <span className="text-sm font-medium text-gray-200">Admin</span>
                        </div>
                        
                        <button 
                            onClick={() => navigate('/admin/feedback')} 
                            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                        >
                            <ChevronLeft size={18} />
                            <span>Back</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 overflow-hidden p-4 md:p-6 flex justify-center w-full">
                <div className="w-full max-w-[100rem] h-full flex flex-col">
                    
                    {/* ID & Date Row */}
                    <div className="flex justify-between items-end mb-4 flex-none px-1">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Review Feedback</h1>
                            {/* font-mono kept ONLY for ID to make it distinct as data */}
                            <p className="text-xs text-gray-500 mt-1 font-mono uppercase tracking-wide">ID: {id}</p>
                        </div>
                        <span className="text-xs text-gray-600 font-medium bg-white px-3 py-1.5 rounded border border-gray-300 shadow-sm">
                            Submitted: {new Date(feedback.created_at).toLocaleString()}
                        </span>
                    </div>

                    {/* Two Column Layout */}
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                        
                        {/* LEFT COLUMN: Read-Only Details */}
                        {/* CHANGED: Solid bg-white, shadow-md, and border-gray-200 for clear contrast */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 flex flex-col gap-5 overflow-y-auto">
                            
                            {/* 1. User Rating */}
                            <div className="flex-none">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">User Rating</label>
                                <div className={`flex items-center gap-3 p-4 rounded-lg border-2 shadow-sm ${feedback.relevant ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                                    {feedback.relevant ? <ThumbsUp size={22} strokeWidth={2.5} /> : <ThumbsDown size={22} strokeWidth={2.5} />}
                                    <span className="text-base font-bold">{feedback.relevant ? 'Relevant / Helpful' : 'Not Relevant'}</span>
                                </div>
                            </div>

                            {/* 2. Related Query */}
                            <div className="flex-none">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Related Query</label>
                                {/* font-mono kept ONLY for the query string */}
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm">
                                    <p className="font-mono text-sm text-blue-900 break-words font-medium">{feedback.query || "N/A"}</p>
                                </div>
                            </div>

                            {/* 3. User Comment */}
                            <div className="flex-1 min-h-0 flex flex-col">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">User Comment</label>
                                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 text-gray-700 italic text-base flex-1 overflow-y-auto shadow-inner">
                                    "{feedback.comment || "No written comment provided."}"
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Admin Actions Form */}
                        {/* CHANGED: Solid bg-white, shadow-md, and border-gray-200 */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50">
                                <h3 className="text-sm font-bold text-gray-800">Analysis & Action</h3>
                            </div>
                            
                            <div className="p-6 flex-1 overflow-y-auto space-y-6">
                                {/* Category */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                                    <select 
                                        className="w-full border-gray-300 border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm transition-shadow"
                                        value={editForm.category}
                                        onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                                    >
                                        <option value="" disabled>Select Category</option>
                                        <option value="Positive">Positive</option>
                                        <option value="Issue">Issue / Bug</option>
                                        <option value="For Improvement">For Improvement</option>
                                    </select>
                                </div>

                                {/* Validity */}
                                <div className="p-5 rounded-xl border border-gray-200 bg-gray-50/50 shadow-sm">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Is this valid?</label>
                                    <div className="flex gap-3 mb-3">
                                        <button onClick={() => setEditForm({...editForm, is_valid: true})} className={`flex-1 py-2 text-sm font-semibold border rounded-lg transition-all ${editForm.is_valid === true ? 'bg-green-600 text-white border-green-600 shadow-md transform scale-[1.02]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Yes</button>
                                        <button onClick={() => setEditForm({...editForm, is_valid: false})} className={`flex-1 py-2 text-sm font-semibold border rounded-lg transition-all ${editForm.is_valid === false ? 'bg-red-600 text-white border-red-600 shadow-md transform scale-[1.02]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>No</button>
                                    </div>
                                    <textarea 
                                        className="w-full border-gray-300 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
                                        placeholder="Remarks..." 
                                        rows="2"
                                        value={editForm.validity_remarks}
                                        onChange={(e) => setEditForm({...editForm, validity_remarks: e.target.value})}
                                    />
                                </div>

                                {/* Feasibility */}
                                <div className="p-5 rounded-xl border border-gray-200 bg-gray-50/50 shadow-sm">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Is it doable?</label>
                                    <div className="flex gap-3 mb-3">
                                        <button onClick={() => setEditForm({...editForm, is_doable: true})} className={`flex-1 py-2 text-sm font-semibold border rounded-lg transition-all ${editForm.is_doable === true ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Yes</button>
                                        <button onClick={() => setEditForm({...editForm, is_doable: false})} className={`flex-1 py-2 text-sm font-semibold border rounded-lg transition-all ${editForm.is_doable === false ? 'bg-gray-600 text-white border-gray-600 shadow-md transform scale-[1.02]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>No</button>
                                    </div>
                                    <textarea 
                                        className="w-full border-gray-300 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
                                        placeholder="Justification..." 
                                        rows="2"
                                        value={editForm.feasibility_remarks}
                                        onChange={(e) => setEditForm({...editForm, feasibility_remarks: e.target.value})}
                                    />
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                                    <select 
                                        className="w-full border-gray-300 border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Reviewed">Reviewed</option>
                                        <option value="Resolved">Resolved</option>
                                    </select>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
                                <button 
                                    onClick={() => navigate('/admin/feedback')} 
                                    className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSave} 
                                    className="px-8 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md transition-all transform hover:-translate-y-0.5"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-200 py-4 text-center text-gray-500 text-[10px] flex-none">
                <p>© 2025 DOST-STII Science and Technology Information Institute</p>
            </div>
        </div>
    );
};

export default FeedbackDetail;