import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store/cartStore';
import { useOfflineStore } from '../store/offlineStore';
import { Plus, Minus, Trash2, CheckCircle, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { printReceipt } from '../utils/printReceipt';

const POS = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const { cart, addToCart, removeFromCart, updateQuantity, clearCart } = useCartStore();
    const { isOnline, addToQueue } = useOfflineStore();
    const [processing, setProcessing] = useState(false);

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

    const categories = ['Base', 'Protein', 'Drink', 'Extra'];

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
        <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-40px)] gap-6 md:gap-8 pb-20 md:pb-0">
            {/* Menu Selection */}
            <div className="flex-1 overflow-y-auto pr-0 md:pr-4 min-w-0">
                <motion.header
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 md:mb-8"
                >
                    <h1 className="text-2xl md:text-4xl font-bold text-text mb-2">New Order</h1>
                    <p className="text-text-muted text-lg">Select items to build the bowl.</p>
                </motion.header>

                {categories.map((category, catIndex) => {
                    const items = menuItems.filter(i => i.category === category);
                    if (items.length === 0) return null;

                    return (
                        <motion.div
                            key={category}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: catIndex * 0.05 }}
                            className="mb-8 md:mb-10"
                        >
                            <h2 className="text-sm font-bold text-primary mb-4 uppercase tracking-widest border-b border-border pb-2">{category}</h2>
                            <motion.div
                                variants={container}
                                initial="hidden"
                                animate="show"
                                className="grid grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4"
                            >
                                {items.map(item => (
                                    <motion.button
                                        key={item.id}
                                        variants={itemAnim}
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => addToCart(item)}
                                        className="glass p-4 md:p-5 rounded-2xl hover:bg-surface-hover hover:border-primary/50 transition-all text-left group relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative z-10">
                                            <div className="font-bold text-lg text-text group-hover:text-primary mb-1">{item.name}</div>
                                            <div className="text-sm text-text-muted font-medium">LKR {item.price}</div>
                                        </div>
                                    </motion.button>
                                ))}
                            </motion.div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Cart / Checkout */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full md:w-[320px] lg:w-[400px] glass rounded-3xl flex flex-col h-[500px] md:h-full shadow-2xl shadow-black/50 order-first md:order-last mb-6 md:mb-0 overflow-hidden shrink-0"
            >
                <div className="p-4 md:p-6 border-b border-border bg-surface/50 backdrop-blur-xl">
                    <h2 className="text-xl font-bold text-text flex items-center gap-2">
                        <ShoppingBag className="text-primary" />
                        Current Order
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    <AnimatePresence mode='popLayout'>
                        {cart.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-full flex flex-col items-center justify-center text-text-muted opacity-30"
                            >
                                <ShoppingBag size={64} className="mb-4" />
                                <p className="text-lg font-medium">Cart is empty</p>
                            </motion.div>
                        ) : (
                            <div className="space-y-4">
                                {cart.map(item => (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="flex justify-between items-center bg-surface p-3 md:p-4 rounded-2xl border border-border group"
                                    >
                                        <div>
                                            <div className="font-bold text-text">{item.name}</div>
                                            <div className="text-sm text-primary font-medium">LKR {item.price * item.quantity}</div>
                                        </div>
                                        <div className="flex items-center gap-2 md:gap-3 bg-bg rounded-xl p-1">
                                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 hover:text-primary hover:bg-surface rounded-lg transition-colors"><Minus size={16} /></button>
                                            <span className="font-bold w-6 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 hover:text-primary hover:bg-surface rounded-lg transition-colors"><Plus size={16} /></button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="p-6 md:p-8 border-t border-border bg-surface/80 backdrop-blur-md">
                    <div className="flex justify-between items-center mb-6 md:mb-8">
                        <span className="text-text-muted font-medium">Total Amount</span>
                        <span className="text-3xl font-bold text-primary">LKR {cart.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()}</span>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || processing}
                        className="w-full bg-primary text-bg font-bold py-4 md:py-5 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
                    >
                        {processing ? 'Processing...' : (
                            <>
                                <span className="text-lg">Complete Order</span>
                                <CheckCircle size={24} />
                            </>
                        )}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
};

export default POS;
