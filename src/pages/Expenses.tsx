import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Receipt, Plus, Trash2, Download, TrendingDown, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Expense {
    id: string;
    category: string;
    description: string | null;
    amount: number;
    expense_date: string;
    created_by: string;
    created_at: string;
    [key: string]: unknown;
}

const CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Ingredients', 'Equipment', 'Marketing', 'Repairs', 'Other'];
const CAT_COLORS: Record<string, string> = {
    Rent: '#FF6B6B',
    Utilities: '#FFD700',
    Salaries: '#4ECDC4',
    Ingredients: '#45B7D1',
    Equipment: '#A78BFA',
    Marketing: '#F97316',
    Repairs: '#10B981',
    Other: '#6B7280',
};

const Expenses = () => {
    const { user, profile } = useAuthStore();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
    const [form, setForm] = useState({ category: 'Rent', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0] });
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        const start = `${filterMonth}-01`;
        const end = new Date(filterMonth + '-01');
        end.setMonth(end.getMonth() + 1);
        const endStr = end.toISOString().split('T')[0];

        let query = supabase
            .from('expenses')
            .select('*')
            .gte('expense_date', start)
            .lt('expense_date', endStr)
            .order('expense_date', { ascending: false });

        if (filterCategory !== 'All') {
            query = query.eq('category', filterCategory);
        }

        const { data } = await query;
        if (data) setExpenses(data as Expense[]);
        setLoading(false);
    }, [filterMonth, filterCategory]);

    useEffect(() => {
        fetchExpenses();

        const sub = supabase
            .channel('expenses_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchExpenses)
            .subscribe();
        return () => { sub.unsubscribe(); };
    }, [filterMonth, filterCategory, fetchExpenses]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        if (!user) {
            toast.error('You must be logged in');
            return;
        }
        setSubmitting(true);

        try {
            const { error } = await supabase.from('expenses').insert({
                ...form,
                amount: Number(form.amount),
                created_by: user.id,
            });

            if (error) {
                console.error('Insert expense error:', error);
                toast.error(error.message || 'Failed to add expense');
            } else {
                toast.success('Expense added!');
                setForm({ category: 'Rent', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0] });
                setShowForm(false);
                fetchExpenses();
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            toast.error('Something went wrong');
        }
        setSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this expense?')) return;
        setDeletingId(id);
        await supabase.from('expenses').delete().eq('id', id);
        toast.success('Expense deleted');
        setDeletingId(null);
        fetchExpenses();
    };

    const exportCSV = () => {
        const header = ['Date', 'Category', 'Description', 'Amount (LKR)'];
        const rows = expenses.map(e => [e.expense_date, e.category, e.description || '', e.amount]);
        const csv = [header, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses-${filterMonth}.csv`;
        a.click();
    };

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const categoryBreakdown = CATEGORIES
        .map(cat => ({
            name: cat,
            value: expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0)
        }))
        .filter(c => c.value > 0);

    return (
        <div className="max-w-5xl mx-auto">
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-2xl text-red-400">
                        <Receipt size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-text">Expenses</h1>
                        <p className="text-text-muted">Track all business costs and overheads.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl text-text-muted hover:text-text hover:border-primary/50 transition-colors font-medium text-sm"
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 bg-primary text-bg font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
                    >
                        <Plus size={18} />
                        Add Expense
                    </motion.button>
                </div>
            </motion.header>

            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="glass p-6 rounded-3xl border border-primary/20">
                            <h2 className="font-bold text-text text-lg mb-5">New Expense Entry</h2>
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-bold text-text-muted mb-1 block">Category</label>
                                    <select
                                        value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-text-muted mb-1 block">Amount (LKR)</label>
                                    <input
                                        type="number"
                                        value={form.amount}
                                        onChange={e => setForm({ ...form, amount: e.target.value })}
                                        placeholder="0.00"
                                        required
                                        min="1"
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-text-muted mb-1 block">Description (Optional)</label>
                                    <input
                                        type="text"
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        placeholder="e.g. Monthly electricity bill"
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-text-muted mb-1 block">Date</label>
                                    <input
                                        type="date"
                                        value={form.expense_date}
                                        onChange={e => setForm({ ...form, expense_date: e.target.value })}
                                        required
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    />
                                </div>
                                <div className="md:col-span-2 flex gap-3 justify-end">
                                    <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-text-muted hover:text-text rounded-xl transition-colors font-medium">Cancel</button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-6 py-2.5 bg-primary text-bg font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                                    >
                                        {submitting ? 'Saving...' : 'Save Expense'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="glass p-6 rounded-3xl flex flex-col justify-between">
                    <p className="text-text-muted text-sm font-bold uppercase tracking-wider mb-2">Total This Month</p>
                    <div>
                        <p className="text-4xl font-bold text-red-400">LKR {totalExpenses.toLocaleString()}</p>
                        <p className="text-text-muted text-sm mt-2">{expenses.length} entries</p>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-text-muted text-sm">
                        <TrendingDown size={16} />
                        <span>Operational costs for {new Date(filterMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="glass p-6 rounded-3xl lg:col-span-2">
                    <p className="text-text font-bold mb-4">Breakdown by Category</p>
                    {categoryBreakdown.length > 0 ? (
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                                        {categoryBreakdown.map((entry, index) => (
                                            <Cell key={index} fill={CAT_COLORS[entry.name] || '#888'} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}
                                        formatter={(v: number) => [`LKR ${Number(v).toLocaleString()}`, '']}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-text-muted">No data for this month.</div>
                    )}
                </motion.div>
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-2">
                    <Calendar size={16} className="text-text-muted" />
                    <input
                        type="month"
                        value={filterMonth}
                        onChange={e => setFilterMonth(e.target.value)}
                        className="bg-transparent text-text focus:outline-none text-sm"
                    />
                </div>
                <div className="flex bg-surface border border-border rounded-xl p-1">
                    {['All', ...CATEGORIES].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterCategory === cat ? 'bg-primary text-bg' : 'text-text-muted hover:text-text'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h2 className="font-bold text-text">Expense Log</h2>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-text-muted">Loading...</div>
                ) : expenses.length === 0 ? (
                    <div className="p-10 text-center text-text-muted">No expenses found for this period.</div>
                ) : (
                    <div className="divide-y divide-border/50">
                        <AnimatePresence>
                            {expenses.map((exp, i) => (
                                <motion.div
                                    key={exp.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ delay: i * 0.02 }}
                                    className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: CAT_COLORS[exp.category] || '#888' }}
                                        />
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-text">{exp.category}</span>
                                                {exp.description && (
                                                    <span className="text-text-muted text-sm">&mdash; {exp.description}</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-text-muted mt-0.5">
                                                {new Date(exp.expense_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-red-400 text-lg">LKR {Number(exp.amount).toLocaleString()}</span>
                                        {profile?.role === 'admin' && (
                                            <button
                                                onClick={() => handleDelete(exp.id)}
                                                disabled={deletingId === exp.id}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Expenses;
