import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store/cartStore';
import { useOfflineStore } from '../store/offlineStore';
import { Plus, Minus, Trash2, CheckCircle, ShoppingBag, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { printReceipt } from '../utils/printReceipt';

const POS = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const { cart, addToCart, removeFromCart, updateQuantity, clearCart } = useCartStore();
    const { isOnline, addToQueue } = useOfflineStore();

    const [processing, setProcessing] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const categories = ['All', 'Base', 'Protein', 'Drink', 'Extra'];

    const filteredItems = menuItems.filter(item => {
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    useEffect(() => {
        fetchMenu();
    }, []);

    const fetchMenu = async () => {
        const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .eq('is_available', true)
            .order('category', { ascending: true });

        if (data) setMenuItems(data);
        setLoading(false);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }

        setProcessing(true);

        try {
            const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            if (!isOnline) {
                // OFFLINE FLOW
                addToQueue({
                    items: cart,
                    total_amount: totalAmount,
                    created_at: new Date().toISOString()
                });

                toast.success('Order saved offline! Will sync when online.');
                printReceipt({
                    id: `OFF-${Date.now().toString().slice(-4)}`, // Temporary ID
                    created_at: new Date().toISOString(),
                    total_amount: totalAmount,
                    order_items: cart.map(item => ({
                        quantity: item.quantity,
                        price_at_time: item.price,
                        menu_items: { name: item.name }
                    }))
                });

                clearCart();
                setProcessing(false);
                return;
            }

            // ONLINE FLOW
            // 1. Create Order
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    total_amount: totalAmount,
                    status: 'pending'
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Create Order Items
            const orderItems = cart.map(item => ({
                order_id: order.id,
                menu_item_id: item.id,
                quantity: item.quantity,
                price_at_time: item.price
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // 3. Success
            toast.success('Order placed successfully!');

            // Print Receipt
            printReceipt({
                ...order,
                order_items: cart.map(item => ({
                    quantity: item.quantity,
                    price_at_time: item.price,
                    menu_items: { name: item.name }
                }))
            });

            clearCart();
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error('Failed to place order. Please try again.');
        } finally {
            setProcessing(false);
        }
    };



    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemAnim = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

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
                                        addToCart(item);
                                        toast.success(`Added ${item.name}`);
                                    }}
                                    className="glass p-4 md:p-5 rounded-2xl hover:bg-surface-hover hover:border-primary/50 transition-all text-left group relative overflow-hidden h-full flex flex-col justify-between"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10 w-full">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-bold text-lg text-text group-hover:text-primary leading-tight">{item.name}</div>
                                            {item.category && (
                                                <span className="text-[10px] uppercase tracking-wider font-bold text-text-muted bg-bg/50 px-2 py-1 rounded-md">
                                                    {item.category}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-text-muted font-medium">LKR {item.price}</div>
                                    </div>
                                    <div className="relative z-10 mt-3 flex justify-end">
                                        <div className="bg-surface p-2 rounded-full text-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                            <Plus size={16} />
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
                                LKR {cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cart Drawer Overlay */}
            {/* Cart Drawer */}
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
                                            key={item.id}
                                            className="flex justify-between items-center bg-bg p-4 rounded-2xl border border-border"
                                        >
                                            <div>
                                                <div className="font-bold text-text">{item.name}</div>
                                                <div className="text-sm text-primary font-medium">LKR {item.price * item.quantity}</div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-surface rounded-xl p-1 border border-border">
                                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 hover:text-primary hover:bg-bg rounded-lg transition-colors"><Minus size={16} /></button>
                                                <span className="font-bold w-6 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 hover:text-primary hover:bg-bg rounded-lg transition-colors"><Plus size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-border bg-surface/80 backdrop-blur-md">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-text-muted font-medium">Total Amount</span>
                                <span className="text-3xl font-bold text-primary">LKR {cart.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()}</span>
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
