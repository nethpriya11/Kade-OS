import { X } from 'lucide-react';
import type { POSMenuItem } from './POSMenuGrid';

interface POSPortionModalProps {
    item: POSMenuItem | null;
    onClose: () => void;
    onSelect: (item: POSMenuItem, portion: string) => void;
}

const POSPortionModal = ({ item, onClose, onSelect }: POSPortionModalProps) => {
    if (!item) return null;

    return (
        <>
            <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface border border-border rounded-3xl p-6 shadow-2xl z-[9999] w-full max-w-sm animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-text">Select Portion Size</h2>
                    <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full text-text-muted">
                        <X size={20} />
                    </button>
                </div>
                <div className="space-y-4">
                    <button
                        onClick={() => onSelect(item, 'normal')}
                        className="w-full bg-surface-hover border border-border hover:border-primary p-4 rounded-xl text-left transition-colors flex justify-between items-center"
                    >
                        <div>
                            <div className="font-bold text-text">Normal</div>
                            <div className="text-sm text-text-muted">{item.name}</div>
                        </div>
                        <div className="font-bold text-primary">LKR {item.price}</div>
                    </button>
                    <button
                        onClick={() => onSelect(item, 'large')}
                        className="w-full bg-surface-hover border border-border hover:border-primary p-4 rounded-xl text-left transition-colors flex justify-between items-center"
                    >
                        <div>
                            <div className="font-bold text-text">Large</div>
                            <div className="text-sm text-text-muted">{item.name}</div>
                        </div>
                        <div className="font-bold text-primary">LKR {item.large_price || 0}</div>
                    </button>
                </div>
            </div>
        </>
    );
};

export default POSPortionModal;

