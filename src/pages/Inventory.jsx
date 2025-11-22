import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Package, AlertTriangle, Save, Plus, Search, X, Check, Edit2 } from 'lucide-react';

const Inventory = () => {
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({ stock: '', price: '', yield: '' });
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newIngredient, setNewIngredient] = useState({
        name: '',
        unit: 'kg',
        current_stock: 0,
        low_stock_threshold: 5,
        purchase_price: 0,
        yield_percent: 100
    });

    useEffect(() => {
        fetchInventory();

        const subscription = supabase
            .channel('inventory_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, fetchInventory)
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchInventory = async () => {
        const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .order('name', { ascending: true });

        if (data) setIngredients(data);
        setLoading(false);
    };

    const startEditing = (item) => {
        setEditingId(item.id);
        setEditValues({
            stock: item.current_stock,
            price: item.purchase_price || 0,
            yield: item.yield_percent || 100
        });
    };

    const handleSave = async (id) => {
        const { error } = await supabase
            .from('ingredients')
            .update({
                current_stock: editValues.stock,
                purchase_price: editValues.price,
                yield_percent: editValues.yield
            })
            .eq('id', id);

        if (!error) {
            setEditingId(null);
            fetchInventory();
        }
    };

    const handleCreate = async () => {
        if (!newIngredient.name) return;

        const { error } = await supabase
            .from('ingredients')
            .insert([newIngredient]);

        if (!error) {
            setIsCreating(false);
            setNewIngredient({
                name: '',
                unit: 'kg',
                current_stock: 0,
                low_stock_threshold: 5,
                purchase_price: 0,
                yield_percent: 100
            });
            fetchInventory();
        }
    };

    const filteredIngredients = ingredients.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-40px)] flex flex-col gap-6 relative">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-surface p-6 rounded-3xl border border-border shadow-sm">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="p-3 bg-secondary/20 rounded-2xl text-secondary">
                        <Package size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text">Inventory & Costing</h1>
                        <p className="text-text-muted text-sm">Track stock and calculate real costs</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                        <input
                            type="text"
                            placeholder="Search ingredients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full md:w-64 bg-bg border border-border rounded-xl pl-10 pr-4 py-3 text-text focus:border-primary focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center justify-center gap-2 bg-primary text-bg font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
                    >
                        <Plus size={20} />
                        <span className="hidden md:inline">Add Ingredient</span>
                        <span className="md:hidden">Add</span>
                    </button>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="flex-1 min-h-0 bg-surface rounded-3xl border border-border overflow-hidden flex flex-col">
                <div className="overflow-x-auto overflow-y-auto flex-1">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-bg/50 border-b border-border sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="p-4 font-bold text-text-muted uppercase text-xs tracking-wider">Ingredient</th>
                                <th className="p-4 font-bold text-text-muted uppercase text-xs tracking-wider">Stock Level</th>
                                <th className="p-4 font-bold text-text-muted uppercase text-xs tracking-wider">Purchase Price</th>
                                <th className="p-4 font-bold text-text-muted uppercase text-xs tracking-wider">Yield %</th>
                                <th className="p-4 font-bold text-text-muted uppercase text-xs tracking-wider">Real Cost / Unit</th>
                                <th className="p-4 font-bold text-text-muted uppercase text-xs tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredIngredients.map(item => {
                                const isLow = item.current_stock <= item.low_stock_threshold;
                                const isEditing = editingId === item.id;

                                // Calculate Real Cost: Price / (Yield/100)
                                const yieldDecimal = (item.yield_percent || 100) / 100;
                                const realCost = yieldDecimal > 0 ? (item.purchase_price / yieldDecimal) : 0;

                                return (
                                    <tr key={item.id} className="hover:bg-surface-hover transition-colors group">
                                        <td className="p-4">
                                            <div className="font-bold text-text">{item.name}</div>
                                            <div className="text-xs text-text-muted font-medium bg-bg px-2 py-0.5 rounded inline-block mt-1">{item.unit}</div>
                                        </td>

                                        {/* Stock Level */}
                                        <td className="p-4">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editValues.stock}
                                                    onChange={(e) => setEditValues({ ...editValues, stock: e.target.value })}
                                                    className="bg-bg border border-primary rounded-lg px-3 py-2 w-24 text-text focus:outline-none font-bold"
                                                />
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold text-lg ${isLow ? 'text-red-400' : 'text-text'}`}>
                                                        {item.current_stock}
                                                    </span>
                                                    {isLow && (
                                                        <div className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
                                                            <AlertTriangle size={12} />
                                                            Low Stock
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        {/* Purchase Price */}
                                        <td className="p-4">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editValues.price}
                                                    onChange={(e) => setEditValues({ ...editValues, price: e.target.value })}
                                                    className="bg-bg border border-primary rounded-lg px-3 py-2 w-28 text-text focus:outline-none font-bold"
                                                    placeholder="0.00"
                                                />
                                            ) : (
                                                <span className="text-text-muted font-medium">LKR {item.purchase_price || 0}</span>
                                            )}
                                        </td>

                                        {/* Yield % */}
                                        <td className="p-4">
                                            {isEditing ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={editValues.yield}
                                                        onChange={(e) => setEditValues({ ...editValues, yield: e.target.value })}
                                                        className="bg-bg border border-primary rounded-lg px-3 py-2 w-20 text-text focus:outline-none font-bold"
                                                    />
                                                    <span className="text-text-muted font-bold">%</span>
                                                </div>
                                            ) : (
                                                <span className={`font-bold ${item.yield_percent < 100 ? 'text-secondary' : 'text-text-muted'}`}>
                                                    {item.yield_percent || 100}%
                                                </span>
                                            )}
                                        </td>

                                        {/* Real Cost Calculation */}
                                        <td className="p-4">
                                            <div className="font-bold text-lg text-secondary">
                                                LKR {realCost.toFixed(2)}
                                            </div>
                                            {item.yield_percent < 100 && (
                                                <div className="text-xs text-text-muted mt-1">
                                                    (vs LKR {item.purchase_price})
                                                </div>
                                            )}
                                        </td>

                                        <td className="p-4 text-right">
                                            {isEditing ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleSave(item.id)}
                                                        className="p-2 bg-primary text-bg rounded-lg hover:opacity-90 transition-opacity"
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="p-2 bg-surface-hover text-text-muted rounded-lg hover:text-text transition-colors"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startEditing(item)}
                                                    className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}

                            {filteredIngredients.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-text-muted opacity-50">
                                        <Package size={48} className="mx-auto mb-4" />
                                        <p className="text-lg font-medium">No ingredients found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-surface border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
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
                                <div>
                                    <label className="block text-text-muted text-sm font-bold mb-1">Low Stock Alert</label>
                                    <input
                                        type="number"
                                        value={newIngredient.low_stock_threshold}
                                        onChange={e => setNewIngredient({ ...newIngredient, low_stock_threshold: e.target.value })}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-text-muted text-sm font-bold mb-1">Purchase Price</label>
                                    <input
                                        type="number"
                                        value={newIngredient.purchase_price}
                                        onChange={e => setNewIngredient({ ...newIngredient, purchase_price: e.target.value })}
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

                            <button
                                onClick={handleCreate}
                                className="w-full py-4 bg-primary text-bg font-bold rounded-xl hover:opacity-90 transition-opacity mt-4"
                            >
                                Create Ingredient
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
