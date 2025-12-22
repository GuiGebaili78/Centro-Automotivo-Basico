import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface StatusBannerProps {
    msg: {
        type: 'success' | 'error' | null;
        text: string;
    };
    onClose: () => void;
}

export const StatusBanner = ({ msg, onClose }: StatusBannerProps) => {
    if (!msg.text) return null;
    const isSuccess = msg.type === 'success';
    
    return (
        <div className={`mb-6 p-4 rounded-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 font-bold border ${
            isSuccess ? 'bg-success/10 text-success border-success/20' : 'bg-error/10 text-error border-error/20'
        }`}>
            <div className="flex items-center gap-3">
                {isSuccess ? <CheckCircle size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
                <span className="uppercase text-xs tracking-wider">{msg.text}</span>
            </div>
            <button 
                type="button"
                onClick={onClose} 
                className="opacity-40 hover:opacity-100 transition-opacity p-1"
            >
                <X size={16} />
            </button>
        </div>
    );
};
