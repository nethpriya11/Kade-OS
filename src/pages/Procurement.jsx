import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { ShoppingBag, CheckCircle, AlertCircle } from 'lucide-react';

const Procurement = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLowStockItems();
    }, []);

    const fetchLowStockItems = async () => {
        const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .lt('current_stock', 10) // Threshold for shopping list
            .order('current_stock', { ascending: true });

        if (data) setItems(data);
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold text-text mb-2">Procurement</h1>
                <p className="text-text-muted">Shopping list based on low stock items.</p>
            </motion.header>

            <div className="glass p-6 rounded-3xl">
                <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                    <ShoppingBag className="text-secondary" size={24} />
                    <h2 className="text-xl font-bold text-text">Shopping List</h2>
                </div>

                {loading ? (
                    <div className="text-center py-10 text-text-muted">Loading...</div>
                ) : items.length === 0 ? (
                    <div className="text-center py-10 text-text-muted flex flex-col items-center gap-4">
                        <CheckCircle size={48} className="text-green-500/50" />
                        <p>Everything is well stocked!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center justify-between bg-surface p-4 rounded-xl border border-border"
                            >
                                <div>
                                    <div className="font-bold text-text text-lg">{item.name}</div>
                                    <div className="text-sm text-text-muted">
                                        Current Stock: <span className="text-red-400 font-bold">{item.current_stock} {item.unit}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-xs text-text-muted uppercase tracking-wider">To Buy</div>
                                        <div className="font-bold text-secondary">
                                            {Math.max(0, 20 - item.current_stock)} {item.unit}
                                        </div>
                                    </div>
                                    <input type="checkbox" className="w-6 h-6 rounded-lg border-border bg-bg text-primary focus:ring-primary" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Procurement;
