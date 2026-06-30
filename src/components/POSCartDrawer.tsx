import { ShoppingBag, X, Plus, Minus, CheckCircle } from 'lucide-react';
import type { CartItem } from '../store/cartStore';

interface RestaurantTable {
    id: string;
    table_number: number;
    capacity: number;
    status: string;
}

interface POSCartDrawerProps {
    isOpen: boolean;
    cart: CartItem[];
    subtotal: number;
    discountLkr: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    orderType: string;
    onOrderTypeChange: (type: string) => void;
    selectedTableNumber: string;
    onTableNumberChange: (num: string) => void;
    tables: RestaurantTable[];
    customerName: string;
    onCustomerNameChange: (name: string) => void;
    discountType: string;
    onDiscountTypeChange: (type: string) => void;
    discountValue: string;
    onDiscountValueChange: (val: string) => void;
    paymentMethod: string;
    onPaymentMethodChange: (method: string) => void;
    processing: boolean;
    onClose: () => void;
    onCheckout: () => void;
    onUpdateQuantity: (id: string, qty: number) => void;
}

const POSCartDrawer = ({
    isOpen, cart, subtotal, discountLkr, taxRate, taxAmount, totalAmount,
    orderType, onOrderTypeChange, selectedTableNumber, onTableNumberChange, tables,
    customerName, onCustomerNameChange, discountType, onDiscountTypeChange,
    discountValue, onDiscountValueChange, paymentMethod, onPaymentMethodChange,
    processing, onClose, onCheckout, onUpdateQuantity
}: POSCartDrawerProps) => {
    if (!isOpen) return null;

    return (
        <>
            <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" />
            <div className="fixed top-0 right-0 h-full w-full md:w-[400px] bg-surface border-l border-border shadow-2xl z-[9999] flex flex-col animate-in slide-in-from-right duration-200">
                <div className="p-4 border-b border-border flex justify-between items-center bg-surface/50 backdrop-blur-xl">
                    <h2 className="text-xl font-bold text-text flex items-center gap-2">
                        <ShoppingBag className="text-primary" />
                        Current Order
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full text-text-muted">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-30">
                            <ShoppingBag size={64} className="mb-4" />
                            <p className="text-lg font-medium">Cart is empty</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cart.map(item => (
                                <div
                                    key={item.cartItemId || item.id}
                                    className="flex justify-between items-center bg-bg p-4 rounded-2xl border border-border"
                                >
                                    <div>
                                        <div className="font-bold text-text">
                                            {item.name} {(item as Record<string, unknown>).portion === 'large' && <span className="text-xs ml-1 text-primary">(Large)</span>}
                                        </div>
                                        <div className="text-sm text-primary font-medium">LKR {item.price * item.quantity}</div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-surface rounded-xl p-1 border border-border">
                                        <button onClick={() => onUpdateQuantity(item.cartItemId || item.id, item.quantity - 1)} className="p-2 hover:text-primary hover:bg-bg rounded-lg transition-colors"><Minus size={16} /></button>
                                        <span className="font-bold w-6 text-center">{item.quantity}</span>
                                        <button onClick={() => onUpdateQuantity(item.cartItemId || item.id, item.quantity + 1)} className="p-2 hover:text-primary hover:bg-bg rounded-lg transition-colors"><Plus size={16} /></button>
                                    </div>
                                </div>
                            ))}

                            <div className="border-t border-border/50 pt-4 mt-6 space-y-4">
                                <h3 className="text-sm font-bold text-text uppercase tracking-wider">Order Details</h3>

                                <div>
                                    <label className="text-xs font-bold text-text-muted uppercase mb-1.5 block">Order Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['takeaway', 'dine_in'].map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => {
                                                    onOrderTypeChange(type);
                                                    if (type === 'takeaway') onTableNumberChange('');
                                                }}
                                                className={`py-2.5 rounded-xl text-sm font-bold transition-all border ${
                                                    orderType === type
                                                        ? 'bg-primary/20 text-primary border-primary'
                                                        : 'bg-bg border-border text-text-muted hover:border-text-muted'
                                                }`}
                                            >
                                                {type === 'takeaway' ? '🥡 Takeaway' : '🍽 Dine In'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {orderType === 'dine_in' && (
                                    <div>
                                        <label className="text-xs font-bold text-text-muted uppercase mb-1 block">Table</label>
                                        <select
                                            value={selectedTableNumber}
                                            onChange={(e) => onTableNumberChange(e.target.value)}
                                            className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-text focus:outline-none focus:border-primary transition-colors text-sm"
                                        >
                                            <option value="">Select a table...</option>
                                            {tables.map(t => (
                                                <option key={t.id} value={t.table_number} disabled={t.status === 'occupied'}>
                                                    Table {t.table_number} — {t.capacity} seats ({t.status === 'occupied' ? 'Occupied' : 'Free'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-text-muted uppercase mb-1 block">Customer Name <span className="normal-case text-text-muted/60">(optional)</span></label>
                                    <input
                                        type="text"
                                        placeholder="e.g. John"
                                        value={customerName}
                                        onChange={(e) => onCustomerNameChange(e.target.value)}
                                        className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-text focus:outline-none focus:border-primary transition-colors text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-text-muted uppercase mb-1.5 block">Discount</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['none', 'percent', 'flat'].map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => {
                                                    onDiscountTypeChange(type);
                                                    if (type === 'none') onDiscountValueChange('');
                                                }}
                                                className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border ${discountType === type ? 'bg-primary/20 text-primary border-primary' : 'bg-bg border-border text-text-muted hover:border-text-muted'}`}
                                            >
                                                {type === 'none' ? 'None' : type === 'percent' ? '% Off' : 'Flat LKR'}
                                            </button>
                                        ))}
                                    </div>
                                    {discountType !== 'none' && (
                                        <div className="mt-2 animate-in slide-in-from-top-2 duration-200">
                                            <input
                                                type="number"
                                                placeholder={discountType === 'percent' ? 'Percentage (e.g. 10)' : 'LKR Amount (e.g. 250)'}
                                                value={discountValue}
                                                onChange={(e) => onDiscountValueChange(e.target.value)}
                                                className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-text focus:outline-none focus:border-primary transition-colors text-sm"
                                                min="0"
                                                max={discountType === 'percent' ? "100" : undefined}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-border bg-surface/80 backdrop-blur-md">
                    <div className="space-y-1.5 mb-6 border-b border-border/50 pb-4">
                        <div className="flex justify-between items-center text-sm text-text-muted font-medium">
                            <span>Subtotal</span>
                            <span>LKR {subtotal.toLocaleString()}</span>
                        </div>
                        {discountLkr > 0 && (
                            <div className="flex justify-between items-center text-sm text-primary font-bold">
                                <span>Discount</span>
                                <span>- LKR {discountLkr.toLocaleString()}</span>
                            </div>
                        )}
                        {taxRate > 0 && (
                            <div className="flex justify-between items-center text-sm text-text-muted">
                                <span>Tax ({taxRate}%)</span>
                                <span>LKR {taxAmount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-1.5">
                            <span className="text-text-muted font-medium">Total Amount</span>
                            <span className="text-3xl font-bold text-primary">LKR {totalAmount.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="flex gap-4 mb-6">
                        <button
                            onClick={() => onPaymentMethodChange('cash')}
                            className={`flex-1 py-3 rounded-xl font-bold transition-all border ${paymentMethod === 'cash' ? 'bg-primary/20 text-primary border-primary' : 'bg-surface border-border text-text-muted hover:border-text-muted'}`}
                        >
                            Cash
                        </button>
                        <button
                            onClick={() => onPaymentMethodChange('card')}
                            className={`flex-1 py-3 rounded-xl font-bold transition-all border ${paymentMethod === 'card' ? 'bg-primary/20 text-primary border-primary' : 'bg-surface border-border text-text-muted hover:border-text-muted'}`}
                        >
                            Card
                        </button>
                    </div>

                    <button
                        onClick={() => { onCheckout(); onClose(); }}
                        disabled={cart.length === 0 || processing}
                        className="w-full bg-primary text-bg font-bold py-4 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        {processing ? 'Processing...' : (
                            <>
                                <span className="text-lg">Complete Order</span>
                                <CheckCircle size={24} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
};

export default POSCartDrawer;

