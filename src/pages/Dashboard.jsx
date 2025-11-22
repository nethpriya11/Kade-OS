import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, ShoppingBag, DollarSign, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, subtext, icon: Icon, color, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay }}
        className="glass p-6 rounded-3xl hover:bg-surface-hover transition-all duration-300 group relative overflow-hidden"
    >
        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-2xl ${color === 'primary' ? 'bg-primary' : 'bg-secondary'}`} />

        <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
                <p className="text-text-muted text-sm font-bold mb-1 uppercase tracking-wider">{title}</p>
                <h3 className="text-4xl font-bold text-text group-hover:scale-105 transition-transform origin-left">{value}</h3>
            </div>
            <div className={`p-4 rounded-2xl ${color === 'primary' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'} group-hover:rotate-12 transition-transform border border-white/5`}>
                <Icon size={28} strokeWidth={2} />
            </div>
        </div>
        {subtext && <p className="text-sm text-text-muted font-medium relative z-10">{subtext}</p>}
    </motion.div>
);

const Dashboard = () => {
    const [stats, setStats] = useState({
        dailyRevenue: 0,
        orderCount: 0,
        lowStockCount: 0
    });
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        // Get start of today in local time, then convert to UTC ISO string
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const startOfDay = now.toISOString();

        // Fetch Orders for today
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('total_amount')
            .gte('created_at', startOfDay)
            .eq('status', 'completed');

        // Fetch Low Stock Items
        const { count: lowStockCount, error: stockError } = await supabase
            .from('ingredients')
            .select('*', { count: 'exact', head: true })
            .lt('current_stock', 5);

        if (!ordersError && !stockError) {
            const dailyRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
            setStats({
                dailyRevenue,
                orderCount: orders.length,
                lowStockCount: lowStockCount || 0
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchStats();

        // Realtime subscription for new orders
        const subscription = supabase
            .channel('dashboard_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                console.log('Dashboard: Order change detected, refreshing stats...');
                fetchStats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    return (
        <div className="max-w-6xl mx-auto pt-2 md:pt-4">
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-8 md:mb-10 flex flex-col md:flex-row items-start md:items-center gap-4"
            >
                <img src="/logo.png" alt="Kadé" className="h-10 md:h-12 object-contain" />
                <div>
                    <h1 className="text-3xl md:text-5xl font-bold text-text tracking-tight">Good Evening, Chief</h1>
                    <p className="text-text-muted text-base md:text-lg font-medium">Here's what's happening at Kadé today.</p>
                </div>
            </motion.header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
                <StatCard
                    title="Daily Revenue"
                    value={`LKR ${stats.dailyRevenue.toLocaleString()}`}
                    subtext={`${stats.orderCount} orders today`}
                    icon={DollarSign}
                    color="primary"
                    delay={0.1}
                />
                <StatCard
                    title="Orders"
                    value={stats.orderCount}
                    subtext="Avg. LKR 990 / order"
                    icon={ShoppingBag}
                    color="secondary"
                    delay={0.2}
                />
                <StatCard
                    title="Low Stock Alerts"
                    value={stats.lowStockCount}
                    subtext="Items need restocking"
                    icon={AlertCircle}
                    color="primary"
                    delay={0.3}
                />
            </div>

            {/* Quick Actions */}
            <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl md:text-2xl font-bold text-text mb-4 md:mb-6"
            >
                Quick Actions
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <Link to="/pos" className="bg-primary text-bg font-bold p-6 md:p-8 rounded-3xl flex items-center justify-between hover:scale-[1.02] transition-transform no-underline shadow-lg shadow-primary/20 group relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <div className="flex flex-col items-start relative z-10">
                            <span className="text-xl md:text-3xl mb-1">New Order (POS)</span>
                            <span className="text-bg/80 font-medium text-lg">Enter speed mode</span>
                        </div>
                        <div className="bg-bg/20 p-3 md:p-4 rounded-2xl group-hover:bg-bg/30 transition-colors relative z-10">
                            <TrendingUp size={28} md:size={32} />
                        </div>
                    </Link>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <Link to="/procurement" className="glass text-text font-bold p-6 md:p-8 rounded-3xl flex items-center justify-between hover:bg-surface-hover transition-colors no-underline group relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <div className="flex flex-col items-start relative z-10">
                            <span className="text-xl md:text-3xl mb-1">View Shopping List</span>
                            <span className="text-text-muted font-medium text-lg">Manage procurement</span>
                        </div>
                        <div className="bg-surface p-3 md:p-4 rounded-2xl border border-border group-hover:border-primary/50 transition-colors relative z-10">
                            <ShoppingBag size={28} md:size={32} className="text-text-muted group-hover:text-primary transition-colors" />
                        </div>
                    </Link>
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;
