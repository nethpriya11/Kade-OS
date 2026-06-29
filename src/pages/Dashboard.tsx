import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown, ShoppingBag, DollarSign, AlertCircle, Clock, Users, FileText, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import DailyReport from '../components/DailyReport';
import { toast } from 'sonner';

interface Stats {
    dailyRevenue: number;
    orderCount: number;
    lowStockCount: number;
    pendingOrders: number;
}

interface WeekStats {
    revenue: number;
    lastWeekRevenue: number;
}

interface TopItem {
    name: string;
    count: number;
}

interface StaffMember {
    user_id: string;
}

interface StatCardProps {
    title: string;
    value: string | number;
    subtext?: string;
    color: string;
    delay: number;
    trend?: number | null;
    children: React.ReactNode;
}

const StatCard = ({ title, value, subtext, color, delay, trend, children }: StatCardProps) => (
    <div
        className="glass p-6 rounded-3xl hover:bg-surface-hover transition-all duration-300 group relative overflow-hidden"
    >
        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-2xl ${color === 'primary' ? 'bg-primary' : color === 'secondary' ? 'bg-secondary' : 'bg-red-500'}`} />
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
                <p className="text-text-muted text-sm font-bold mb-1 uppercase tracking-wider">{title}</p>
                <h3 className="text-4xl font-bold text-text group-hover:scale-105 transition-transform origin-left">{value}</h3>
            </div>
            <div className={`p-4 rounded-2xl ${color === 'primary' ? 'bg-primary/10 text-primary' : color === 'secondary' ? 'bg-secondary/10 text-secondary' : 'bg-red-500/10 text-red-400'} group-hover:rotate-12 transition-transform border border-white/5`}>
                {children}
            </div>
        </div>
        <div className="flex items-center gap-2 relative z-10">
            {subtext && <p className="text-sm text-text-muted font-medium">{subtext}</p>}
            {trend !== undefined && trend !== null && (
                <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-lg ${trend >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                    {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {Math.abs(trend).toFixed(0)}%
                </span>
            )}
        </div>
    </div>
);

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
};

const Dashboard = () => {
    const { profile } = useAuthStore();
    const [stats, setStats] = useState<Stats>({ dailyRevenue: 0, orderCount: 0, lowStockCount: 0, pendingOrders: 0 });
    const [weekStats, setWeekStats] = useState<WeekStats>({ revenue: 0, lastWeekRevenue: 0 });
    const [topItem, setTopItem] = useState<TopItem | null>(null);
    const [staffOnDuty, setStaffOnDuty] = useState<StaffMember[]>([]);
    const [showReport, setShowReport] = useState(false);

    async function fetchStats() {
        try {
            const now = new Date();
            let startOfBusinessDay = new Date(now);
            if (now.getHours() < 4) startOfBusinessDay.setDate(now.getDate() - 1);
            startOfBusinessDay.setHours(4, 0, 0, 0);
            const startOfDay = startOfBusinessDay.toISOString();

            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - 7);
            weekStart.setHours(4, 0, 0, 0);

            const lastWeekStart = new Date(weekStart);
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);

            const [ordersRes, lowStockRes, pendingRes, weekOrdersRes, lastWeekRes, staffRes] = await Promise.all([
                supabase.from('orders').select('total_amount, order_items(*, menu_items(name))').gte('created_at', startOfDay).eq('status', 'completed'),
                supabase.from('ingredients').select('*', { count: 'exact', head: true }).lt('current_stock', 5),
                supabase.from('orders').select('*', { count: 'exact', head: true }).neq('status', 'completed').neq('status', 'cancelled'),
                supabase.from('orders').select('total_amount').gte('created_at', weekStart.toISOString()).eq('status', 'completed'),
                supabase.from('orders').select('total_amount').gte('created_at', lastWeekStart.toISOString()).lt('created_at', weekStart.toISOString()).eq('status', 'completed'),
                supabase.from('shifts').select('user_id').is('clock_out', null),
            ]);

            const orders = (ordersRes.data as { total_amount: number; order_items: { menu_items: { name: string } | null; quantity: number }[] | null }[]) || [];
            const dailyRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

            const itemMap: Record<string, number> = {};
            orders.forEach(o => o.order_items?.forEach(item => {
                const name = item.menu_items?.name || 'Unknown';
                itemMap[name] = (itemMap[name] || 0) + item.quantity;
            }));
            const top = Object.entries(itemMap).sort(([, a], [, b]) => b - a)[0];
            setTopItem(top ? { name: top[0], count: top[1] } : null);

            const weekRevenue = ((weekOrdersRes.data as { total_amount: number }[]) || []).reduce((s, o) => s + Number(o.total_amount || 0), 0);
            const lastWeekRevenue = ((lastWeekRes.data as { total_amount: number }[]) || []).reduce((s, o) => s + Number(o.total_amount || 0), 0);

            setStats({
                dailyRevenue,
                orderCount: orders.length,
                lowStockCount: lowStockRes.count || 0,
                pendingOrders: pendingRes.count || 0,
            });
            setWeekStats({ revenue: weekRevenue, lastWeekRevenue });
            setStaffOnDuty((staffRes.data as StaffMember[]) || []);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            toast.error('Failed to load dashboard data');
        }
    }

    useEffect(() => {
        fetchStats();
        const subscription = supabase
            .channel('dashboard_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchStats)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, fetchStats)
            .subscribe();
        return () => { supabase.removeChannel(subscription); };
    }, []);

    const weekTrend = weekStats.lastWeekRevenue > 0
        ? ((weekStats.revenue - weekStats.lastWeekRevenue) / weekStats.lastWeekRevenue) * 100
        : null;

    return (
        <div className="max-w-6xl mx-auto pt-2 md:pt-4">
            {showReport && <DailyReport onClose={() => setShowReport(false)} />}

            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-8 md:mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
                <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="Kadé" className="h-10 md:h-12 object-contain" />
                    <div>
                        <h1 className="text-3xl md:text-5xl font-bold text-text tracking-tight">{getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Chief'}</h1>
                        <p className="text-text-muted text-base md:text-lg font-medium">Here's what's happening at Kadé today.</p>
                    </div>
                </div>
                <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowReport(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-surface border border-border rounded-2xl text-text-muted hover:text-text hover:border-primary/40 transition-all font-medium text-sm"
                >
                    <FileText size={16} />
                    Daily Report
                </motion.button>
            </motion.header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-8 md:mb-10">
                <StatCard
                    title="Daily Revenue"
                    value={`LKR ${stats.dailyRevenue.toLocaleString()}`}
                    subtext={`${stats.orderCount} orders today`}
                    color="primary"
                    delay={0.1}
                ><DollarSign size={28} strokeWidth={2} /></StatCard>
                <StatCard
                    title="This Week"
                    value={`LKR ${weekStats.revenue.toLocaleString()}`}
                    subtext="vs last week"
                    color="secondary"
                    delay={0.15}
                    trend={weekTrend}
                ><BarChart2 size={28} strokeWidth={2} /></StatCard>
                <StatCard
                    title="Pending Orders"
                    value={stats.pendingOrders}
                    subtext="In kitchen / ready"
                    color="primary"
                    delay={0.2}
                ><Clock size={28} strokeWidth={2} /></StatCard>
                <StatCard
                    title="Low Stock Alerts"
                    value={stats.lowStockCount}
                    subtext="Items need restocking"
                    color="danger"
                    delay={0.25}
                ><AlertCircle size={28} strokeWidth={2} /></StatCard>
            </div>

            {/* Highlights Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Top Item */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="glass p-5 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary text-2xl">🏆</div>
                    <div>
                        <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Today's Top Item</p>
                        <p className="font-bold text-text text-lg mt-0.5">{topItem?.name || '—'}</p>
                        <p className="text-text-muted text-sm">{topItem ? `${topItem.count} sold` : 'No sales yet'}</p>
                    </div>
                </motion.div>

                {/* Staff on Duty */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                    className="glass p-5 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
                        <Users size={22} />
                    </div>
                    <div>
                        <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Staff on Duty</p>
                        <p className="font-bold text-text text-3xl mt-0.5">{staffOnDuty.length}</p>
                        <p className="text-text-muted text-sm">Clocked in now</p>
                    </div>
                </motion.div>

                {/* Orders Today */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="glass p-5 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-blue-400/10 rounded-xl text-blue-400">
                        <ShoppingBag size={22} />
                    </div>
                    <div>
                        <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Orders Today</p>
                        <p className="font-bold text-text text-3xl mt-0.5">{stats.orderCount}</p>
                        <p className="text-text-muted text-sm">Completed orders</p>
                    </div>
                </motion.div>
            </div>

            {/* Quick Actions */}
            <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="text-xl md:text-2xl font-bold text-text mb-4 md:mb-6"
            >
                Quick Actions
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                    <Link to="/pos" className="bg-primary text-bg font-bold p-6 md:p-8 rounded-3xl flex items-center justify-between hover:scale-[1.02] transition-transform no-underline shadow-lg shadow-primary/20 group relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <div className="flex flex-col items-start relative z-10">
                            <span className="text-xl md:text-3xl mb-1">New Order (POS)</span>
                            <span className="text-bg/80 font-medium text-lg">Enter speed mode</span>
                        </div>
                        <div className="bg-bg/20 p-3 md:p-4 rounded-2xl group-hover:bg-bg/30 transition-colors relative z-10">
                            <TrendingUp size={28} />
                        </div>
                    </Link>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 }}>
                    <Link to="/procurement" className="glass text-text font-bold p-6 md:p-8 rounded-3xl flex items-center justify-between hover:bg-surface-hover transition-colors no-underline group relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <div className="flex flex-col items-start relative z-10">
                            <span className="text-xl md:text-3xl mb-1">Shopping List</span>
                            <span className="text-text-muted font-medium text-lg">Manage procurement</span>
                        </div>
                        <div className="bg-surface p-3 md:p-4 rounded-2xl border border-border group-hover:border-primary/50 transition-colors relative z-10">
                            <ShoppingBag size={28} className="text-text-muted group-hover:text-primary transition-colors" />
                        </div>
                    </Link>
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;
