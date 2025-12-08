import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { predictCategory } from '../lib/gemini';
import { useInventoryStore } from '../store/inventoryStore';
import { Package, AlertTriangle, Save, Plus, Search, X, Check, Edit2, Trash2, MinusCircle, Sparkles, History } from 'lucide-react';

const DEFAULT_CATEGORIES = ['Produce', 'Meat', 'Spices', 'Dairy', 'Dry Goods', 'Bakery', 'Other'];

const Inventory = () => {
    // Global Store
    const { ingredients, logs: historyLogs, loading } = useInventoryStore();

    const [editingId, setEditingId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [editValues, setEditValues] = useState({ stock: '', price: '', yield: '', threshold: '', category: '' });
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newIngredient, setNewIngredient] = useState({
        name: '',
        unit: 'kg',
        category: 'Produce',
        current_stock: 0,
        low_stock_threshold: 5,
        purchase_price: 0,
        yield_percent: 100
    });

    // Wastage State
    const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
    const [isWastageSubmitting, setIsWastageSubmitting] = useState(false);
    const [selectedForWastage, setSelectedForWastage] = useState(null);
    const [wastageData, setWastageData] = useState({ quantity: '', reason: '' });

    // Restock State
    const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
    const [isRestocking, setIsRestocking] = useState(false);
    const [selectedForRestock, setSelectedForRestock] = useState(null);
    const [restockData, setRestockData] = useState({ quantity: '', price: '', totalCost: '' });

    // AI Prediction State
    const [isPredicting, setIsPredicting] = useState(false);

    // History State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Derived Categories
    const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...ingredients.map(i => i.category || 'Other')]));

    // Auto-Categorization Effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (newIngredient.name.length > 2 && isCreating) {
                setIsPredicting(true);
                const predicted = await predictCategory(newIngredient.name, allCategories);
                if (predicted) {
                    setNewIngredient(prev => ({ ...prev, category: predicted }));
                }
                setIsPredicting(false);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [newIngredient.name, isCreating]);

    // NOTE: Real-time updates are now handled by RealtimeManager in App.jsx
    // We don't need local subscriptions or fetch calls here anymore.

    const startEditing = (item) => {
        setEditingId(item.id);
        setEditValues({
            stock: item.current_stock,
            price: item.purchase_price || 0,
            yield: item.yield_percent || 100,
            threshold: item.low_stock_threshold || 5,
            category: item.category || 'Other'
        });
    };

    const handleSave = async (id) => {
        setIsSaving(true);
        try {
            // Create a promise that rejects after 10 seconds
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out. Please check your connection.')), 10000)
            );

            const { error } = await Promise.race([
                supabase
                    .from('ingredients')
                    .update({
                        current_stock: editValues.stock,
                        purchase_price: editValues.price,
                        yield_percent: editValues.yield,
                        low_stock_threshold: editValues.threshold,
                        category: editValues.category
                    })
                    .eq('id', id),
                timeoutPromise
            ]);

            if (error) throw error;

            // Optimistic Update
            useInventoryStore.getState().updateIngredient(id, {
                current_stock: editValues.stock,
                purchase_price: editValues.price,
                yield_percent: editValues.yield,
                low_stock_threshold: editValues.threshold,
                category: editValues.category
            });

            setEditingId(null);
        } catch (error) {
            console.error('Error updating ingredient:', error);
            alert(`Failed to update ingredient: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreate = async () => {
        if (!newIngredient.name) return;
        setIsSubmitting(true);

        try {
            // Create a promise that rejects after 10 seconds
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out. Please check your connection.')), 10000)
            );

            // Race the Supabase request against the timeout
            const { data, error } = await Promise.race([
                supabase
                    .from('ingredients')
                    .insert([newIngredient])
                    .select()
                    .single(),
                timeoutPromise
            ]);

            if (error) throw error;

            // Optimistic Update (Store handles duplicates)
            useInventoryStore.getState().addIngredient(data);

            setIsCreating(false);
            setNewIngredient({
                name: '',
                unit: 'kg',
                category: 'Produce',
                current_stock: 0,
                low_stock_threshold: 5,
                purchase_price: 0,
                yield_percent: 100
            });
        } catch (error) {
            console.error('Error creating ingredient:', error);
            alert(`Failed to create ingredient: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openWastageModal = (item) => {
        setSelectedForWastage(item);
        setWastageData({ quantity: '', reason: '' });
        setIsWastageModalOpen(true);
    };

    const handleReportWastage = async () => {
        if (!selectedForWastage || !wastageData.quantity) return;
        setIsWastageSubmitting(true);

        const quantity = parseFloat(wastageData.quantity);
        const costAtTime = (selectedForWastage.purchase_price / (selectedForWastage.yield_percent / 100)) * quantity;

        try {
            // Create a promise that rejects after 10 seconds
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out. Please check your connection.')), 10000)
            );

            // 1. Log Wastage
            const { error: logError } = await Promise.race([
                supabase
                    .from('wastage_logs')
                    .insert([{
                        ingredient_id: selectedForWastage.id,
                        quantity: quantity,
                        reason: wastageData.reason,
                        cost_at_time: costAtTime
                    }]),
                timeoutPromise
            ]);

            if (logError) throw logError;

            // 2. Deduct Stock
            const { error: updateError } = await supabase
                .from('ingredients')
                .update({ current_stock: selectedForWastage.current_stock - quantity })
                .eq('id', selectedForWastage.id);

            if (updateError) throw updateError;

            // Optimistic Update
            useInventoryStore.getState().updateIngredient(selectedForWastage.id, {
                current_stock: selectedForWastage.current_stock - quantity
            });

            setIsWastageModalOpen(false);
        } catch (error) {
            console.error('Error reporting wastage:', error);
            alert(`Failed to report wastage: ${error.message}`);
        } finally {
            setIsWastageSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this ingredient? This action cannot be undone.')) {
            try {
                // Create a promise that rejects after 10 seconds
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timed out. Please check your connection.')), 10000)
                );

                const { error } = await Promise.race([
                    supabase
                        .from('ingredients')
                        .delete()
                        .eq('id', id),
                    timeoutPromise
                ]);

                if (error) throw error;

                // Optimistic Update
                useInventoryStore.getState().deleteIngredient(id);
            } catch (error) {
                console.error('Error deleting ingredient:', error);
                alert(`Failed to delete ingredient: ${error.message}`);
            }
        }
    };

    const openRestockModal = (item) => {
        setSelectedForRestock(item);
        setRestockData({ quantity: '', price: item.purchase_price || '', totalCost: '' });
        setIsRestockModalOpen(true);
    };

    const handleRestockChange = (field, value) => {
        let newData = { ...restockData, [field]: value };

        if (field === 'quantity') {
            const qty = parseFloat(value);
            const price = parseFloat(newData.price);
            if (!isNaN(qty) && !isNaN(price)) {
                newData.totalCost = (qty * price).toFixed(2);
            } else {
                newData.totalCost = '';
            }
        } else if (field === 'price') {
            const price = parseFloat(value);
            const qty = parseFloat(newData.quantity);
            if (!isNaN(qty) && !isNaN(price)) {
                newData.totalCost = (qty * price).toFixed(2);
            } else {
                newData.totalCost = '';
            }
        } else if (field === 'totalCost') {
            const total = parseFloat(value);
            const qty = parseFloat(newData.quantity);
            if (!isNaN(total) && !isNaN(qty) && qty > 0) {
                newData.price = (total / qty).toFixed(2);
            }
        }

        setRestockData(newData);
    };

    const handleRestock = async () => {
        if (!selectedForRestock || !restockData.quantity) {
            alert("Please enter a valid quantity.");
            return;
        }
        setIsRestocking(true);

        const quantity = parseFloat(restockData.quantity);
        const currentStock = parseFloat(selectedForRestock.current_stock || 0);
        const newPrice = restockData.price ? parseFloat(restockData.price) : selectedForRestock.purchase_price;

        try {
            // Create a promise that rejects after 10 seconds
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out. Please check your connection.')), 10000)
            );

            // 1. Log Restock
            const totalCost = quantity * newPrice;

            const { error: logError } = await Promise.race([
                supabase
                    .from('restock_logs')
                    .insert([{
                        ingredient_id: selectedForRestock.id,
                        quantity: quantity,
                        cost_per_unit: newPrice,
                        total_cost: totalCost
                    }]),
                timeoutPromise
            ]);

            if (logError) throw logError;

            // 2. Update Stock
            const { error } = await supabase
                .from('ingredients')
                .update({
                    current_stock: currentStock + quantity,
                    purchase_price: newPrice
                })
                .eq('id', selectedForRestock.id);

            if (error) throw error;

            // Optimistic Update
            useInventoryStore.getState().updateIngredient(selectedForRestock.id, {
                current_stock: currentStock + quantity,
                purchase_price: newPrice
            });

            setIsRestockModalOpen(false);
        } catch (error) {
            console.error('Error restocking:', error);
            alert(`Failed to restock: ${error.message}`);
        } finally {
            setIsRestocking(false);
        }
    };

    const openHistory = () => {
        setIsHistoryOpen(true);
    };

    const [categoryFilter, setCategoryFilter] = useState('All');
    const [stockFilter, setStockFilter] = useState('all'); // 'all', 'low', 'good'

    const filteredIngredients = ingredients.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || (item.category || 'Other') === categoryFilter;
        const isLow = item.current_stock <= item.low_stock_threshold;

        if (stockFilter === 'low') return matchesSearch && matchesCategory && isLow;
        if (stockFilter === 'good') return matchesSearch && matchesCategory && !isLow;
        return matchesSearch && matchesCategory;
    });

    // Summary Calculations
    const totalItems = ingredients.length;
    const lowStockItems = ingredients.filter(i => i.current_stock <= i.low_stock_threshold).length;
    const totalValue = ingredients.reduce((sum, item) => {
        return sum + (item.purchase_price * item.current_stock);
    }, 0);

    return (
        <div className="h-[calc(100vh-40px)] flex flex-col gap-6 relative overflow-hidden">
            {/* Header & Summary */}
            <div className="flex flex-col gap-6 overflow-y-auto pb-20 px-1">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-surface p-5 rounded-3xl border border-border shadow-sm">
                        <p className="text-text-muted text-sm font-bold uppercase tracking-wider mb-1">Total Items</p>
                        <p className="text-3xl font-bold text-text">{totalItems}</p>
                    </div>
                    <div className="bg-surface p-5 rounded-3xl border border-border shadow-sm">
                        <p className="text-text-muted text-sm font-bold uppercase tracking-wider mb-1">Low Stock Alerts</p>
                        <p className={`text-3xl font-bold ${lowStockItems > 0 ? 'text-red-400' : 'text-green-400'}`}>{lowStockItems}</p>
                    </div>
                    <div className="bg-surface p-5 rounded-3xl border border-border shadow-sm">
                        <p className="text-text-muted text-sm font-bold uppercase tracking-wider mb-1">Total Inventory Value</p>
                        <p className="text-3xl font-bold text-primary">LKR {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                </div>

                {/* Controls & Categories */}
                <div className="flex flex-col gap-4 bg-surface p-6 rounded-3xl border border-border shadow-sm">
                    <div className="flex flex-col sm:flex-row flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="p-3 bg-secondary/20 rounded-2xl text-secondary">
                                <Package size={24} />
                            </div>
                            <h1 className="text-2xl font-bold text-text">Inventory</h1>
                        </div>

                        <div className="flex gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-bg border border-border rounded-xl pl-10 pr-4 py-3 text-text focus:border-primary focus:outline-none"
                                />
                            </div>
                            <button
                                onClick={openHistory}
                                className="flex items-center justify-center gap-2 bg-surface hover:bg-surface-hover text-text border border-border px-4 py-3 rounded-xl transition-colors"
                                title="Restock History"
                            >
                                <History size={20} />
                            </button>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="flex items-center justify-center gap-2 bg-primary text-bg font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
                            >
                                <Plus size={20} />
                                <span className="hidden md:inline">Add Item</span>
                            </button>
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        <button
                            onClick={() => setCategoryFilter('All')}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${categoryFilter === 'All' ? 'bg-text text-bg' : 'bg-bg text-text-muted hover:text-text border border-border'}`}
                        >
                            All
                        </button>
                        {allCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${categoryFilter === cat ? 'bg-text text-bg' : 'bg-bg text-text-muted hover:text-text border border-border'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Inventory Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredIngredients.map(item => {
                        const isLow = item.current_stock <= item.low_stock_threshold;
                        const yieldDecimal = (item.yield_percent || 100) / 100;
                        const realCost = yieldDecimal > 0 ? (item.purchase_price / yieldDecimal) : 0;

                        return (
                            <div key={item.id} className="bg-surface p-5 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                                {isLow && <div className="absolute top-0 right-0 bg-red-400 w-16 h-16 blur-2xl opacity-20 pointer-events-none" />}

                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="text-xs font-bold text-text-muted uppercase tracking-wider bg-bg px-2 py-1 rounded-lg border border-border">
                                            {item.category || 'Other'}
                                        </span>
                                        <h3 className="text-xl font-bold text-text mt-2">{item.name}</h3>
                                    </div>
                                    <div className={`flex flex-col items-end ${isLow ? 'text-red-400' : 'text-text'}`}>
                                        <span className="text-2xl font-bold">{item.current_stock}</span>
                                        <span className="text-xs font-bold opacity-60">{item.unit}</span>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-text-muted">Min Stock</span>
                                        <span className="font-bold text-text">{item.low_stock_threshold} {item.unit}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-text-muted">Price / {item.unit}</span>
                                        <span className="font-bold text-text">LKR {item.purchase_price}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-text-muted">Real Cost</span>
                                        <span className="font-bold text-secondary">LKR {realCost.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    <button
                                        onClick={() => openRestockModal(item)}
                                        className="col-span-1 bg-green-400/10 text-green-400 hover:bg-green-400 hover:text-white p-2 rounded-xl flex items-center justify-center transition-colors"
                                        title="Restock"
                                    >
                                        <Plus size={20} />
                                    </button>
                                    <button
                                        onClick={() => startEditing(item)}
                                        className="col-span-1 bg-primary/10 text-primary hover:bg-primary hover:text-bg p-2 rounded-xl flex items-center justify-center transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                    <button
                                        onClick={() => openWastageModal(item)}
                                        className="col-span-1 bg-orange-400/10 text-orange-400 hover:bg-orange-400 hover:text-white p-2 rounded-xl flex items-center justify-center transition-colors"
                                        title="Report Wastage"
                                    >
                                        <MinusCircle size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="col-span-1 bg-red-400/10 text-red-400 hover:bg-red-400 hover:text-white p-2 rounded-xl flex items-center justify-center transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredIngredients.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <Package size={64} className="mx-auto mb-4 text-text-muted" />
                        <p className="text-xl font-bold text-text-muted">No items found</p>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-surface border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-text">Edit Ingredient</h2>
                            <button onClick={() => setEditingId(null)} className="p-2 hover:bg-surface-hover rounded-full text-text-muted">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-text-muted text-sm font-bold mb-1">Category</label>
                                    <select
                                        value={editValues.category}
                                        onChange={e => setEditValues({ ...editValues, category: e.target.value })}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    >
                                        {DEFAULT_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-text-muted text-sm font-bold mb-1">Current Stock</label>
                                    <input
                                        type="number"
                                        value={editValues.stock}
                                        onChange={e => setEditValues({ ...editValues, stock: e.target.value })}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-text-muted text-sm font-bold mb-1">Low Stock Alert</label>
                                    <input
                                        type="number"
                                        value={editValues.threshold}
                                        onChange={e => setEditValues({ ...editValues, threshold: e.target.value })}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-text-muted text-sm font-bold mb-1">Yield %</label>
                                    <input
                                        type="number"
                                        value={editValues.yield}
                                        onChange={e => setEditValues({ ...editValues, yield: e.target.value })}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-text-muted text-sm font-bold mb-1">Purchase Price</label>
                                <input
                                    type="number"
                                    value={editValues.price}
                                    onChange={e => setEditValues({ ...editValues, price: e.target.value })}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                />
                            </div>

                            <button
                                onClick={() => handleSave(editingId)}
                                disabled={isSaving}
                                className="w-full py-4 bg-primary text-bg font-bold rounded-xl hover:opacity-90 transition-opacity mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <Sparkles className="animate-spin" size={20} />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-surface border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-text">Add New Ingredient</h2>
                            <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-surface-hover rounded-full text-text-muted">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-text-muted text-sm font-bold mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newIngredient.name}
                                    onChange={e => setNewIngredient({ ...newIngredient, name: e.target.value })}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    placeholder="e.g. Basmati Rice"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-text-muted text-sm font-bold mb-1">Category</label>
                                    <div className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 text-text flex items-center justify-between group relative">
                                        <span className="font-medium">{newIngredient.category}</span>
                                        <div className="flex items-center gap-2">
                                            {isPredicting ? (
                                                <Sparkles className="text-primary animate-pulse" size={16} />
                                            ) : (
                                                <span className="text-xs text-text-muted bg-bg px-2 py-1 rounded-lg border border-border">Auto</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-text-muted text-sm font-bold mb-1">Unit</label>
                                    <select
                                        value={newIngredient.unit}
                                        onChange={e => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    >
                                        <option value="kg">kg</option>
                                        <option value="g">g</option>
                                        <option value="l">l</option>
                                        <option value="ml">ml</option>
                                        <option value="count">count</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-text-muted text-sm font-bold mb-1">Low Stock Alert</label>
                                    <input
                                        type="number"
                                        value={newIngredient.low_stock_threshold}
                                        onChange={e => setNewIngredient({ ...newIngredient, low_stock_threshold: e.target.value })}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-text-muted text-sm font-bold mb-1">Yield %</label>
                                    <input
                                        type="number"
                                        value={newIngredient.yield_percent}
                                        onChange={e => setNewIngredient({ ...newIngredient, yield_percent: e.target.value })}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-text-muted text-sm font-bold mb-1">Purchase Price (per {newIngredient.unit})</label>
                                <input
                                    type="number"
                                    value={newIngredient.purchase_price}
                                    onChange={e => setNewIngredient({ ...newIngredient, purchase_price: e.target.value })}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                />
                            </div>

                            <button
                                onClick={handleCreate}
                                disabled={isSubmitting}
                                className="w-full py-4 bg-primary text-bg font-bold rounded-xl hover:opacity-90 transition-opacity mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Sparkles className="animate-spin" size={20} />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Ingredient'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Wastage Modal */}
            {isWastageModalOpen && selectedForWastage && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-surface border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-text">Report Wastage</h2>
                                <p className="text-text-muted text-sm">{selectedForWastage.name}</p>
                            </div>
                            <button onClick={() => setIsWastageModalOpen(false)} className="p-2 hover:bg-surface-hover rounded-full text-text-muted">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-text-muted text-sm font-bold mb-1">Quantity Wasted ({selectedForWastage.unit})</label>
                                <input
                                    type="number"
                                    value={wastageData.quantity}
                                    onChange={e => setWastageData({ ...wastageData, quantity: e.target.value })}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-text-muted text-sm font-bold mb-1">Reason</label>
                                <select
                                    value={wastageData.reason}
                                    onChange={e => setWastageData({ ...wastageData, reason: e.target.value })}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                >
                                    <option value="">Select reason...</option>
                                    <option value="Spoiled">Spoiled / Expired</option>
                                    <option value="Spilled">Spilled / Dropped</option>
                                    <option value="Overcooked">Overcooked / Burnt</option>
                                    <option value="Customer Return">Customer Return</option>
                                    <option value="Staff Meal">Staff Meal</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                                <AlertTriangle className="text-red-400 shrink-0" size={20} />
                                <div>
                                    <p className="text-red-400 font-bold text-sm">This will reduce stock!</p>
                                    <p className="text-red-400/80 text-xs mt-1">
                                        Estimated Loss: LKR {wastageData.quantity ? ((selectedForWastage.purchase_price / (selectedForWastage.yield_percent / 100)) * parseFloat(wastageData.quantity)).toFixed(2) : '0.00'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleReportWastage}
                                disabled={isWastageSubmitting}
                                className="w-full py-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {isWastageSubmitting ? (
                                    <>
                                        <Sparkles className="animate-spin" size={20} />
                                        Reporting...
                                    </>
                                ) : (
                                    'Confirm Wastage'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Restock Modal */}
            {isRestockModalOpen && selectedForRestock && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-surface border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-text">Add Stock</h2>
                                <p className="text-text-muted text-sm">Purchasing: {selectedForRestock.name}</p>
                            </div>
                            <button onClick={() => setIsRestockModalOpen(false)} className="p-2 hover:bg-surface-hover rounded-full text-text-muted">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-text-muted text-sm font-bold mb-1">Quantity Purchased ({selectedForRestock.unit})</label>
                                <input
                                    type="number"
                                    value={restockData.quantity}
                                    onChange={e => handleRestockChange('quantity', e.target.value)}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-text-muted text-sm font-bold mb-1">Total Cost (LKR)</label>
                                    <input
                                        type="number"
                                        value={restockData.totalCost}
                                        onChange={e => handleRestockChange('totalCost', e.target.value)}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-text-muted text-sm font-bold mb-1">Price / {selectedForRestock.unit}</label>
                                    <input
                                        type="number"
                                        value={restockData.price}
                                        onChange={e => handleRestockChange('price', e.target.value)}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                        placeholder={selectedForRestock.purchase_price}
                                    />
                                </div>
                            </div>

                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
                                <Plus className="text-green-400 shrink-0" size={20} />
                                <div>
                                    <p className="text-green-400 font-bold text-sm">Stock will increase!</p>
                                    <p className="text-green-400/80 text-xs mt-1">
                                        New Total: {parseFloat(selectedForRestock.current_stock) + (parseFloat(restockData.quantity) || 0)} {selectedForRestock.unit}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleRestock}
                                disabled={isRestocking}
                                className="w-full py-4 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {isRestocking ? (
                                    <>
                                        <Sparkles className="animate-spin" size={20} />
                                        Purchasing...
                                    </>
                                ) : (
                                    'Confirm Purchase'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {isHistoryOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-surface border border-border rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-text">Restock History</h2>
                            <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-surface-hover rounded-full text-text-muted">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 -mx-2 px-2">
                            {historyLogs.length === 0 ? (
                                <div className="text-center py-10 text-text-muted">No history found.</div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-text-muted text-sm border-b border-border">
                                            <th className="pb-3 pl-2 font-bold">Date</th>
                                            <th className="pb-3 font-bold">Item</th>
                                            <th className="pb-3 font-bold">Qty</th>
                                            <th className="pb-3 font-bold text-right pr-2">Total Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyLogs.map(log => (
                                            <tr key={log.id} className="border-b border-border/50 last:border-0 hover:bg-surface-hover/50 transition-colors">
                                                <td className="py-3 pl-2 text-text-muted text-sm">
                                                    {new Date(log.created_at).toLocaleDateString()} <span className="opacity-50 text-xs">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td className="py-3 text-text font-medium">
                                                    {log.ingredients?.name || 'Unknown'}
                                                </td>
                                                <td className="py-3 text-text">
                                                    +{log.quantity} {log.ingredients?.unit}
                                                </td>
                                                <td className="py-3 text-right pr-2 text-text font-bold">
                                                    LKR {log.total_cost.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
