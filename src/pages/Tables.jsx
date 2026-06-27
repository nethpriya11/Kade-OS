import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LayoutGrid, Circle, Users, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const TABLE_STATUS_CONFIG = {
    free: { label: 'Free', color: 'bg-green-500/10 border-green-500/30 text-green-400', dot: 'bg-green-400' },
    occupied: { label: 'Occupied', color: 'bg-primary/10 border-primary/30 text-primary', dot: 'bg-primary animate-pulse' },
    reserved: { label: 'Reserved', color: 'bg-purple-500/10 border-purple-500/30 text-purple-400', dot: 'bg-purple-400' },
};

const Tables = () => {
    const [tables, setTables] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState(null);

    useEffect(() => {
        fetchData();
        const sub = supabase
            .channel('tables_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
            .subscribe();
        return () => sub.unsubscribe();
    }, []);

    const fetchData = async () => {
        const { data: tablesData } = await supabase
            .from('restaurant_tables')
            .select('*')
            .order('table_number');

        const { data: ordersData } = await supabase
            .from('orders')
            .select('*, order_items(*, menu_items(name))')
            .neq('status', 'completed')
            .neq('status', 'cancelled')
            .not('table_number', 'is', null);

        if (tablesData) setTables(tablesData);
        if (ordersData) setOrders(ordersData);
        setLoading(false);
    };

    const updateTableStatus = async (tableId, status) => {
        const { error } = await supabase
            .from('restaurant_tables')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', tableId);

        if (error) toast.error('Failed to update table');
        else {
            toast.success(`Table marked as ${status}`);
            setSelectedTable(null);
            fetchData();
        }
    };

    const getTableOrder = (tableNum) => orders.find(o => o.table_number === tableNum);

    const stats = {
        free: tables.filter(t => t.status === 'free').length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        reserved: tables.filter(t => t.status === 'reserved').length,
    };

    return (
        <div className="max-w-6xl mx-auto">
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex items-center gap-4"
            >
                <div className="p-3 bg-secondary/10 rounded-2xl text-secondary">
                    <LayoutGrid size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-text">Floor Plan</h1>
                    <p className="text-text-muted">Live table status and floor management.</p>
                </div>
            </motion.header>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                    { label: 'Free', count: stats.free, color: 'text-green-400', bg: 'bg-green-400/10' },
                    { label: 'Occupied', count: stats.occupied, color: 'text-primary', bg: 'bg-primary/10' },
                    { label: 'Reserved', count: stats.reserved, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                ].map(s => (
                    <motion.div key={s.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass p-5 rounded-2xl text-center"
                    >
                        <p className={`text-3xl font-bold ${s.color}`}>{s.count}</p>
                        <p className="text-text-muted text-sm font-medium mt-1">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Table Legend */}
            <div className="flex flex-wrap gap-4 mb-6 text-sm">
                {Object.entries(TABLE_STATUS_CONFIG).map(([status, config]) => (
                    <div key={status} className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                        <span className="text-text-muted font-medium">{config.label}</span>
                    </div>
                ))}
            </div>

            {/* Floor Grid */}
            {loading ? (
                <div className="text-center py-20 text-text-muted">Loading floor plan...</div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {tables.map((table, i) => {
                        const config = TABLE_STATUS_CONFIG[table.status];
                        const order = getTableOrder(table.table_number);

                        return (
                            <motion.div
                                key={table.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.03 }}
                                onClick={() => setSelectedTable(selectedTable?.id === table.id ? null : table)}
                                className={`relative border-2 rounded-2xl p-4 cursor-pointer transition-all hover:scale-105 ${config.color} ${selectedTable?.id === table.id ? 'ring-2 ring-white/30' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-2xl font-bold">{table.table_number}</span>
                                    <div className={`w-2.5 h-2.5 rounded-full ${config.dot} mt-1`} />
                                </div>
                                <div className="flex items-center gap-1 text-xs opacity-70">
                                    <Users size={11} />
                                    <span>{table.capacity}</span>
                                </div>
                                {order && (
                                    <div className="mt-2 text-xs font-bold opacity-90">
                                        #{order.id.slice(0, 4)}
                                        {order.customer_name && <div className="font-normal opacity-70 truncate">{order.customer_name}</div>}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Selected Table Panel */}
            {selectedTable && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm glass border border-primary/20 rounded-3xl p-6 shadow-2xl z-50"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-text">Table {selectedTable.table_number}</h3>
                            <p className="text-text-muted text-sm capitalize">{selectedTable.status} · {selectedTable.capacity} seats</p>
                        </div>
                        <button onClick={() => setSelectedTable(null)} className="p-2 text-text-muted hover:text-text hover:bg-surface-hover rounded-xl transition-colors">✕</button>
                    </div>
                    {getTableOrder(selectedTable.table_number) && (
                        <div className="mb-4 p-3 bg-surface rounded-xl border border-border">
                            <p className="text-xs text-text-muted font-bold mb-2 uppercase tracking-wider">Active Order</p>
                            {getTableOrder(selectedTable.table_number)?.order_items?.map(item => (
                                <p key={item.id} className="text-sm text-text">{item.quantity}× {item.menu_items?.name}</p>
                            ))}
                        </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                        {['free', 'occupied', 'reserved'].map(status => (
                            <button
                                key={status}
                                onClick={() => updateTableStatus(selectedTable.id, status)}
                                className={`py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${selectedTable.status === status ? 'bg-primary text-bg' : 'bg-surface border border-border text-text-muted hover:text-text'}`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default Tables;
