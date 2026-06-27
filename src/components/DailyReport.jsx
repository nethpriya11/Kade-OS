import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Printer, TrendingUp, ShoppingBag, DollarSign, AlertTriangle, Award, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DailyReport = ({ onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        const now = new Date();
        let start = new Date(now);
        if (now.getHours() < 4) start.setDate(now.getDate() - 1);
        start.setHours(4, 0, 0, 0);

        const [ordersRes, wastageRes, expensesRes] = await Promise.all([
            supabase.from('orders').select('*, order_items(*, menu_items(*))').gte('created_at', start.toISOString()).neq('status', 'cancelled'),
            supabase.from('wastage_logs').select('*').gte('created_at', start.toISOString()),
            supabase.from('expenses').select('*').gte('expense_date', start.toISOString().split('T')[0]),
        ]);

        const orders = ordersRes.data || [];
        const wastage = wastageRes.data || [];
        const expenses = expensesRes.data || [];

        const completedOrders = orders.filter(o => o.status === 'completed');
        const revenue = completedOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
        const totalOrders = completedOrders.length;
        const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
        const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;
        const wastageCost = wastage.reduce((s, w) => s + Number(w.cost_at_time || 0), 0);
        const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
        const taxCollected = completedOrders.reduce((s, o) => s + Number(o.tax_amount || 0), 0);

        let totalCOGS = 0;
        completedOrders.forEach(order => {
            order.order_items?.forEach(item => {
                const itemCost = item.menu_items?.cost || (item.price_at_time * 0.3);
                totalCOGS += itemCost * item.quantity;
            });
        });

        const netProfit = revenue - totalCOGS - wastageCost - totalExpenses - taxCollected;

        const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        // Item sales map
        const itemMap = {};
        orders.forEach(o => o.order_items?.forEach(item => {
            const name = item.menu_items?.name || 'Unknown';
            itemMap[name] = (itemMap[name] || 0) + item.quantity;
        }));
        const topItem = Object.entries(itemMap).sort(([, a], [, b]) => b - a)[0];

        // Payment breakdown
        const payMap = {};
        orders.filter(o => o.status === 'completed').forEach(o => {
            const pm = (o.payment_method || 'cash').toUpperCase();
            payMap[pm] = (payMap[pm] || 0) + Number(o.total_amount || 0);
        });

        // Busiest hour
        const hourMap = {};
        orders.forEach(o => {
            const h = new Date(o.created_at).getHours();
            hourMap[h] = (hourMap[h] || 0) + 1;
        });
        const busiestHour = Object.entries(hourMap).sort(([, a], [, b]) => b - a)[0];

        setData({ revenue, totalCOGS, totalOrders, cancelledOrders, avgOrderValue, wastageCost, totalExpenses, taxCollected, netProfit, profitMargin, topItem, payMap, busiestHour, startTime: start });
        setLoading(false);
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="glass p-8 rounded-3xl text-text-muted">Generating report...</div>
            </div>
        );
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-surface border border-border rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border">
                        <div>
                            <h2 className="text-2xl font-bold text-text">Daily Business Report</h2>
                            <p className="text-text-muted text-sm mt-0.5">
                                {new Date(data.startTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl font-bold text-sm hover:bg-primary/20 transition-colors"
                            >
                                <Printer size={16} />
                                Print
                            </button>
                            <button onClick={onClose} className="p-2 text-text-muted hover:text-text hover:bg-surface-hover rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Total Revenue', value: `LKR ${data.revenue.toLocaleString()}`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
                                { label: 'Net Profit', value: `LKR ${data.netProfit.toLocaleString()}`, icon: TrendingUp, color: data.netProfit >= 0 ? 'text-green-400' : 'text-red-400', bg: data.netProfit >= 0 ? 'bg-green-400/10' : 'bg-red-400/10' },
                                { label: 'Orders', value: data.totalOrders, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                                { label: 'Wastage Cost', value: `LKR ${data.wastageCost.toLocaleString()}`, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
                            ].map(m => (
                                <div key={m.label} className="bg-bg rounded-2xl p-4 border border-border">
                                    <div className={`w-9 h-9 rounded-xl ${m.bg} ${m.color} flex items-center justify-center mb-3`}>
                                        <m.icon size={18} />
                                    </div>
                                    <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1">{m.label}</p>
                                    <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Secondary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-bg rounded-2xl p-4 border border-border">
                                <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2">Avg Order Value</p>
                                <p className="text-xl font-bold text-text">LKR {data.avgOrderValue.toFixed(0)}</p>
                            </div>
                            <div className="bg-bg rounded-2xl p-4 border border-border">
                                <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2">COGS</p>
                                <p className="text-xl font-bold text-red-400">LKR {data.totalCOGS.toLocaleString()}</p>
                            </div>
                            <div className="bg-bg rounded-2xl p-4 border border-border">
                                <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2">Cancelled Orders</p>
                                <p className="text-xl font-bold text-red-400">{data.cancelledOrders}</p>
                            </div>
                            <div className="bg-bg rounded-2xl p-4 border border-border">
                                <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2">Tax Collected</p>
                                <p className="text-xl font-bold text-primary">LKR {data.taxCollected.toLocaleString()}</p>
                            </div>
                            <div className="bg-bg rounded-2xl p-4 border border-border">
                                <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2">Expenses Today</p>
                                <p className="text-xl font-bold text-text">LKR {data.totalExpenses.toLocaleString()}</p>
                            </div>
                            <div className="bg-bg rounded-2xl p-4 border border-border">
                                <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2">Wastage</p>
                                <p className="text-xl font-bold text-red-400">LKR {data.wastageCost.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Highlights */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {data.topItem && (
                                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                                        <Award size={20} />
                                    </div>
                                    <div>
                                        <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Top Seller</p>
                                        <p className="font-bold text-text text-lg">{data.topItem[0]}</p>
                                        <p className="text-text-muted text-sm">{data.topItem[1]} sold</p>
                                    </div>
                                </div>
                            )}
                            {data.busiestHour && (
                                <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-4 flex items-center gap-4">
                                    <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Peak Hour</p>
                                        <p className="font-bold text-text text-lg">
                                            {data.busiestHour[0]}:00 – {Number(data.busiestHour[0]) + 1}:00
                                        </p>
                                        <p className="text-text-muted text-sm">{data.busiestHour[1]} orders</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Payment Breakdown */}
                        {Object.keys(data.payMap).length > 0 && (
                            <div className="bg-bg rounded-2xl p-4 border border-border">
                                <p className="text-text font-bold mb-3">Payment Method Breakdown</p>
                                <div className="flex gap-4 flex-wrap">
                                    {Object.entries(data.payMap).map(([method, amount]) => (
                                        <div key={method} className="flex-1 min-w-[80px]">
                                            <p className="text-text-muted text-xs uppercase tracking-wider font-bold">{method}</p>
                                            <p className="text-text font-bold mt-1">LKR {Number(amount).toLocaleString()}</p>
                                            <p className="text-text-muted text-xs">{data.revenue > 0 ? ((amount / data.revenue) * 100).toFixed(1) : 0}%</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Profit Margin */}
                        <div className="bg-bg rounded-2xl p-4 border border-border">
                            <div className="flex justify-between items-center mb-3">
                                <p className="text-text font-bold">Profit Margin</p>
                                <span className={`text-sm font-bold ${data.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {data.profitMargin.toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-2 bg-surface rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.max(0, Math.min(100, data.profitMargin))}%` }}
                                    className={`h-full rounded-full ${data.netProfit >= 0 ? 'bg-green-400' : 'bg-red-400'}`}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-text-muted mt-2">
                                <span>Revenue: LKR {data.revenue.toLocaleString()}</span>
                                <span>Costs: LKR {(data.totalCOGS + data.wastageCost + data.totalExpenses).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default DailyReport;
