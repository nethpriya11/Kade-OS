import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { ShoppingBag, CheckCircle, AlertCircle, Truck, RotateCcw, Download, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
    needed: { label: 'Needed', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
    ordered: { label: 'Ordered', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
    received: { label: 'Received', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' },
};

const Procurement = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('needed'); // 'needed' | 'ordered' | 'received' | 'all'
    const [procurementStatus, setProcurementStatus] = useState({}); // { ingredientId: 'needed' | 'ordered' | 'received' }
    const [notes, setNotes] = useState({}); // { ingredientId: 'supplier note' }
    const [editingNote, setEditingNote] = useState(null);
    const [tempNote, setTempNote] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [restockLogs, setRestockLogs] = useState([]);
    const [supplierPrices, setSupplierPrices] = useState({}); // { ingredientId: [{supplier_name, price, min_order_qty}] }

    const PROC_KEY = 'kade_procurement_status';
    const NOTES_KEY = 'kade_procurement_notes';

    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem(PROC_KEY) || '{}');
        const savedNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}');
        setProcurementStatus(saved);
        setNotes(savedNotes);
        fetchItems();
        fetchHistory();
        fetchSupplierPrices();
    }, []);

    const fetchSupplierPrices = async () => {
        const { data } = await supabase
            .from('supplier_prices')
            .select('*, suppliers(name)');
        if (data) {
            const map = {};
            data.forEach(sp => {
                if (!map[sp.ingredient_id]) map[sp.ingredient_id] = [];
                map[sp.ingredient_id].push(sp);
            });
            setSupplierPrices(map);
        }
    };

    const fetchItems = async () => {
        const { data } = await supabase
            .from('ingredients')
            .select('*')
            .order('current_stock', { ascending: true });
        if (data) setItems(data);
        setLoading(false);
    };

    const fetchHistory = async () => {
        const { data } = await supabase
            .from('restock_logs')
            .select('*, ingredients(name, unit)')
            .order('created_at', { ascending: false })
            .limit(20);
        if (data) setRestockLogs(data);
    };

    const updateStatus = (id, status) => {
        const updated = { ...procurementStatus, [id]: status };
        setProcurementStatus(updated);
        localStorage.setItem(PROC_KEY, JSON.stringify(updated));

        if (status === 'received') {
            toast.success('Marked as received! Update stock in Inventory.');
        }
    };

    const saveNote = (id) => {
        const updated = { ...notes, [id]: tempNote };
        setNotes(updated);
        localStorage.setItem(NOTES_KEY, JSON.stringify(updated));
        setEditingNote(null);
    };

    const toBuyAmount = (item) => Math.max(0, (item.low_stock_threshold || 20) - item.current_stock);

    const exportList = () => {
        const displayItems = items.filter(item => {
            const status = procurementStatus[item.id] || 'needed';
            return filter === 'all' || status === filter;
        });

        const text = displayItems.map(item => {
            const toBuy = toBuyAmount(item);
            const status = procurementStatus[item.id] || 'needed';
            const note = notes[item.id] || '';
            return `• ${item.name} — Buy: ${toBuy} ${item.unit} (Stock: ${item.current_stock}) [${status.toUpperCase()}]${note ? ` | Note: ${note}` : ''}`;
        }).join('\n');

        const date = new Date().toLocaleDateString();
        const fullText = `Kadé Procurement List – ${date}\n${'='.repeat(40)}\n${text}`;

        const blob = new Blob([fullText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `procurement-${date.replace(/\//g, '-')}.txt`;
        a.click();
    };

    const getStatus = (id) => procurementStatus[id] || 'needed';

    const displayItems = items.filter(item => {
        const status = getStatus(item.id);
        return filter === 'all' || status === filter;
    });

    const counts = {
        all: items.length,
        needed: items.filter(i => getStatus(i.id) === 'needed').length,
        ordered: items.filter(i => getStatus(i.id) === 'ordered').length,
        received: items.filter(i => getStatus(i.id) === 'received').length,
    };

    return (
        <div className="max-w-4xl mx-auto">
            <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-secondary/10 rounded-2xl text-secondary">
                        <ShoppingBag size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-text">Procurement</h1>
                        <p className="text-text-muted">Shopping list based on low-stock ingredients.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl text-text-muted hover:text-text transition-colors font-medium text-sm"
                    >
                        <RotateCcw size={15} />
                        History
                    </button>
                    <button
                        onClick={exportList}
                        className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl text-text-muted hover:text-text transition-colors font-medium text-sm"
                    >
                        <Download size={15} />
                        Export List
                    </button>
                </div>
            </motion.header>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                {Object.entries({ needed: 'Needed', ordered: 'Ordered', received: 'Received', all: 'All' }).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${filter === key ? 'bg-primary text-bg' : 'bg-surface border border-border text-text-muted hover:text-text'}`}
                    >
                        {label}
                        <span className={`px-2 py-0.5 rounded-lg text-xs ${filter === key ? 'bg-bg/20 text-bg' : 'bg-bg text-text-muted'}`}>
                            {counts[key]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Restock History Panel */}
            {showHistory && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass p-6 rounded-3xl mb-6 overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-text">Recent Restock History</h3>
                        <button onClick={() => setShowHistory(false)} className="p-1 text-text-muted hover:text-text"><X size={16} /></button>
                    </div>
                    {restockLogs.length === 0 ? (
                        <p className="text-text-muted text-center py-4">No restock history yet.</p>
                    ) : restockLogs.map(log => (
                        <div key={log.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                            <div>
                                <p className="font-bold text-text">{log.ingredients?.name}</p>
                                <p className="text-text-muted text-sm">+{log.quantity_added} {log.ingredients?.unit} · {new Date(log.created_at).toLocaleDateString()}</p>
                            </div>
                            <span className="text-text-muted text-sm font-bold">
                                {log.total_cost ? `LKR ${Number(log.total_cost).toLocaleString()}` : '—'}
                            </span>
                        </div>
                    ))}
                </motion.div>
            )}

            <div className="glass p-6 rounded-3xl">
                {loading ? (
                    <div className="text-center py-10 text-text-muted">Loading...</div>
                ) : items.length === 0 ? (
                    <div className="text-center py-10 flex flex-col items-center gap-4">
                        <CheckCircle size={48} className="text-green-500/50" />
                        <p className="text-text-muted">Everything is well stocked!</p>
                    </div>
                ) : displayItems.length === 0 ? (
                    <div className="text-center py-10 text-text-muted">No items in "{filter}" status.</div>
                ) : (
                    <div className="space-y-3">
                        {displayItems.map((item, index) => {
                            const status = getStatus(item.id);
                            const cfg = STATUS_CONFIG[status];
                            const toBuy = toBuyAmount(item);

                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.04 }}
                                    className={`bg-surface rounded-2xl border ${cfg.border} overflow-hidden`}
                                >
                                    <div className="flex items-start justify-between p-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="font-bold text-text text-lg">{item.name}</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${cfg.bg} ${cfg.color}`}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            <p className="text-sm text-text-muted mb-2">
                                                Stock: <span className="text-red-400 font-bold">{item.current_stock} {item.unit}</span>
                                                {item.purchase_price > 0 && (
                                                    <span className="ml-3">Est. cost: <span className="text-text font-semibold">LKR {(toBuy * item.purchase_price).toLocaleString()}</span></span>
                                                )}
                                                <span className="ml-3 text-xs text-text-muted">Threshold: {item.low_stock_threshold || 20} {item.unit}</span>
                                                {supplierPrices[item.id] && supplierPrices[item.id].length > 0 && (
                                                    <div className="mt-1 text-xs text-text-muted">
                                                        <span className="text-primary font-bold">Best: </span>
                                                        {supplierPrices[item.id].sort((a, b) => a.price - b.price)[0]?.suppliers?.name}
                                                        {' @ LKR '}
                                                        {Math.min(...supplierPrices[item.id].map(p => p.price)).toFixed(2)}
                                                    </div>
                                                )}
                                            </p>
                                            {/* Supplier Note */}
                                            {editingNote === item.id ? (
                                                <div className="flex gap-2 mt-2">
                                                    <input
                                                        type="text"
                                                        value={tempNote}
                                                        onChange={e => setTempNote(e.target.value)}
                                                        placeholder="Supplier / note..."
                                                        className="flex-1 bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => saveNote(item.id)} className="px-3 py-1.5 bg-primary text-bg rounded-lg text-sm font-bold">Save</button>
                                                    <button onClick={() => setEditingNote(null)} className="px-3 py-1.5 bg-surface-hover text-text-muted rounded-lg text-sm">✕</button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => { setEditingNote(item.id); setTempNote(notes[item.id] || ''); }}
                                                    className="text-xs text-text-muted hover:text-primary transition-colors"
                                                >
                                                    {notes[item.id] ? `📝 ${notes[item.id]}` : '+ Add supplier note'}
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2 ml-4">
                                            <div className="text-right">
                                                <div className="text-xs text-text-muted uppercase tracking-wider">To Buy</div>
                                                <div className="font-bold text-secondary text-xl">{toBuy} <span className="text-sm font-normal text-text-muted">{item.unit}</span></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Actions */}
                                    <div className="flex border-t border-border/50">
                                        {['needed', 'ordered', 'received'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => updateStatus(item.id, s)}
                                                className={`flex-1 py-2.5 text-xs font-bold capitalize transition-colors ${status === s ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color}` : 'text-text-muted hover:text-text hover:bg-surface-hover'}`}
                                            >
                                                {s === 'needed' && '⚠ Needed'}
                                                {s === 'ordered' && '🚛 Ordered'}
                                                {s === 'received' && '✓ Received'}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Procurement;
