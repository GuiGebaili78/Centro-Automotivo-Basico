import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    title: React.ReactNode;
    children: React.ReactNode;
    onClose: () => void;
    className?: string;
    zIndex?: number;
}

export const Modal = ({ title, children, onClose, className = 'max-w-2xl', zIndex = 50 }: ModalProps) => {
    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            style={{ zIndex }}
        >
            <div className={`bg-white rounded-xl shadow-2xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 ${className}`}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-100">
                    <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 text-neutral-400 hover:text-error hover:bg-error-50 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};
