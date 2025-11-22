import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, DollarSign, ShoppingBag, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

const Analytics = () => {
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('week'); // 'today', 'week', 'month'
    const [metrics, setMetrics] = useState({
        revenue: 0,
        orders: 0,
        avgOrderValue: 0,
        wastageCost: 0,
        netProfit: 0
    });
    const [revenueData, setRevenueData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);
    const [topItems, setTopItems] = useState([]);

    useEffect(() => {
        fetchAnalytics();

        const subscription = supabase
            .channel('analytics_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchAnalytics)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'wastage_logs' }, fetchAnalytics)
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [timeRange]);

    const fetchAnalytics = async () => {
        setLoading(true);

        // Calculate date range
        const now = new Date();
        let startDate = new Date();
        if (timeRange === 'today') startDate.setHours(0, 0, 0, 0);
        if (timeRange === 'week') startDate.setDate(now.getDate() - 7);
        if (timeRange === 'month') startDate.setMonth(now.getMonth() - 1);

        // Fetch Orders
        const { data: orders } = await supabase
            .from('orders')
            .select('*, order_items(*, menu_items(*))')
            .gte('created_at', startDate.toISOString())
            .neq('status', 'cancelled');

        // Fetch Wastage
        const { data: wastage } = await supabase
            .from('wastage_logs')
            .select('*')
            .gte('created_at', startDate.toISOString());

        if (orders && wastage) {
            processAnalytics(orders, wastage);
        }
        setLoading(false);
    };

    const processAnalytics = (orders, wastage) => {
        // 1. Key Metrics
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        const totalOrders = orders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const totalWastage = wastage.reduce((sum, log) => sum + (log.cost_at_time || 0), 0);

        // Estimated Cost of Goods (assuming 30% food cost for simplicity if not tracked perfectly yet)
        // In a real scenario, we'd sum up ingredient costs from recipes. 
        // For now, let's use a rough estimate or if we have cost in menu_items, use that.
        let totalCostOfGoods = 0;
        orders.forEach(order => {
            order.order_items.forEach(item => {
                // If we had cost in menu_items, we'd use it. 
                // item.menu_items.cost would be ideal.
                // Fallback to 30% of price if cost is missing.
                const itemCost = item.menu_items?.cost || (item.price_at_time * 0.3);
                totalCostOfGoods += itemCost * item.quantity;
            });
        });

        const netProfit = totalRevenue - totalCostOfGoods - totalWastage;

        setMetrics({
            revenue: totalRevenue,
            orders: totalOrders,
            avgOrderValue,
            wastageCost: totalWastage,
            netProfit
        });

        // 2. Revenue Trend (Group by Day)
        const trendMap = {};
        orders.forEach(order => {
            const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            trendMap[date] = (trendMap[date] || 0) + order.total_amount;
        });
        const trendData = Object.keys(trendMap).map(date => ({ date, revenue: trendMap[date] }));
        setRevenueData(trendData);

        // 3. Category Sales
        const categoryMap = {};
        orders.forEach(order => {
            order.order_items.forEach(item => {
                const cat = item.menu_items?.category || 'Other';
                categoryMap[cat] = (categoryMap[cat] || 0) + (item.price_at_time * item.quantity);
            });
        });
        const catData = Object.keys(categoryMap).map(name => ({ name, value: categoryMap[name] }));
        setCategoryData(catData);

        // 4. Top Items
        const itemMap = {};
        orders.forEach(order => {
            order.order_items.forEach(item => {
                const name = item.menu_items?.name || 'Unknown';
                itemMap[name] = (itemMap[name] || 0) + item.quantity;
            });
        });
        const topData = Object.entries(itemMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
        setTopItems(topData);
    };

    const COLORS = ['#FFD700', '#00A86B', '#FF6B6B', '#4ECDC4', '#45B7D1'];

    return (
        <div className="h-[calc(100vh-40px)] flex flex-col gap-6 overflow-y-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-surface p-6 rounded-3xl border border-border shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/20 rounded-2xl text-primary">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text">Business Analytics</h1>
                        <p className="text-text-muted text-sm">Real-time performance insights</p>
                    </div>
                </div>
                <div className="flex bg-bg p-1 rounded-xl border border-border">
                    {['today', 'week', 'month'].map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${timeRange === range ? 'bg-primary text-bg' : 'text-text-muted hover:text-text'
                                }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Revenue"
                    value={`LKR ${metrics.revenue.toLocaleString()}`}
                    icon={DollarSign}
                    color="text-primary"
                    bg="bg-primary/10"
                />
                <MetricCard
                    title="Net Profit"
                    value={`LKR ${metrics.netProfit.toLocaleString()}`}
                    sub={`Margin: ${metrics.revenue > 0 ? ((metrics.netProfit / metrics.revenue) * 100).toFixed(1) : 0}%`}
                    icon={TrendingUp}
                    color="text-green-400"
                    bg="bg-green-400/10"
                />
                <MetricCard
                    title="Total Orders"
                    value={metrics.orders}
                    sub={`Avg: LKR ${metrics.avgOrderValue.toFixed(0)}`}
                    icon={ShoppingBag}
                    color="text-blue-400"
                    bg="bg-blue-400/10"
                />
                <MetricCard
                    title="Wastage Cost"
                    value={`LKR ${metrics.wastageCost.toLocaleString()}`}
                    icon={AlertTriangle}
                    color="text-red-400"
                    bg="bg-red-400/10"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Trend */}
                <div className="lg:col-span-2 bg-surface p-6 rounded-3xl border border-border shadow-sm">
                    <h3 className="text-lg font-bold text-text mb-6">Revenue Trend</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FFD700" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#FFD700" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="date" stroke="#666" tick={{ fill: '#888' }} />
                                <YAxis stroke="#666" tick={{ fill: '#888' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#FFD700" fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sales by Category */}
                <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
                    <h3 className="text-lg font-bold text-text mb-6">Sales by Category</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
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
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topItems} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                <XAxis type="number" stroke="#666" />
                                <YAxis dataKey="name" type="category" width={100} stroke="#888" />
                                <Tooltip
                                    cursor={{ fill: '#333' }}
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}
                                />
                                <Bar dataKey="count" fill="#4ECDC4" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, sub, icon: Icon, color, bg }) => (
    <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm hover:border-primary/30 transition-colors">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${bg} ${color}`}>
                <Icon size={24} />
            </div>
            {sub && <span className="text-xs font-bold text-text-muted bg-bg px-2 py-1 rounded-lg">{sub}</span>}
        </div>
        <h3 className="text-text-muted text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl font-bold text-text">{value}</p>
    </div>
);

export default Analytics;
