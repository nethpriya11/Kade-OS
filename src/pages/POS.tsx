import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useOfflineStore } from '../store/offlineStore';
import { Plus, Minus, Trash2, CheckCircle, ShoppingBag, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { printReceipt } from '../utils/printReceipt';
import { logOrderAction } from '../lib/auditLog';

interface MenuItem {
    id: string;
    name: string;
    category: string;
    price: number;
    large_price: number;
    has_portions: boolean;
    image_url: string | null;
    is_available: boolean;
}

interface RestaurantTable {
    id: string;
    table_number: number;
    capacity: number;
    status: string;
}

interface BusinessInfo {
    business_name: string;
    business_address: string;
    business_phone: string;
}

const POS = () => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [tables, setTables] = useState<RestaurantTable[]>([]);
    const [loading, setLoading] = useState(true);
    const { cart, addToCart, updateQuantity, clearCart } = useCartStore();
    const { user } = useAuthStore();
    const { isOnline, addToQueue } = useOfflineStore();
    const [paymentMethod, setPaymentMethod] = useState('cash');

    const [processing, setProcessing] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItemForPortion, setSelectedItemForPortion] = useState<MenuItem | null>(null);

    const [orderType, setOrderType] = useState('takeaway');
    const [selectedTableNumber, setSelectedTableNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [discountType, setDiscountType] = useState('none');
    const [discountValue, setDiscountValue] = useState('');
    const [taxRate, setTaxRate] = useState(0);
    const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({ business_name: 'Kadé', business_address: '', business_phone: '' });

    const categories = ['All', 'Base', 'Protein', 'Drink', 'Extra'];

    useEffect(() => {
        supabase.from('settings').select('*').then(({ data }) => {
            if (data) {
                const map: Record<string, string> = {};
                data.forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });
                setTaxRate(parseFloat(map.tax_rate) || 0);
                setBusinessInfo({
                    business_name: map.business_name || 'Kadé',
                    business_address: map.business_address || '',
                    business_phone: map.business_phone || '',
                });
            }
        }, () => {});
    }, []);

    const handleAddPortionItem = (item: MenuItem, portionType: string) => {
        const price = portionType === 'large' ? item.large_price : item.price;
        addToCart({
            ...item,
            cartItemId: `${item.id}-${portionType}`,
            original_id: item.id,
            price: price,
            portion: portionType,
        } as never);
        toast.success(`Added ${item.name} (${portionType})`);
        setSelectedItemForPortion(null);
    };

    const filteredItems = menuItems.filter(item => {
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    useEffect(() => {
        fetchMenu();
        fetchTables();

        const subscription = supabase
            .channel('pos_tables_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
                fetchTables();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchMenu = async () => {
        const { data } = await supabase
            .from('menu_items')
            .select('*')
            .eq('is_available', true)
            .order('category', { ascending: true });

        if (data) setMenuItems(data as MenuItem[]);
    };

    const fetchTables = async () => {
        const { data } = await supabase
            .from('restaurant_tables')
            .select('*')
            .order('table_number');

        if (data) setTables(data as RestaurantTable[]);
        setLoading(false);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }

        if (discountType !== 'none') {
            const val = parseFloat(discountValue);
            if (isNaN(val) || val < 0) {
                toast.error('Please enter a valid discount value');
                return;
            }
            if (discountType === 'percent' && (val > 100)) {
                toast.error('Percentage discount cannot exceed 100%');
                return;
            }
        }

        setProcessing(true);

        try {
            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            let discountAmount = 0;
            if (discountType === 'percent' && discountValue) {
                discountAmount = parseFloat(discountValue);
            } else if (discountType === 'flat' && discountValue) {
                discountAmount = parseFloat(discountValue);
            }

            let discountLkr = 0;
            if (discountType === 'percent') {
                discountLkr = subtotal * (discountAmount / 100);
            } else if (discountType === 'flat') {
                discountLkr = discountAmount;
            }

            const taxAmount = subtotal * (taxRate / 100);
            const totalAmount = Math.max(0, subtotal - discountLkr + taxAmount);

            if (!isOnline) {
                addToQueue({
                    items: cart,
                    total_amount: totalAmount,
                    payment_method: paymentMethod,
                    created_at: new Date().toISOString(),
                    discount_amount: discountAmount > 0 ? discountAmount : null,
                    discount_type: discountType !== 'none' ? discountType : null,
                    table_number: selectedTableNumber ? parseInt(selectedTableNumber) : null,
                    customer_name: customerName || null,
                    tax_rate: taxRate,
                    tax_amount: taxAmount
                } as never);

                toast.success('Order saved offline! Will sync when online.');
                printReceipt({
                    id: `OFF-${Date.now().toString().slice(-4)}`,
                    created_at: new Date().toISOString(),
                    total_amount: totalAmount,
                    payment_method: paymentMethod,
                    discount_amount: discountAmount > 0 ? discountAmount : null,
                    discount_type: discountType !== 'none' ? discountType : null,
                    table_number: selectedTableNumber ? parseInt(selectedTableNumber) : null,
                    customer_name: customerName || null,
                    tax_rate: taxRate,
                    tax_amount: taxAmount,
                    business_name: businessInfo.business_name,
                    business_address: businessInfo.business_address,
                    business_phone: businessInfo.business_phone,
                    order_items: cart.map(item => ({
                        quantity: item.quantity,
                        price_at_time: item.price,
                        menu_items: { name: item.name },
                        portion: (item as Record<string, unknown>).portion || 'normal'
                    }))
                } as never);

                clearCart();
                setSelectedTableNumber('');
                setCustomerName('');
                setDiscountType('none');
                setDiscountValue('');
                setProcessing(false);
                return;
            }

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    total_amount: totalAmount,
                    payment_method: paymentMethod,
                    status: 'pending',
                    discount_amount: discountAmount > 0 ? discountAmount : null,
                    discount_type: discountType !== 'none' ? discountType : null,
                    table_number: selectedTableNumber ? parseInt(selectedTableNumber) : null,
                    customer_name: customerName || null,
                    tax_rate: taxRate,
                    tax_amount: taxAmount
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            if (selectedTableNumber) {
                await supabase
                    .from('restaurant_tables')
                    .update({
                        status: 'occupied',
                        current_order_id: order.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('table_number', parseInt(selectedTableNumber));
            }

            const orderItems = cart.map(item => ({
                order_id: order.id,
                menu_item_id: (item as Record<string, unknown>).original_id || item.id,
                quantity: item.quantity,
                price_at_time: item.price,
                portion: (item as Record<string, unknown>).portion || 'normal'
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            logOrderAction(user?.id, order.id, 'created', {
                total: totalAmount,
                payment_method: paymentMethod,
                item_count: cart.length
            });

            toast.success('Order placed successfully!');

            printReceipt({
                ...order,
                tax_rate: taxRate,
                tax_amount: taxAmount,
                business_name: businessInfo.business_name,
                business_address: businessInfo.business_address,
                business_phone: businessInfo.business_phone,
                order_items: cart.map(item => ({
                    quantity: item.quantity,
                    price_at_time: item.price,
                    menu_items: { name: item.name },
                    portion: (item as Record<string, unknown>).portion || 'normal'
                }))
            } as never);

            clearCart();
            setOrderType('takeaway');
            setSelectedTableNumber('');
            setCustomerName('');
            setDiscountType('none');
            setDiscountValue('');
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error('Failed to place order. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discountLkr = 0;
    const discountValNum = parseFloat(discountValue);
    if (!isNaN(discountValNum)) {
        if (discountType === 'percent') {
            discountLkr = subtotal * (discountValNum / 100);
        } else if (discountType === 'flat') {
            discountLkr = discountValNum;
        }
    }
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = Math.max(0, subtotal - discountLkr + taxAmount);

    return (
        <div className="h-full relative">
            {/* Menu Selection - Full Width */}
            <div className="h-full overflow-y-auto pb-24 px-4 md:px-0">
                <motion.header
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 md:mb-8 sticky top-0 bg-bg z-20 pt-4 pb-2"
                >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl md:text-4xl font-bold text-text mb-2">New Order</h1>
                            <p className="text-text-muted text-lg">Select items to build the bowl.</p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                            <input
                                type="text"
                                placeholder="Search items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-text focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {categories.map(category => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`
                                    px-6 py-2 rounded-full font-bold whitespace-nowrap transition-all
                                    ${selectedCategory === category
                                        ? 'bg-primary text-bg shadow-lg shadow-primary/25'
                                        : 'bg-surface text-text-muted hover:bg-surface-hover hover:text-text border border-border'}
                                `}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </motion.header>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center text-text-muted py-20">
                        <p className="text-xl">No items found.</p>
                        <p className="text-sm">Try adjusting your search or category.</p>
                    </div>
                ) : (
                    <motion.div
                        layout
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    >
                        <AnimatePresence mode='popLayout'>
                            {filteredItems.map(item => (
                                <motion.button
                                    layout
                                    key={item.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        if (item.has_portions) {
                                            setSelectedItemForPortion(item);
                                        } else {
                                            addToCart({ ...item, cartItemId: item.id, original_id: item.id, portion: 'normal' } as never);
                                            toast.success(`Added ${item.name}`);
                                        }
                                    }}
                                    className="glass rounded-2xl hover:bg-surface-hover hover:border-primary/50 transition-all text-left group relative overflow-hidden h-full flex flex-col justify-between"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    {item.image_url && (
                                        <div className="h-28 w-full overflow-hidden relative">
                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        </div>
                                    )}
                                    <div className="p-4 md:p-5 relative z-10 w-full flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-base text-text group-hover:text-primary leading-tight truncate">{item.name}</div>
                                                {item.category && !item.image_url && (
                                                    <span className="text-[10px] uppercase tracking-wider font-bold text-text-muted bg-bg/50 px-2 py-1 rounded-md">
                                                        {item.category}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-text-muted font-medium">LKR {item.price}</div>
                                        </div>
                                        <div className="relative z-10 mt-3 flex justify-between items-center">
                                            {item.category && item.image_url ? (
                                                <span className="text-[9px] uppercase tracking-wider font-bold text-text-muted bg-bg/50 px-2 py-0.5 rounded-md">
                                                    {item.category}
                                                </span>
                                            ) : <div />}
                                            <div className="bg-surface p-2 rounded-full text-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                                <Plus size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>

            {/* Bottom Cart Summary Bar */}
            <AnimatePresence>
                {cart.length > 0 && !isCartOpen && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="fixed bottom-6 left-4 right-4 md:left-72 md:right-8 z-30 pr-20"
                    >
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="w-full bg-primary text-bg p-4 rounded-2xl shadow-2xl shadow-primary/30 flex justify-between items-center"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-bg/20 p-2 rounded-lg">
                                    <ShoppingBag size={24} />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-lg">{cart.reduce((acc, item) => acc + item.quantity, 0)} Items</div>
                                    <div className="text-sm opacity-80">View Order</div>
                                </div>
                            </div>
                            <div className="font-bold text-xl">
                                LKR {totalAmount.toLocaleString()}
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Portion Selection Modal */}
            {selectedItemForPortion && (
                <>
                    <div
                        onClick={() => setSelectedItemForPortion(null)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
                    />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface border border-border rounded-3xl p-6 shadow-2xl z-[9999] w-full max-w-sm animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-text">Select Portion Size</h2>
                            <button
                                onClick={() => setSelectedItemForPortion(null)}
                                className="p-2 hover:bg-surface-hover rounded-full text-text-muted"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <button
                                onClick={() => handleAddPortionItem(selectedItemForPortion, 'normal')}
                                className="w-full bg-surface-hover border border-border hover:border-primary p-4 rounded-xl text-left transition-colors flex justify-between items-center"
                            >
                                <div>
                                    <div className="font-bold text-text">Normal</div>
                                    <div className="text-sm text-text-muted">{selectedItemForPortion.name}</div>
                                </div>
                                <div className="font-bold text-primary">LKR {selectedItemForPortion.price}</div>
                            </button>
                            <button
                                onClick={() => handleAddPortionItem(selectedItemForPortion, 'large')}
                                className="w-full bg-surface-hover border border-border hover:border-primary p-4 rounded-xl text-left transition-colors flex justify-between items-center"
                            >
                                <div>
                                    <div className="font-bold text-text">Large</div>
                                    <div className="text-sm text-text-muted">{selectedItemForPortion.name}</div>
                                </div>
                                <div className="font-bold text-primary">LKR {selectedItemForPortion.large_price || 0}</div>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Cart Drawer Overlay */}
            {isCartOpen && (
                <>
                    <div
                        onClick={() => setIsCartOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
                    />
                    <div
                        className="fixed top-0 right-0 h-full w-full md:w-[400px] bg-surface border-l border-border shadow-2xl z-[9999] flex flex-col animate-in slide-in-from-right duration-200"
                    >
                        <div className="p-4 border-b border-border flex justify-between items-center bg-surface/50 backdrop-blur-xl">
                            <h2 className="text-xl font-bold text-text flex items-center gap-2">
                                <ShoppingBag className="text-primary" />
                                Current Order
                            </h2>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 hover:bg-surface-hover rounded-full text-text-muted"
                            >
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
                                                <button onClick={() => updateQuantity(item.cartItemId || item.id, item.quantity - 1)} className="p-2 hover:text-primary hover:bg-bg rounded-lg transition-colors"><Minus size={16} /></button>
                                                <span className="font-bold w-6 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.cartItemId || item.id, item.quantity + 1)} className="p-2 hover:text-primary hover:bg-bg rounded-lg transition-colors"><Plus size={16} /></button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Order Details (Table, Customer, Discounts) */}
                                    <div className="border-t border-border/50 pt-4 mt-6 space-y-4">
                                        <h3 className="text-sm font-bold text-text uppercase tracking-wider">Order Details</h3>

                                        {/* Order Type Toggle */}
                                        <div>
                                            <label className="text-xs font-bold text-text-muted uppercase mb-1.5 block">Order Type</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['takeaway', 'dine_in'].map((type) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => {
                                                            setOrderType(type);
                                                            if (type === 'takeaway') setSelectedTableNumber('');
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

                                        {/* Table picker – only when Dine In */}
                                        {orderType === 'dine_in' && (
                                            <div>
                                                <label className="text-xs font-bold text-text-muted uppercase mb-1 block">Table</label>
                                                <select
                                                    value={selectedTableNumber}
                                                    onChange={(e) => setSelectedTableNumber(e.target.value)}
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

                                        {/* Customer Name */}
                                        <div>
                                            <label className="text-xs font-bold text-text-muted uppercase mb-1 block">Customer Name <span className="normal-case text-text-muted/60">(optional)</span></label>
                                            <input
                                                type="text"
                                                placeholder="e.g. John"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
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
                                                            setDiscountType(type);
                                                            if (type === 'none') setDiscountValue('');
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
                                                        onChange={(e) => setDiscountValue(e.target.value)}
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
                                    onClick={() => setPaymentMethod('cash')}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all border ${paymentMethod === 'cash' ? 'bg-primary/20 text-primary border-primary' : 'bg-surface border-border text-text-muted hover:border-text-muted'}`}
                                >
                                    Cash
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('card')}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all border ${paymentMethod === 'card' ? 'bg-primary/20 text-primary border-primary' : 'bg-surface border-border text-text-muted hover:border-text-muted'}`}
                                >
                                    Card
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    handleCheckout();
                                    setIsCartOpen(false);
                                }}
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
            )}
        </div>
    );
};

export default POS;
