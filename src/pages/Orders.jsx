import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, CheckCircle, ChefHat, Bell, Volume2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();

        const subscription = supabase
            .channel('orders_kanban')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchOrders();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchOrders = async () => {
        const { data } = await supabase
            .from('orders')
            .select(`*, order_items (*, menu_items (name))`)
            .neq('status', 'completed') // Only show active orders
            .neq('status', 'cancelled')
            .order('created_at', { ascending: true });

        if (data) setOrders(data);
        setLoading(false);
    };

    const updateStatus = async (id, newStatus) => {
        await supabase.from('orders').update({ status: newStatus }).eq('id', id);

        // Optimistic update
        setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));

        // Deduct Inventory if Completed
        if (newStatus === 'completed') {
            const order = orders.find(o => o.id === id);
            if (order && order.order_items) {
                for (const item of order.order_items) {
                    const { data: recipe } = await supabase
                        .from('recipes')
                        .select('ingredient_id, quantity_required')
                        .eq('menu_item_id', item.menu_item_id);

                    if (recipe) {
                        for (const r of recipe) {
                            await supabase.rpc('decrement_stock', {
                                row_id: r.ingredient_id,
                                amount: r.quantity_required * item.quantity
                            });
                        }
                    }
                }
            }
        }
    };

    const getTimeElapsed = (dateString) => {
        const diff = new Date() - new Date(dateString);
        const mins = Math.floor(diff / 60000);
        return `${mins} mins ago`;
    };

    const KanbanColumn = ({ title, status, color, icon: Icon, count }) => (
        <div className="flex-1 flex flex-col bg-surface/50 rounded-3xl border border-border p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-text">{title}</h2>
                    <span className="bg-bg px-3 py-1 rounded-full text-sm font-bold text-text-muted border border-border">
                        {count}
                    </span>
                </div>
                {Icon && <Icon className={`text-${color}`} size={24} />}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto">
                <AnimatePresence mode='popLayout'>
                    {orders.filter(o => o.status === status).map(order => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            key={order.id}
                            className="bg-surface border border-border rounded-2xl p-5 shadow-lg hover:border-primary/50 transition-all group relative overflow-hidden"
                        >
                            <div className={`absolute top-0 right-0 w-20 h-20 bg-${color}/5 rounded-bl-full -mr-4 -mt-4 transition-all group-hover:bg-${color}/10`} />

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div>
                                    <h3 className="text-2xl font-bold text-text">#{order.id.slice(0, 4)}</h3>
                                    <p className="text-text-muted text-sm">Guest</p>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="bg-bg px-2 py-1 rounded-lg text-xs font-bold text-text-muted mb-1 flex items-center gap-1">
                                        <Clock size={12} /> {getTimeElapsed(order.created_at)}
                                    </span>
                                    <span className="text-xs font-bold text-primary">Takeout</span>
                                </div>
                            </div>

                            <div className="space-y-2 mb-6 border-t border-border/50 pt-4 relative z-10">
                                {order.order_items?.map(item => (
                                    <div key={item.id} className="flex justify-between text-base">
                                        <span className="text-text font-bold">
                                            <span className="text-primary text-lg mr-3">{item.quantity}x</span>
                                            {item.menu_items?.name}
                                        </span>
                                    </div>
                                ))}
                            </div>



                            <div className="relative z-10">
                                {status === 'pending' && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => updateStatus(order.id, 'in_progress')}
                                        className="w-full py-3 rounded-xl bg-secondary text-bg font-bold hover:brightness-110 transition-all shadow-lg shadow-secondary/20"
                                    >
                                        Start Preparing
                                    </motion.button>
                                )}
                                {status === 'in_progress' && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => updateStatus(order.id, 'ready')}
                                        className="w-full py-3 rounded-xl bg-primary text-bg font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20"
                                    >
                                        Mark as Ready
                                    </motion.button>
                                )}
                                {status === 'ready' && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => updateStatus(order.id, 'completed')}
                                        className="w-full py-3 rounded-xl bg-surface-hover text-text-muted font-bold hover:text-text hover:bg-border transition-all"
                                    >
                                        Complete Order
                                    </motion.button>
                                )}
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Are you sure you want to cancel this order?')) {
                                        updateStatus(order.id, 'cancelled');
                                    }
                                }}
                                className="absolute top-4 right-4 p-2 bg-surface-hover text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors z-20"
                                title="Cancel Order"
                            >
                                <X size={18} />
                            </motion.button>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {orders.filter(o => o.status === status).length === 0 && (
                    <div className="text-center text-text-muted py-10 opacity-50">
                        No orders
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-8"
            >
                <div>
                    <h1 className="text-3xl font-bold text-primary mb-2">Incoming Orders</h1>
                    <p className="text-text-muted">Manage and track all customer orders in real-time.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-surface border border-border p-3 rounded-xl text-text-muted">
                        <Bell size={20} />
                    </div>
                    <div className="bg-surface border border-border p-3 rounded-xl text-primary bg-primary/10">
                        <Volume2 size={20} />
                    </div>
                </div>
            </motion.header>

            <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
                <KanbanColumn
                    title="Pending"
                    status="pending"
                    color="secondary"
                    icon={Clock}
                    count={orders.filter(o => o.status === 'pending').length}
                />
                <KanbanColumn
                    title="In Progress"
                    status="in_progress"
                    color="primary"
                    icon={ChefHat}
                    count={orders.filter(o => o.status === 'in_progress').length}
                />
                <KanbanColumn
                    title="Ready for Pickup"
                    status="ready"
                    color="primary"
                    icon={CheckCircle}
                    count={orders.filter(o => o.status === 'ready').length}
                />
            </div>
        </div>
    );
};

export default Orders;
