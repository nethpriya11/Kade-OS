import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Receipt } from 'lucide-react';
import {
    Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend, ComposedChart, Line
} from 'recharts';

const COLORS = ['#FFD700', '#00A86B', '#FF6B6B', '#4ECDC4', '#45B7D1', '#A78BFA', '#F97316'];

interface PnLBreakdownCardProps {
    label: string;
    value: number;
    color: string;
    subtitle?: string;
}

const PnLBreakdownCard = ({ label, value, color, subtitle }: PnLBreakdownCardProps) => (
    <div className="bg-surface p-5 rounded-3xl border border-border shadow-sm hover:border-primary/30 transition-colors">
        <p className="text-text-muted text-xs font-medium mb-1">{label}</p>
        <p className={`text-xl font-bold ${color}`}>LKR {value.toLocaleString()}</p>
        {subtitle && <p className="text-text-muted text-xs mt-1">{subtitle}</p>}
    </div>
);

interface MenuItem {
    name: string;
    category: string;
    cost: number;
}

interface OrderItem {
    id: string;
    menu_item_id: string;
    quantity: number;
    price_at_time: number;
    menu_items: MenuItem | null;
}

interface Order {
    id: string;
    created_at: string;
    total_amount: number;
    tax_amount: number;
    status: string;
    order_items: OrderItem[] | null;
}

interface WastageLog {
    id: string;
    cost_at_time: number;
}

interface Expense {
    id: string;
    amount: number;
    category: string;
}

interface Ingredient {
    id: string;
    name: string;
    purchase_price: number;
    category: string;
}

interface RecipeIngredient {
    name: string;
    purchase_price: number;
}

interface Recipe {
    id: string;
    menu_item_id: string;
    ingredient_id: string;
    quantity_required: number;
    ingredients: RecipeIngredient;
}

interface Metrics {
    revenue: number;
    cogs: number;
    grossProfit: number;
    totalExpenses: number;
    wastageCost: number;
    taxCollected: number;
    netProfit: number;
    orderCount: number;
}

interface TrendEntry {
    date: string;
    revenue: number;
    cogs: number;
    profit: number;
    [key: string]: unknown;
}

interface CategoryEntry {
    name: string;
    value: number;
    [key: string]: unknown;
}

interface HourlyEntry {
    hour: string;
    revenue: number;
    cogs: number;
    profit: number;
    [key: string]: unknown;
}

