import React from 'react';
import FeedbackForm from '../pages/FeedbackForm';

interface CSMModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CSMModal = ({ isOpen, onClose }: CSMModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Darker background overlay */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm" 
                onClick={onClose} 
            />
            
            {/* Modal container - not scrollable, fixed size */}
            <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto p-6">
                    <FeedbackForm embedded={true} onClose={onClose} />
                </div>
            </div>
        </div>
    );
};

export default CSMModal;