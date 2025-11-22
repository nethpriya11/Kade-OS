import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, FileText, ChevronDown, ChevronUp, Printer, TrendingUp, DollarSign, Award, PieChart as PieChartIcon, BarChart as BarChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const Analytics = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalProfit: 0,
        margin: 0,
        averageOrderValue: 0,
        topItems: [],
        salesTrend: [],
        categoryData: [],
        peakHours: []
    });

    useEffect(() => {
        fetchData();

        const subscription = supabase
            .channel('orders_analytics')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                console.log('Analytics: Order update detected, refreshing data...');
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        // 1. Fetch Orders with Items
        const { data: ordersData } = await supabase
            .from('orders')
            .select(`*, order_items (*, menu_items (id, name, category, price))`)
            .order('created_at', { ascending: false });

        // 2. Fetch Recipes & Ingredients for Costing
        const { data: recipesData } = await supabase
            .from('recipes')
            .select(`*, ingredients (id, purchase_price, yield_percent)`);

        if (ordersData && recipesData) {
            setOrders(ordersData);
            calculateAdvancedStats(ordersData, recipesData);
        }
        setLoading(false);
    };

    const calculateAdvancedStats = (orders, recipes) => {
        // A. Calculate Cost per Menu Item
        const itemCosts = {}; // { menu_item_id: cost }

        // Group recipes by menu_item_id
        const recipeMap = {};
        recipes.forEach(r => {
            if (!recipeMap[r.menu_item_id]) recipeMap[r.menu_item_id] = [];
            recipeMap[r.menu_item_id].push(r);
        });

        // Calculate cost for each item found in orders
        orders.forEach(order => {
            order.order_items.forEach(item => {
                const menuId = item.menu_items?.id;
                if (menuId && itemCosts[menuId] === undefined) {
                    const itemRecipes = recipeMap[menuId] || [];
                    const cost = itemRecipes.reduce((sum, r) => {
                        const yieldDecimal = (r.ingredients.yield_percent || 100) / 100;
                        const realCost = yieldDecimal > 0 ? (r.ingredients.purchase_price / yieldDecimal) : 0;
                        return sum + (realCost * r.quantity_required);
                    }, 0);
                    itemCosts[menuId] = cost;
                }
            });
        });

        // B. Calculate Aggregate Stats
        let totalRev = 0;
        let totalCost = 0;
        const categoryCounts = {};
        const hourCounts = Array(24).fill(0);
        const itemSales = {};
        const dailySales = {}; // { "Oct 24": 2500 }

        orders.forEach(order => {
            totalRev += order.total_amount || 0;

            // Profit & Category Logic
            order.order_items.forEach(item => {
                const menuId = item.menu_items?.id;
                const qty = item.quantity;
                const cost = (itemCosts[menuId] || 0) * qty;
                totalCost += cost;

                // Category
                const cat = item.menu_items?.category || 'Other';
                categoryCounts[cat] = (categoryCounts[cat] || 0) + qty;

                // Top Items
                const name = item.menu_items?.name || 'Unknown';
                itemSales[name] = (itemSales[name] || 0) + qty;
            });

            // Peak Hours
            const date = new Date(order.created_at);
            hourCounts[date.getHours()]++;

            // Sales Trend (Last 7 Days)
            const dayStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dailySales[dayStr] = (dailySales[dayStr] || 0) + order.total_amount;
        });

        const totalProfit = totalRev - totalCost;
        const margin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;

        // C. Format Data for Charts
        const salesTrend = Object.entries(dailySales)
            .slice(0, 7) // Limit to 7 days for cleanliness
            .map(([date, amount]) => ({ date, amount }))
            .reverse(); // Show oldest to newest if fetched desc

        const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

        const peakHours = hourCounts.map((count, hour) => ({
            hour: `${hour}:00`,
            orders: count
        })).filter(h => h.orders > 0); // Only show active hours

        const topItems = Object.entries(itemSales)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        setStats({
            totalRevenue: totalRev,
            totalProfit,
            margin,
            averageOrderValue: orders.length > 0 ? totalRev / orders.length : 0,
            topItems,
            salesTrend,
            categoryData,
            peakHours
        });
    };

    const COLORS = ['#22c55e', '#eab308', '#3b82f6', '#f97316', '#a855f7'];

    const toggleExpand = (id) => {
        setExpandedOrderId(expandedOrderId === id ? null : id);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true
        }).format(date);
    };

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-primary mb-2">Analytics & History</h1>
                <p className="text-text-muted">The brain of your shop. Track performance in real-time.</p>
            </header>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-surface p-6 rounded-3xl border border-border relative overflow-hidden">
                    <div className="text-text-muted text-sm font-bold uppercase tracking-wider mb-1">Total Revenue</div>
                    <div className="text-3xl font-bold text-text">LKR {stats.totalRevenue.toLocaleString()}</div>
                    <div className="absolute top-4 right-4 opacity-20 text-primary"><DollarSign size={40} /></div>
                </div>
                <div className="bg-surface p-6 rounded-3xl border border-border relative overflow-hidden">
                    <div className="text-text-muted text-sm font-bold uppercase tracking-wider mb-1">Gross Profit</div>
                    <div className="text-3xl font-bold text-secondary">LKR {stats.totalProfit.toLocaleString()}</div>
                    <div className="absolute top-4 right-4 opacity-20 text-secondary"><TrendingUp size={40} /></div>
                </div>
                <div className="bg-surface p-6 rounded-3xl border border-border relative overflow-hidden">
                    <div className="text-text-muted text-sm font-bold uppercase tracking-wider mb-1">Net Margin</div>
                    <div className={`text-3xl font-bold ${stats.margin > 40 ? 'text-primary' : 'text-red-400'}`}>
                        {stats.margin.toFixed(1)}%
                    </div>
                    <div className="absolute top-4 right-4 opacity-20 text-text"><PieChartIcon size={40} /></div>
                </div>
                <div className="bg-surface p-6 rounded-3xl border border-border relative overflow-hidden">
                    <div className="text-text-muted text-sm font-bold uppercase tracking-wider mb-1">Avg. Order</div>
                    <div className="text-3xl font-bold text-text">LKR {stats.averageOrderValue.toFixed(0)}</div>
                    <div className="absolute top-4 right-4 opacity-20 text-text"><BarChartIcon size={40} /></div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Sales Trend */}
                <div className="md:col-span-2 bg-surface p-6 rounded-3xl border border-border">
                    <h3 className="text-lg font-bold text-text mb-6">Revenue Trend (Last 7 Days)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.salesTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f4b3f" />
                                <XAxis dataKey="date" stroke="#86efac" tick={{ fill: '#86efac' }} />
                                <YAxis stroke="#86efac" tick={{ fill: '#86efac' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0d231e', borderColor: '#1f4b3f', color: '#f0fdf4' }}
                                    itemStyle={{ color: '#22c55e' }}
                                />
                                <Line type="monotone" dataKey="amount" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="bg-surface p-6 rounded-3xl border border-border">
                    <h3 className="text-lg font-bold text-text mb-6">Sales by Category</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0d231e', borderColor: '#1f4b3f', color: '#f0fdf4' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                            {stats.categoryData.map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-2 text-xs text-text-muted">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    {entry.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Peak Hours */}
                <div className="bg-surface p-6 rounded-3xl border border-border">
                    <h3 className="text-lg font-bold text-text mb-6">Peak Hours</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.peakHours}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f4b3f" vertical={false} />
                                <XAxis dataKey="hour" stroke="#86efac" tick={{ fill: '#86efac' }} />
                                <YAxis stroke="#86efac" tick={{ fill: '#86efac' }} />
                                <Tooltip cursor={{ fill: '#14332c' }} contentStyle={{ backgroundColor: '#0d231e', borderColor: '#1f4b3f', color: '#f0fdf4' }} />
                                <Bar dataKey="orders" fill="#eab308" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Items List */}
                <div className="bg-surface p-6 rounded-3xl border border-border">
                    <h3 className="text-lg font-bold text-text mb-6">Top Selling Items</h3>
                    <div className="space-y-4">
                        {stats.topItems.map((item, index) => (
                            <div key={item.name} className="flex items-center justify-between p-3 bg-bg rounded-xl border border-border">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-secondary text-bg' : 'bg-surface-hover text-text-muted'}`}>
                                        {index + 1}
                                    </div>
                                    <span className="font-medium text-text">{item.name}</span>
                                </div>
                                <span className="text-primary font-bold">{item.count} sold</span>
                            </div>
                        ))}
                        {stats.topItems.length === 0 && <div className="text-text-muted text-center py-10">No sales data yet</div>}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-text">Recent Orders</h2>
                <div className="bg-surface p-2 rounded-xl border border-border flex items-center gap-2 text-sm font-bold text-text-muted">
                    <Clock size={16} />
                    Latest First
                </div>
            </div>

            <div className="space-y-4">
                {orders.map(order => (
                    <div key={order.id} className="bg-surface border border-border rounded-2xl overflow-hidden transition-all">
                        {/* Header Row */}
                        <div
                            onClick={() => toggleExpand(order.id)}
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-surface-hover transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-bg p-3 rounded-xl">
                                    <Clock size={20} className="text-primary" />
                                </div>
                                <div>
                                    <div className="font-bold text-text">Order #{order.id.slice(0, 8)}</div>
                                    <div className="text-xs text-text-muted">{formatDate(order.created_at)}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${order.status === 'completed' ? 'bg-secondary/20 text-secondary' : 'bg-text-muted/20 text-text-muted'
                                    }`}>
                                    {order.status}
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-lg text-text">LKR {order.total_amount}</div>
                                </div>
                                {expandedOrderId === order.id ? <ChevronUp size={20} className="text-text-muted" /> : <ChevronDown size={20} className="text-text-muted" />}
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedOrderId === order.id && (
                            <div className="bg-bg/50 border-t border-border p-4">
                                <div className="mb-4">
                                    <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Items</h4>
                                    <div className="space-y-2">
                                        {order.order_items?.map(item => (
                                            <div key={item.id} className="flex justify-between text-sm">
                                                <span className="text-text">
                                                    <span className="font-bold text-primary">{item.quantity}x</span> {item.menu_items?.name || 'Unknown Item'}
                                                </span>
                                                <span className="text-text-muted">LKR {item.price_at_time * item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-border">
                                    <button className="flex items-center gap-2 text-text-muted hover:text-text transition-colors text-sm font-bold">
                                        <Printer size={16} />
                                        Reprint Receipt
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Analytics;