const ProfitLoss = () => {
    const [timeRange, setTimeRange] = useState('today');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [metrics, setMetrics] = useState<Metrics>({
        revenue: 0, cogs: 0, grossProfit: 0, totalExpenses: 0,
        wastageCost: 0, taxCollected: 0, netProfit: 0, orderCount: 0
    });
    const [, setRevenueData] = useState<TrendEntry[]>([]);
    const [expenseCategoryData, setExpenseCategoryData] = useState<CategoryEntry[]>([]);
    const [cogsByCategory, setCogsByCategory] = useState<CategoryEntry[]>([]);
    const [profitTrend, setProfitTrend] = useState<TrendEntry[]>([]);
    const [hourlyData, setHourlyData] = useState<HourlyEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const getDateRange = useCallback(() => {
        const now = new Date();
        let startDate = new Date(now);
        if (now.getHours() < 4) startDate.setDate(now.getDate() - 1);
        startDate.setHours(4, 0, 0, 0);

        if (timeRange === 'custom' && customFrom && customTo) {
            const from = new Date(customFrom);
            from.setHours(4, 0, 0, 0);
            const to = new Date(customTo);
            to.setDate(to.getDate() + 1);
            to.setHours(4, 0, 0, 0);
            return { start: from, end: to };
        }

        if (timeRange === 'week') startDate.setDate(startDate.getDate() - 7);
        else if (timeRange === 'month') startDate.setMonth(startDate.getMonth() - 1);
        else if (timeRange === 'quarter') startDate.setMonth(startDate.getMonth() - 3);
        else if (timeRange === 'year') startDate.setFullYear(startDate.getFullYear() - 1);

        return { start: startDate, end: now };
    }, [timeRange, customFrom, customTo]);

    const processPnL = (orders: Order[], wastage: WastageLog[], expenses: Expense[], _ingredients: Ingredient[], recipes: Recipe[]) => {
        const completedOrders = orders.filter(o => o.status === 'completed');
        const totalRevenue = completedOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
        const taxCollected = completedOrders.reduce((s, o) => s + Number(o.tax_amount || 0), 0);
        const orderCount = completedOrders.length;

        const recipeCostMap: Record<string, number> = {};
        recipes.forEach(r => {
            const cost = Number(r.ingredients?.purchase_price || 0);
            const qty = Number(r.quantity_required || 0);
            recipeCostMap[r.menu_item_id] = (recipeCostMap[r.menu_item_id] || 0) + (cost * qty);
        });

        let totalCOGS = 0;
        const cogsCatMap: Record<string, number> = {};
        completedOrders.forEach(order => {
            order.order_items?.forEach(item => {
                const qty = item.quantity || 1;
                const itemCost = recipeCostMap[item.menu_item_id] !== undefined
                    ? recipeCostMap[item.menu_item_id]
                    : Number(item.menu_items?.cost || 0) || (Number(item.price_at_time || 0) * 0.3);
                totalCOGS += itemCost * qty;

                const cat = item.menu_items?.category || 'Other';
                cogsCatMap[cat] = (cogsCatMap[cat] || 0) + (itemCost * qty);
            });
        });

        const totalWastage = wastage.reduce((s, w) => s + Number(w.cost_at_time || 0), 0);
        const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
        const grossProfit = totalRevenue - totalCOGS;
        const netProfit = grossProfit - totalExpenses - totalWastage - taxCollected;

        setMetrics({
            revenue: totalRevenue, cogs: totalCOGS, grossProfit,
            totalExpenses, wastageCost: totalWastage,
            taxCollected, netProfit, orderCount
        });

        const trendMap: Record<string, TrendEntry> = {};
        completedOrders.forEach(order => {
            const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!trendMap[date]) trendMap[date] = { date, revenue: 0, cogs: 0, profit: 0 };
            trendMap[date].revenue += Number(order.total_amount || 0);
            order.order_items?.forEach(item => {
                const qty = item.quantity || 1;
                const itemCost = recipeCostMap[item.menu_item_id] !== undefined
                    ? recipeCostMap[item.menu_item_id]
                    : Number(item.menu_items?.cost || 0) || (Number(item.price_at_time || 0) * 0.3);
                trendMap[date].cogs += itemCost * qty;
            });
        });
        Object.values(trendMap).forEach(d => { d.profit = d.revenue - d.cogs; });
        setRevenueData(Object.values(trendMap));
        setProfitTrend(Object.values(trendMap));

        const expCatMap: Record<string, number> = {};
        expenses.forEach(e => {
            const cat = e.category || 'Other';
            expCatMap[cat] = (expCatMap[cat] || 0) + Number(e.amount || 0);
        });
        setExpenseCategoryData(Object.entries(expCatMap).map(([name, value]) => ({ name, value })));

        setCogsByCategory(Object.entries(cogsCatMap).map(([name, value]) => ({ name, value })));

        const hourMap: HourlyEntry[] = Array.from({ length: 24 }, (_, h) => ({
            hour: `${String(h).padStart(2, '00')}:00`, revenue: 0, cogs: 0, profit: 0
        }));
        completedOrders.forEach(o => {
            const h = new Date(o.created_at).getHours();
            hourMap[h].revenue += Number(o.total_amount || 0);
            o.order_items?.forEach(item => {
                const qty = item.quantity || 1;
                const itemCost = recipeCostMap[item.menu_item_id] !== undefined
                    ? recipeCostMap[item.menu_item_id]
                    : Number(item.menu_items?.cost || 0) || (Number(item.price_at_time || 0) * 0.3);
                hourMap[h].cogs += itemCost * qty;
            });
        });
        hourMap.forEach(h => { h.profit = h.revenue - h.cogs; });
        setHourlyData(hourMap.filter(h => h.revenue > 0 || (h.hour >= '06:00' && h.hour <= '22:00')));
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { start, end } = getDateRange();

        const [ordersRes, wastageRes, expensesRes, ingredientsRes, recipesRes] = await Promise.all([
            supabase.from('orders').select('*, order_items(*, menu_items(*))').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
            supabase.from('wastage_logs').select('*, ingredients(name)').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
            supabase.from('expenses').select('*').gte('expense_date', start.toISOString().split('T')[0]).lte('expense_date', end.toISOString().split('T')[0]),
            supabase.from('ingredients').select('id, name, purchase_price, category'),
            supabase.from('recipes').select('*, ingredients(name, purchase_price)'),
        ]);

        const orders = (ordersRes.data as Order[]) || [];
        const wastage = (wastageRes.data as WastageLog[]) || [];
        const expenses = (expensesRes.data as Expense[]) || [];
        const ingredients = (ingredientsRes.data as Ingredient[]) || [];
        const recipes = (recipesRes.data as Recipe[]) || [];

        processPnL(orders, wastage, expenses, ingredients, recipes);
        setLoading(false);
    }, [getDateRange]);

    useEffect(() => {
        fetchData();
        const sub = supabase
            .channel('pnl_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'wastage_logs' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchData)
            .subscribe();
        return () => { sub.unsubscribe(); };
    }, [timeRange, customFrom, customTo, fetchData]);

    const exportCSV = () => {
        const rows = [
            ['Metric', 'Value (LKR)'],
            ['Revenue', metrics.revenue],
            ['COGS', metrics.cogs],
            ['Gross Profit', metrics.grossProfit],
            ['Expenses', metrics.totalExpenses],
            ['Wastage', metrics.wastageCost],
            ['Tax Collected', metrics.taxCollected],
            ['Net Profit', metrics.netProfit],
            ['Order Count', metrics.orderCount],
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `pnl-${timeRange}.csv`; a.click();
    };

    const profitMargin = metrics.revenue > 0 ? (metrics.netProfit / metrics.revenue) * 100 : 0;
    const grossMargin = metrics.revenue > 0 ? (metrics.grossProfit / metrics.revenue) * 100 : 0;

    return (
        <div className="h-[calc(100vh-40px)] flex flex-col gap-6 overflow-y-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface p-6 rounded-3xl border border-border shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/20 rounded-2xl text-primary"><Receipt size={24} /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-text">Profit & Loss</h1>
                        <p className="text-text-muted text-sm">Revenue, costs, and profitability analysis</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-bg border border-border rounded-xl text-text-muted hover:text-text transition-colors text-sm font-bold">
                        <Download size={14} /> CSV
                    </button>
                    <div className="flex bg-bg p-1 rounded-xl border border-border">
                        {['today', 'week', 'month', 'quarter', 'year', 'custom'].map(range => (
                            <button key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${timeRange === range ? 'bg-primary text-bg' : 'text-text-muted hover:text-text'}`}>
                                {range === 'quarter' ? 'Quarter' : range === 'custom' ? 'Custom' : range}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Custom date range */}
            {timeRange === 'custom' && (
                <div className="flex gap-3 items-center bg-surface p-4 rounded-2xl border border-border">
                    <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                        className="bg-bg border border-border rounded-xl px-3 py-2 text-text text-sm focus:border-primary focus:outline-none" />
                    <span className="text-text-muted">to</span>
                    <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                        className="bg-bg border border-border rounded-xl px-3 py-2 text-text text-sm focus:border-primary focus:outline-none" />
                </div>
            )}

            {loading ? (
                <div className="flex-1 flex items-center justify-center text-text-muted">Loading P&L data...</div>
            ) : (
                <>
                    {/* P&L Waterfall Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                        <PnLBreakdownCard label="Revenue" value={metrics.revenue} color="text-primary" />
                        <PnLBreakdownCard label="COGS" value={metrics.cogs} color="text-red-400" subtitle={`${metrics.revenue > 0 ? ((metrics.cogs / metrics.revenue) * 100).toFixed(1) : 0}% of revenue`} />
                        <PnLBreakdownCard label="Gross Profit" value={metrics.grossProfit} color={metrics.grossProfit >= 0 ? 'text-green-400' : 'text-red-400'} subtitle={`Margin: ${grossMargin.toFixed(1)}%`} />
                        <PnLBreakdownCard label="Expenses" value={metrics.totalExpenses} color="text-orange-400" />
                        <PnLBreakdownCard label="Wastage" value={metrics.wastageCost} color="text-red-400" />
                        <PnLBreakdownCard label="Tax" value={metrics.taxCollected} color="text-text-muted" />
                        <PnLBreakdownCard label="Net Profit" value={metrics.netProfit} color={metrics.netProfit >= 0 ? 'text-green-400' : 'text-red-400'} subtitle={`Margin: ${profitMargin.toFixed(1)}%`} />
                        <PnLBreakdownCard label="Orders" value={metrics.orderCount} color="text-blue-400" subtitle="Completed" />
                    </div>

                    {/* Charts Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Revenue vs COGS vs Profit Trend */}
                        <div className="lg:col-span-2 bg-surface p-6 rounded-3xl border border-border shadow-sm">
                            <h3 className="text-lg font-bold text-text mb-6">Revenue & Profit Trend</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={profitTrend}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#FFD700" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#FFD700" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00A86B" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#00A86B" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis dataKey="date" stroke="#666" tick={{ fill: '#888', fontSize: 12 }} />
                                        <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 12 }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }} />
                                        <Area type="monotone" dataKey="revenue" stroke="#FFD700" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} name="Revenue" />
                                        <Bar dataKey="cogs" fill="#FF6B6B" opacity={0.6} radius={[4, 4, 0, 0]} name="COGS" />
                                        <Line type="monotone" dataKey="profit" stroke="#00A86B" strokeWidth={2} dot={false} name="Profit" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Expense Breakdown */}
                        <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
                            <h3 className="text-lg font-bold text-text mb-6">Expense Breakdown</h3>
                            {expenseCategoryData.length > 0 ? (
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={expenseCategoryData} cx="50%" cy="45%" innerRadius={50} outerRadius={85} paddingAngle={5} dataKey="value">
                                                {expenseCategoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }} formatter={(v: number) => [`LKR ${Number(v).toLocaleString()}`, '']} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-72 flex items-center justify-center text-text-muted">No expenses in this period.</div>
                            )}
                        </div>
                    </div>

                    {/* Charts Row 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* COGS by Category */}
                        <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
                            <h3 className="text-lg font-bold text-text mb-6">COGS by Category</h3>
                            {cogsByCategory.length > 0 ? (
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={cogsByCategory} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                            <XAxis type="number" stroke="#666" tick={{ fill: '#888', fontSize: 11 }} />
                                            <YAxis dataKey="name" type="category" width={90} stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} />
                                            <Tooltip cursor={{ fill: '#333' }} contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }} formatter={(v: number) => [`LKR ${Number(v).toLocaleString()}`, '']} />
                                            <Bar dataKey="value" fill="#FF6B6B" radius={[0, 6, 6, 0]} name="COGS" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-56 flex items-center justify-center text-text-muted">No COGS data in this period.</div>
                            )}
                        </div>

                        {/* Hourly Profit Heatmap */}
                        <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm">
                            <h3 className="text-lg font-bold text-text mb-6">Hourly Profit (per hour)</h3>
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={hourlyData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis dataKey="hour" stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
                                        <YAxis yAxisId="left" stroke="#666" tick={{ fill: '#888', fontSize: 11 }} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#666" tick={{ fill: '#888', fontSize: 11 }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }} />
                                        <Bar yAxisId="left" dataKey="profit" fill="#00A86B" opacity={0.7} radius={[4, 4, 0, 0]} name="Profit" />
                                        <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#FFD700" strokeWidth={2} dot={false} name="Revenue" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ProfitLoss;

