import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ShoppingBag, DollarSign, AlertCircle, Clock, Users, FileText, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useDashboardData } from '../hooks/useDashboard';
import DailyReport from '../components/DailyReport';

interface StatCardProps {
    title: string;
    value: string | number;
    subtext?: string;
    color: string;
    trend?: number | null;
    children: React.ReactNode;
}

const StatCard = ({ title, value, subtext, color, trend, children }: StatCardProps) => (
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
    const { data } = useDashboardData();
    const [showReport, setShowReport] = useState(false);

    const weekTrend = data && data.lastWeekRevenue > 0
        ? ((data.weekRevenue - data.lastWeekRevenue) / data.lastWeekRevenue) * 100
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
                    value={`LKR ${(data?.dailyRevenue ?? 0).toLocaleString()}`}
                    subtext={`${data?.orderCount ?? 0} orders today`}
                    color="primary"
                ><DollarSign size={28} strokeWidth={2} /></StatCard>
                <StatCard
                    title="This Week"
                    value={`LKR ${(data?.weekRevenue ?? 0).toLocaleString()}`}
                    subtext="vs last week"
                    color="secondary"
                    trend={weekTrend}
                ><BarChart2 size={28} strokeWidth={2} /></StatCard>
                <StatCard
                    title="Pending Orders"
                    value={data?.pendingOrders ?? 0}
                    subtext="In kitchen / ready"
                    color="primary"
                ><Clock size={28} strokeWidth={2} /></StatCard>
                <StatCard
                    title="Low Stock Alerts"
                    value={data?.lowStockCount ?? 0}
                    subtext="Items need restocking"
                    color="danger"
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
                        <p className="font-bold text-text text-lg mt-0.5">{data?.topItem?.name || '—'}</p>
                        <p className="text-text-muted text-sm">{data?.topItem ? `${data.topItem.count} sold` : 'No sales yet'}</p>
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
                        <p className="font-bold text-text text-3xl mt-0.5">{data?.staffOnDuty ?? 0}</p>
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
                        <p className="font-bold text-text text-3xl mt-0.5">{data?.orderCount ?? 0}</p>
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
