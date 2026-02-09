import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Star } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000/api';

const FeedbackForm = () => {
    const { user, getUserId } = useAuth();
    const navigate = useNavigate();
    const userId = getUserId();
    const sessionId = sessionStorage.getItem('session_id') || '';

    const [formData, setFormData] = useState({
        user_id: userId || '',
        session_id: sessionId,
        consent_given: false,
        client_type: '',
        date: new Date().toISOString().split('T')[0],
        sex: '',
        age: '',
        region: '',
        category: '',
        litpath_rating: null,
        research_interests: '',
        missing_content: '',
        message_comment: ''
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null); // 'success', 'error', or null

    const clientTypeChoices = [
        { value: 'Citizen', label: 'Citizen' },
        { value: 'Business', label: 'Business' },
        { value: 'Government', label: 'Government (Employee/Agency)' }
    ];

    const sexChoices = [
        { value: 'Female', label: 'Female' },
        { value: 'Male', label: 'Male' },
        { value: 'Prefer not to say', label: 'Prefer not to say' }
    ];

    const ageChoices = [
        { value: '10 and below', label: '10 years old and below' },
        { value: '11-15', label: '11 - 15 years old' },
        { value: '16-20', label: '16 - 20 years old' },
        { value: '21-25', label: '21 - 25 years old' },
        { value: '26-30', label: '26 - 30 years old' },
        { value: '31-35', label: '31 - 35 years old' },
        { value: '36-40', label: '36 - 40 years old' },
        { value: '41-45', label: '41 - 45 years old' },
        { value: '46-50', label: '46 - 50 years old' },
        { value: '51-55', label: '51 - 55 years old' },
        { value: '56-60', label: '56 - 60 years old' },
        { value: '61 and above', label: '61 years old and above' }
    ];

    const regionChoices = [
        { value: 'NCR', label: '[NCR] National Capital Region' },
        { value: 'CAR', label: '[CAR] Cordillera Administrative Region' },
        { value: 'R01', label: '[R01] Region 1 (Ilocos Region)' },
        { value: 'R02', label: '[R02] Region 2 (Cagayan Valley Region)' },
        { value: 'R03', label: '[R03] Region 3 (Central Luzon Region)' },
        { value: 'R4A', label: '[R4A] Region 4A (CALABARZON Region)' },
        { value: 'R4B', label: '[R4B] Region 4B (MIMAROPA Region)' },
        { value: 'R05', label: '[R05] Region 5 (Bicol Region)' },
        { value: 'R06', label: '[R06] Western Visayas Region' },
        { value: 'R07', label: '[R07] Central Visayas Region' },
        { value: 'R08', label: '[R08] Eastern Visayas Region' },
        { value: 'R09', label: '[R09] Zamboanga Peninsula Region' },
        { value: 'R10', label: '[R10] Northern Mindanao Region' },
        { value: 'R11', label: '[R11] Davao Region' },
        { value: 'R12', label: '[R12] SOCCSKSARGEN Region' },
        { value: 'R13', label: '[R13] Caraga Administrative Region' },
        { value: 'BARMM', label: '[BARMM] Bangsamoro Autonomous Region in Muslim Mindanao' },
        { value: 'N/A', label: '[N/A] Not Applicable (Overseas)' }
    ];

    const categoryChoices = [
        { value: 'Student', label: 'Student' },
        { value: 'DOST Employee', label: 'DOST Employee' },
        { value: 'Other Government Employee', label: 'Other Government Employee' },
        { value: 'Librarian/Library Staff', label: 'Librarian/Library Staff' },
        { value: 'Teaching Personnel', label: 'Teaching Personnel' },
        { value: 'Administrative Personnel', label: 'Administrative Personnel' },
        { value: 'Researcher', label: 'Researcher' }
    ];

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        
        // Clear error when field is modified
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleRating = (rating) => {
        setFormData(prev => ({ ...prev, litpath_rating: rating }));
        if (errors.litpath_rating) {
            setErrors(prev => ({ ...prev, litpath_rating: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        // Required fields check
        if (!formData.consent_given) {
            newErrors.consent_given = 'You must acknowledge the data privacy consent';
        }
        if (!formData.client_type) {
            newErrors.client_type = 'Client Type is required';
        }
        if (!formData.date) {
            newErrors.date = 'Date is required';
        }
        if (!formData.sex) {
            newErrors.sex = 'Sex is required';
        }
        if (!formData.age) {
            newErrors.age = 'Age is required';
        }
        if (!formData.region) {
            newErrors.region = 'Region is required';
        }
        if (!formData.category) {
            newErrors.category = 'Category is required';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus(null);

        try {
            // Submit to Django backend
            const response = await fetch(`${API_BASE_URL}/csm-feedback/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setSubmitStatus('success');
                
                // Store in localStorage to prevent showing popup again
                localStorage.setItem('csm_feedback_submitted', 'true');
                localStorage.setItem('csm_feedback_submitted_at', new Date().toISOString());
                
                setTimeout(() => {
                    navigate('/search');
                }, 2000);
            } else {
                const errorData = await response.json();
                console.error('CSM Feedback submission error:', errorData);
                setSubmitStatus('error');
            }
        } catch (error) {
            console.error('CSM Feedback submission error:', error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = () => {
        // Store that user skipped feedback
        localStorage.setItem('csm_feedback_skipped', 'true');
        localStorage.setItem('csm_feedback_skipped_at', new Date().toISOString());
        navigate('/search');
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-[#1E74BC] mb-2">
                            Client Satisfaction Measurement (CSM) Form
                        </h1>
                        <p className="text-sm text-gray-600 mb-4">
                            <strong>LitPath AI: Smart Pathfinder for Thesis and Dissertation</strong>
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Section I: Data Privacy & Consent */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-lg font-bold text-[#1E74BC] mb-4 border-b pb-2">
                            I. Data Privacy & Consent
                        </h2>
                        
                        <div className="mb-4">
                            <p className="text-sm text-gray-700 mb-4">
                                <strong>English:</strong><br/>
                                Filling up this form authorizes the Science and Technology Information Institute (DOST-STII) to collect, store, and access any personal data you may disclose herein. Such information encompasses, but is not limited to, your name, contact number, email address, and sex. This data shall be kept private and confidential, and may be processed and used only for the fulfillment of DOST-STII's mandates subject to the Data Privacy Act and other relevant laws.
                            </p>
                            <p className="text-sm text-gray-700 mb-4">
                                <strong>Filipino:</strong><br/>
                                Sa pagsagot ng sarbey na ito, pinahihintulutan ang Science and Technology Information Institute (DOST-STII) na kolektahin, itago, at gamitin ang personal na datos na iyong inihayag. Ang nasabing impormasyon ay sumasaklaw, ngunit hindi limitado sa, iyong pangalan, numero, email address, at kasarian. Ang datos na ito ay pananatilihing pribado at kumpidensyal, at maaaring iproseso at gamitin lamang para sa pag tupad sa mga mandato ng DOST-STII na napapailalim sa Data Privacy Act at iba pang nauugnay na batas.
                            </p>
                            <p className="text-sm text-gray-600 italic mb-4">
                                Para sa mga alalahanin sa privacy ng datos at feedback hinggil sa pahayag na ito, maaari kang sumulat sa amin sa email na ito: feedback@stii.dost.gov.ph
                            </p>
                        </div>

                        <div className="flex items-start mb-4">
                            <input
                                type="checkbox"
                                name="consent_given"
                                id="consent_given"
                                checked={formData.consent_given}
                                onChange={handleChange}
                                className="mt-1 mr-2"
                            />
                            <label htmlFor="consent_given" className="text-sm text-gray-700">
                                * I hereby acknowledge that I am fully informed of the foregoing and that I consent to the collection and processing of my Personal Data by DOST-STII.
                            </label>
                        </div>
                        {errors.consent_given && (
                            <p className="text-red-500 text-sm">{errors.consent_given}</p>
                        )}
                    </div>

                    {/* Section II: Client Profile */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-lg font-bold text-[#1E74BC] mb-4 border-b pb-2">
                            II. Client Profile
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Client Type */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Client Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="client_type"
                                    value={formData.client_type}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select Client Type</option>
                                    {clientTypeChoices.map(choice => (
                                        <option key={choice.value} value={choice.value}>
                                            {choice.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.client_type && (
                                    <p className="text-red-500 text-sm">{errors.client_type}</p>
                                )}
                            </div>

                            {/* Date */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {errors.date && (
                                    <p className="text-red-500 text-sm">{errors.date}</p>
                                )}
                            </div>

                            {/* Sex */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Sex <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="sex"
                                    value={formData.sex}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select Sex</option>
                                    {sexChoices.map(choice => (
                                        <option key={choice.value} value={choice.value}>
                                            {choice.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.sex && (
                                    <p className="text-red-500 text-sm">{errors.sex}</p>
                                )}
                            </div>

                            {/* Age */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    1. Age <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="age"
                                    value={formData.age}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select Age Range</option>
                                    {ageChoices.map(choice => (
                                        <option key={choice.value} value={choice.value}>
                                            {choice.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.age && (
                                    <p className="text-red-500 text-sm">{errors.age}</p>
                                )}
                            </div>

                            {/* Region */}
                            <div className="mb-4 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    2. Region <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="region"
                                    value={formData.region}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select Region</option>
                                    {regionChoices.map(choice => (
                                        <option key={choice.value} value={choice.value}>
                                            {choice.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.region && (
                                    <p className="text-red-500 text-sm">{errors.region}</p>
                                )}
                            </div>

                            {/* Category */}
                            <div className="mb-4 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    3. Category / Kategorya <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select Category</option>
                                    {categoryChoices.map(choice => (
                                        <option key={choice.value} value={choice.value}>
                                            {choice.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.category && (
                                    <p className="text-red-500 text-sm">{errors.category}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section III: Feedback & Evaluation */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-lg font-bold text-[#1E74BC] mb-4 border-b pb-2">
                            III. Feedback & Evaluation
                        </h2>

                        {/* LitPath AI Rating - Required */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                LitPath AI Rating <span className="text-red-500">*</span>
                                <span className="font-normal text-gray-500 ml-2">
                                    How would you rate your experience? (1-Poor to 5-Excellent)
                                </span>
                            </label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                        key={rating}
                                        type="button"
                                        onClick={() => handleRating(rating)}
                                        className={`p-2 rounded-full transition-colors ${
                                            formData.litpath_rating >= rating
                                                ? 'bg-yellow-400 text-yellow-900'
                                                : 'bg-gray-200 text-gray-600'
                                        } hover:bg-yellow-300`}
                                    >
                                        <Star
                                            size={24}
                                            className={formData.litpath_rating >= rating ? 'fill-current' : ''}
                                        />
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
                                <span>Poor</span>
                                <span>Excellent</span>
                            </div>
                            {errors.litpath_rating && (
                                <p className="text-red-500 text-sm">{errors.litpath_rating}</p>
                            )}
                        </div>

                        {/* Research Interests/Topics - Optional */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Research Interests/Topics
                                <span className="font-normal text-gray-500 ml-2">Mga Interes sa Pananaliksik</span>
                                <span className="text-gray-400 ml-2">(Optional)</span>
                            </label>
                            <textarea
                                name="research_interests"
                                value={formData.research_interests}
                                onChange={handleChange}
                                rows="3"
                                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter your research interests or topics..."
                            />
                        </div>

                        {/* Missing Content - Optional */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Missing Content
                                <span className="font-normal text-gray-500 ml-2">
                                    Topic / Title you would like to obtain but not found in LitPath AI
                                </span>
                                <span className="text-gray-400 ml-2">(Optional)</span>
                            </label>
                            <textarea
                                name="missing_content"
                                value={formData.missing_content}
                                onChange={handleChange}
                                rows="3"
                                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter topics or titles you would like to find but couldn't..."
                            />
                        </div>

                        {/* Message / Comment / Suggestion - Optional */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Message / Comment / Suggestion
                                <span className="font-normal text-gray-500 ml-2">Mensahe / Komento / Suhestiyon</span>
                                <span className="text-gray-400 ml-2">(Optional)</span>
                            </label>
                            <textarea
                                name="message_comment"
                                value={formData.message_comment}
                                onChange={handleChange}
                                rows="3"
                                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter your message, comments, or suggestions..."
                            />
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex justify-between items-center">
                        <button
                            type="button"
                            onClick={handleSkip}
                            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                        >
                            Skip / Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-6 py-2 bg-[#1E74BC] text-white rounded-md hover:bg-blue-700 ${
                                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                    </div>

                    {/* Success/Error Messages */}
                    {submitStatus === 'success' && (
                        <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
                            Thank you for your feedback! Redirecting to search page...
                        </div>
                    )}
                    {submitStatus === 'error' && (
                        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                            There was an error submitting your feedback. Please try again.
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default FeedbackForm;
