import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, DollarSign, ShoppingBag, AlertTriangle, Download, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend, ComposedChart, Line
} from 'recharts';

const COLORS = ['#FFD700', '#00A86B', '#FF6B6B', '#4ECDC4', '#45B7D1', '#A78BFA'];
const PAYMENT_COLORS = { CASH: '#FFD700', CARD: '#4ECDC4', ONLINE: '#A78BFA' };

const Analytics = () => {
    const [timeRange, setTimeRange] = useState('today');
    const [compareMode, setCompareMode] = useState(false);
    const [metrics, setMetrics] = useState({ revenue: 0, orders: 0, avgOrderValue: 0, wastageCost: 0, netProfit: 0, totalExpenses: 0 });
    const [prevMetrics, setPrevMetrics] = useState({ revenue: 0, orders: 0 });
    const [revenueData, setRevenueData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);
    const [topItems, setTopItems] = useState([]);
    const [ordersList, setOrdersList] = useState([]);
    const [hourlyData, setHourlyData] = useState([]);
    const [paymentData, setPaymentData] = useState([]);

    useEffect(() => {
        fetchAnalytics();
        const sub = supabase
            .channel('analytics_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchAnalytics)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'wastage_logs' }, fetchAnalytics)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchAnalytics)
            .subscribe();
        return () => sub.unsubscribe();
    }, [timeRange]);

    const getDateRange = (range, offset = 0) => {
        const now = new Date();
        let startDate = new Date(now);
        if (now.getHours() < 4) startDate.setDate(now.getDate() - 1);
        startDate.setHours(4, 0, 0, 0);

        if (range === 'week') startDate.setDate(startDate.getDate() - 7);
        else if (range === 'month') startDate.setMonth(startDate.getMonth() - 1);

        if (offset !== 0) {
            const diff = now - startDate;
            startDate = new Date(startDate.getTime() - diff);
            return { start: startDate, end: new Date(startDate.getTime() + diff) };
        }
        return { start: startDate, end: now };
    };

    async function fetchAnalytics() {
        const { start } = getDateRange(timeRange);

        const [ordersRes, wastageRes, expensesRes] = await Promise.all([
            supabase.from('orders').select('*, order_items(*, menu_items(*))').gte('created_at', start.toISOString()).neq('status', 'cancelled'),
            supabase.from('wastage_logs').select('*').gte('created_at', start.toISOString()),
            supabase.from('expenses').select('*').gte('expense_date', start.toISOString().split('T')[0]),
        ]);

        const orders = ordersRes.data || [];
        const wastage = wastageRes.data || [];
        const expenses = expensesRes.data || [];

        if (compareMode) {
            const prevRange = getDateRange(timeRange, -1);
            const { data: prevOrders } = await supabase.from('orders').select('total_amount').gte('created_at', prevRange.start.toISOString()).lt('created_at', start.toISOString()).neq('status', 'cancelled');
            const prevRevenue = (prevOrders || []).reduce((s, o) => s + Number(o.total_amount || 0), 0);
            setPrevMetrics({ revenue: prevRevenue, orders: (prevOrders || []).length });
        }

        processAnalytics(orders, wastage, expenses);
        setOrdersList(orders);
    }

    const processAnalytics = (orders, wastage, expenses) => {
        const completedOrders = orders.filter(o => o.status === 'completed');
        const totalRevenue = completedOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
        const totalOrders = completedOrders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const totalWastage = wastage.reduce((s, w) => s + Number(w.cost_at_time || 0), 0);
        const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

        let totalCostOfGoods = 0;
        completedOrders.forEach(order => {
            order.order_items?.forEach(item => {
                const itemCost = item.menu_items?.cost || (item.price_at_time * 0.3);
                totalCostOfGoods += itemCost * item.quantity;
            });
        });

        const netProfit = totalRevenue - totalCostOfGoods - totalWastage - totalExpenses;

        setMetrics({ revenue: totalRevenue, orders: totalOrders, avgOrderValue, wastageCost: totalWastage, netProfit, totalExpenses });

        // Revenue trend
        const trendMap = {};
        completedOrders.forEach(order => {
            const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            trendMap[date] = (trendMap[date] || 0) + Number(order.total_amount);
        });
        setRevenueData(Object.entries(trendMap).map(([date, revenue]) => ({ date, revenue })));

        // Category sales
        const catMap = {};
        completedOrders.forEach(o => o.order_items?.forEach(item => {
            const cat = item.menu_items?.category || 'Other';
            catMap[cat] = (catMap[cat] || 0) + (item.price_at_time * item.quantity);
        }));
        setCategoryData(Object.entries(catMap).map(([name, value]) => ({ name, value })));

        // Top items
        const itemMap = {};
        completedOrders.forEach(o => o.order_items?.forEach(item => {
            const name = item.menu_items?.name || 'Unknown';
            itemMap[name] = (itemMap[name] || 0) + item.quantity;
        }));
        setTopItems(Object.entries(itemMap).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count })));

        // Hourly heatmap (0–23)
        const hourMap = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, '0')}:00`, orders: 0, revenue: 0 }));
        completedOrders.forEach(o => {
            const h = new Date(o.created_at).getHours();
            hourMap[h].orders += 1;
            hourMap[h].revenue += Number(o.total_amount);
        });
        setHourlyData(hourMap.filter(h => h.orders > 0 || (h.hour >= '06:00' && h.hour <= '22:00')));

        // Payment breakdown
        const payMap = {};
        completedOrders.forEach(o => {
            const pm = (o.payment_method || 'CASH').toUpperCase();
            payMap[pm] = (payMap[pm] || 0) + Number(o.total_amount);
        });
        setPaymentData(Object.entries(payMap).map(([name, value]) => ({ name, value })));
    };

    const exportCSV = () => {
        const rows = ordersList.filter(o => o.status === 'completed').map(o => [
            new Date(o.created_at).toLocaleDateString(),
            new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            o.id.slice(0, 8),
            o.total_amount,
            o.payment_method || 'cash',
        ]);
        const csv = [['Date', 'Time', 'Order ID', 'Amount (LKR)', 'Payment'], ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `analytics-${timeRange}.csv`; a.click();
    };

    const revTrend = prevMetrics.revenue > 0 ? ((metrics.revenue - prevMetrics.revenue) / prevMetrics.revenue * 100) : null;

    return (
        <div className="h-[calc(100vh-40px)] flex flex-col gap-6 overflow-y-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface p-6 rounded-3xl border border-border shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/20 rounded-2xl text-primary"><TrendingUp size={24} /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-text">Business Analytics</h1>
                        <p className="text-text-muted text-sm">Real-time performance insights</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => setCompareMode(!compareMode)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${compareMode ? 'bg-secondary text-bg' : 'bg-bg border border-border text-text-muted hover:text-text'}`}
                    >
                        Compare
                    </button>
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-bg border border-border rounded-xl text-text-muted hover:text-text transition-colors text-sm font-bold"
                    >
                        <Download size={14} />
                        CSV
                    </button>
                    <div className="flex bg-bg p-1 rounded-xl border border-border">
                        {['today', 'week', 'month'].map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${timeRange === range ? 'bg-primary text-bg' : 'text-text-muted hover:text-text'}`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { title: 'Total Revenue', value: `LKR ${metrics.revenue.toLocaleString()}`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10', compareVal: prevMetrics.revenue },
                    { title: 'Net Profit', value: `LKR ${metrics.netProfit.toLocaleString()}`, sub: `Margin: ${metrics.revenue > 0 ? ((metrics.netProfit / metrics.revenue) * 100).toFixed(1) : 0}%`, icon: TrendingUp, color: metrics.netProfit >= 0 ? 'text-green-400' : 'text-red-400', bg: metrics.netProfit >= 0 ? 'bg-green-400/10' : 'bg-red-400/10' },
                    { title: 'Total Orders', value: metrics.orders, sub: `Avg: LKR ${metrics.avgOrderValue.toFixed(0)}`, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                    { title: 'Wastage Cost', value: `LKR ${metrics.wastageCost.toLocaleString()}`, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
                    { title: 'Total Expenses', value: `LKR ${metrics.totalExpenses.toLocaleString()}`, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-400/10' },
                ].map((m, i) => (
                    <div key={i} className="bg-surface p-5 rounded-3xl border border-border shadow-sm hover:border-primary/30 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl ${m.bg} ${m.color}`}><m.icon size={20} /></div>
                            {m.sub && <span className="text-xs font-bold text-text-muted bg-bg px-2 py-1 rounded-lg">{m.sub}</span>}
                            {compareMode && m.compareVal !== undefined && revTrend !== null && (
                                <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-lg ${revTrend >= 0 ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                                    {revTrend >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                                    {Math.abs(revTrend).toFixed(0)}%
                                </span>
                            )}
                        </div>
                        <p className="text-text-muted text-xs font-medium mb-1">{m.title}</p>
                        <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-surface p-6 rounded-3xl border border-border shadow-sm">
                    <h3 className="text-lg font-bold text-text mb-6">Revenue Trend</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FFD700" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#FFD700" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="date" stroke="#666" tick={{ fill: '#888', fontSize: 12 }} />
                                <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 12 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                                <Area type="monotone" dataKey="revenue" stroke="#FFD700" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
                    <h3 className="text-lg font-bold text-text mb-6">Sales by Category</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={categoryData} cx="50%" cy="45%" innerRadius={50} outerRadius={85} paddingAngle={5} dataKey="value">
                                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }} formatter={(v) => [`LKR ${Number(v).toLocaleString()}`, '']} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Selling Items */}
                <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
                    <h3 className="text-lg font-bold text-text mb-6">Top Selling Items</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topItems} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                <XAxis type="number" stroke="#666" tick={{ fill: '#888', fontSize: 11 }} />
                                <YAxis dataKey="name" type="category" width={110} stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} />
                                <Tooltip cursor={{ fill: '#333' }} contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }} />
                                <Bar dataKey="count" fill="#4ECDC4" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payment Method Breakdown */}
                <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
                    <h3 className="text-lg font-bold text-text mb-6">Payment Methods</h3>
                    {paymentData.length > 0 ? (
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={5} dataKey="value">
                                        {paymentData.map((entry, i) => (
                                            <Cell key={i} fill={PAYMENT_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }} formatter={(v) => [`LKR ${Number(v).toLocaleString()}`, '']} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-56 flex items-center justify-center text-text-muted">No payment data.</div>
                    )}
                </div>
            </div>

            {/* Hourly Heatmap */}
            <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
                <h3 className="text-lg font-bold text-text mb-6">Busiest Hours (Orders per Hour)</h3>
                <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={hourlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="hour" stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
                            <YAxis yAxisId="left" stroke="#666" tick={{ fill: '#888', fontSize: 11 }} />
                            <YAxis yAxisId="right" orientation="right" stroke="#666" tick={{ fill: '#888', fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }} />
                            <Bar yAxisId="left" dataKey="orders" fill="#FFD700" opacity={0.7} radius={[4, 4, 0, 0]} name="Orders" />
                            <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#00A86B" strokeWidth={2} dot={false} name="Revenue" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Today's Sales Log */}
            {timeRange === 'today' && (
                <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
                    <h3 className="text-lg font-bold text-text mb-6">Today's Sales Log</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-text-muted border-b border-border">
                                    <th className="py-3 font-medium">Time</th>
                                    <th className="py-3 font-medium">Items</th>
                                    <th className="py-3 font-medium">Payment</th>
                                    <th className="py-3 font-medium text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ordersList.length > 0 ? (
                                    ordersList
                                        .filter(o => o.status === 'completed')
                                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                        .map(order => (
                                            <tr key={order.id} className="border-b border-border/50 hover:bg-white/5 transition-colors">
                                                <td className="py-4 text-text-muted">
                                                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        {order.order_items?.map((item, idx) => (
                                                            <span key={idx} className="text-sm text-text">
                                                                {item.quantity}× {item.menu_items?.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    <span className="text-xs font-bold text-text-muted uppercase bg-bg px-2 py-1 rounded-lg">
                                                        {order.payment_method || 'CASH'}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-right font-bold text-primary">
                                                    LKR {Number(order.total_amount).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="py-8 text-center text-text-muted">No sales recorded today yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analytics;
