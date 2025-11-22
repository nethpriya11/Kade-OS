import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Package, AlertTriangle, Save, Plus } from 'lucide-react';

const Inventory = () => {
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({ stock: '', price: '', yield: '' });
    const [isCreating, setIsCreating] = useState(false);
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

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-primary mb-2">Inventory & Costing</h1>
                    <p className="text-text-muted">Track stock and calculate real ingredient costs.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsCreating(true)}
                        className="bg-primary text-bg font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:scale-105 transition-transform"
                    >
                        <Plus size={20} />
                        Add Ingredient
                    </button>
                    <div className="bg-surface p-3 rounded-xl border border-border flex items-center gap-2">
                        <Package className="text-secondary" />
                        <span className="font-bold text-text">{ingredients.length} Items</span>
                    </div>
                </div>
            </header>

            {/* Create Modal / Form */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-2xl font-bold text-text mb-6">Add New Ingredient</h2>

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

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-3 font-bold text-text-muted hover:bg-surface-hover rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    className="flex-1 py-3 bg-primary text-bg font-bold rounded-xl hover:opacity-90 transition-opacity"
                                >
                                    Create Ingredient
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-surface rounded-2xl border border-border overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-bg border-b border-border">
                        <tr>
                            <th className="p-4 font-medium text-text-muted">Ingredient</th>
                            <th className="p-4 font-medium text-text-muted">Stock Level</th>
                            <th className="p-4 font-medium text-text-muted">Purchase Price</th>
                            <th className="p-4 font-medium text-text-muted">Yield %</th>
                            <th className="p-4 font-medium text-text-muted">Real Cost / Unit</th>
                            <th className="p-4 font-medium text-text-muted">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ingredients.map(item => {
                            const isLow = item.current_stock <= item.low_stock_threshold;
                            const isEditing = editingId === item.id;

                            // Calculate Real Cost: Price / (Yield/100)
                            const yieldDecimal = (item.yield_percent || 100) / 100;
                            const realCost = yieldDecimal > 0 ? (item.purchase_price / yieldDecimal) : 0;

                            return (
                                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-text">{item.name}</div>
                                        <div className="text-xs text-text-muted">{item.unit}</div>
                                    </td>

                                    {/* Stock Level */}
                                    <td className="p-4">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={editValues.stock}
                                                onChange={(e) => setEditValues({ ...editValues, stock: e.target.value })}
                                                className="bg-bg border border-primary rounded px-2 py-1 w-20 text-text focus:outline-none"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold ${isLow ? 'text-primary' : 'text-text'}`}>
                                                    {item.current_stock}
                                                </span>
                                                {isLow && <AlertTriangle size={14} className="text-primary" />}
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
                                                className="bg-bg border border-primary rounded px-2 py-1 w-24 text-text focus:outline-none"
                                                placeholder="0.00"
                                            />
                                        ) : (
                                            <span className="text-text-muted">LKR {item.purchase_price || 0}</span>
                                        )}
                                    </td>

                                    {/* Yield % */}
                                    <td className="p-4">
                                        {isEditing ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    value={editValues.yield}
                                                    onChange={(e) => setEditValues({ ...editValues, yield: e.target.value })}
                                                    className="bg-bg border border-primary rounded px-2 py-1 w-16 text-text focus:outline-none"
                                                />
                                                <span className="text-text-muted">%</span>
                                            </div>
                                        ) : (
                                            <span className={`${item.yield_percent < 100 ? 'text-primary font-bold' : 'text-text-muted'}`}>
                                                {item.yield_percent || 100}%
                                            </span>
                                        )}
                                    </td>

                                    {/* Real Cost Calculation */}
                                    <td className="p-4">
                                        <div className="font-bold text-secondary">
                                            LKR {realCost.toFixed(2)}
                                        </div>
                                        {item.yield_percent < 100 && (
                                            <div className="text-xs text-text-muted">
                                                (vs LKR {item.purchase_price})
                                            </div>
                                        )}
                                    </td>

                                    <td className="p-4">
                                        {isEditing ? (
                                            <button
                                                onClick={() => handleSave(item.id)}
                                                className="text-secondary hover:text-white p-2 bg-secondary/10 rounded-lg transition-colors"
                                            >
                                                <Save size={18} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => startEditing(item)}
                                                className="text-text-muted hover:text-primary text-sm underline"
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Inventory;
