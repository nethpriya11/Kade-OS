import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Utensils, Plus, Trash2, Save, ChevronRight, ChefHat, Edit2, Check, X } from 'lucide-react';

const Menu = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [recipe, setRecipe] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', category: 'Base', price: '' });
    const [editingPrice, setEditingPrice] = useState(false);
    const [editPrice, setEditPrice] = useState('');

    // Fetch Data
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: menu } = await supabase.from('menu_items').select('*').order('category');
        const { data: ing } = await supabase.from('ingredients').select('*').order('name');

        if (menu) setMenuItems(menu);
        if (ing) setIngredients(ing);
        setLoading(false);
    };

    // Fetch Recipe for Selected Item
    useEffect(() => {
        if (selectedItem) {
            fetchRecipe(selectedItem.id);
        }
    }, [selectedItem]);

    const fetchRecipe = async (menuId) => {
        const { data } = await supabase
            .from('recipes')
            .select('*, ingredients(*)')
            .eq('menu_item_id', menuId);

        if (data) setRecipe(data);
    };

    // Create Menu Item
    const handleCreateItem = async () => {
        if (!newItem.name || !newItem.price) return;

        const { data, error } = await supabase
            .from('menu_items')
            .insert([{ ...newItem, is_available: true }])
            .select()
            .single();

        if (!error) {
            setIsCreating(false);
            setNewItem({ name: '', category: 'Base', price: '' });
            fetchData();
            setSelectedItem(data); // Auto-select the new item
        }
    };

    // Add Ingredient to Recipe
    const addIngredientToRecipe = async (ingredientId) => {
        if (!selectedItem) return;

        const { error } = await supabase
            .from('recipes')
            .insert([{
                menu_item_id: selectedItem.id,
                ingredient_id: ingredientId,
                quantity_required: 0 // Default
            }]);

        if (!error) fetchRecipe(selectedItem.id);
    };

    // Update Quantity
    const updateQuantity = async (recipeId, quantity) => {
        await supabase
            .from('recipes')
            .update({ quantity_required: quantity })
            .eq('id', recipeId);

        // Optimistic update
        setRecipe(recipe.map(r => r.id === recipeId ? { ...r, quantity_required: quantity } : r));
    };

    // Remove Ingredient
    const removeIngredient = async (recipeId) => {
        await supabase.from('recipes').delete().eq('id', recipeId);
        fetchRecipe(selectedItem.id);
    };

    // Update Menu Item Price
    const updatePrice = async () => {
        if (!editPrice || !selectedItem) return;

        const { error } = await supabase
            .from('menu_items')
            .update({ price: editPrice })
            .eq('id', selectedItem.id);

        if (!error) {
            setSelectedItem({ ...selectedItem, price: editPrice });
            setEditingPrice(false);
            fetchData(); // Refresh list
        }
    };

    // Calculate Total Cost
    const totalCost = recipe.reduce((sum, r) => {
        const ing = r.ingredients;
        const yieldDecimal = (ing.yield_percent || 100) / 100;
        const realCostPerUnit = yieldDecimal > 0 ? (ing.purchase_price / yieldDecimal) : 0;
        return sum + (realCostPerUnit * r.quantity_required);
    }, 0);

    const grossMargin = selectedItem ? ((selectedItem.price - totalCost) / selectedItem.price) * 100 : 0;

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-40px)] gap-6 relative">
            {/* Create Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-2xl font-bold text-text mb-6">New Menu Item</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-text-muted text-sm font-bold mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    placeholder="e.g. Spicy Chicken Bowl"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-text-muted text-sm font-bold mb-1">Category</label>
                                <select
                                    value={newItem.category}
                                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                >
                                    {['Base', 'Protein', 'Drink', 'Extra'].map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-text-muted text-sm font-bold mb-1">Selling Price (LKR)</label>
                                <input
                                    type="number"
                                    value={newItem.price}
                                    onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-3 font-bold text-text-muted hover:bg-surface-hover rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateItem}
                                    className="flex-1 py-3 bg-primary text-bg font-bold rounded-xl hover:opacity-90 transition-opacity"
                                >
                                    Create Item
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Left: Menu List */}
            <div className="w-full md:w-1/3 bg-surface rounded-3xl border border-border overflow-hidden flex flex-col">
                <div className="p-6 border-b border-border bg-bg/50 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-text flex items-center gap-2">
                        <Utensils className="text-primary" />
                        Menu Items
                    </h2>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="bg-primary text-bg p-2 rounded-lg hover:scale-105 transition-transform"
                    >
                        <Plus size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className={`w-full text-left p-4 rounded-2xl transition-all flex justify-between items-center group ${selectedItem?.id === item.id
                                ? 'bg-primary text-bg shadow-lg shadow-primary/20'
                                : 'hover:bg-surface-hover text-text'
                                }`}
                        >
                            <div>
                                <div className="font-bold">{item.name}</div>
                                <div className={`text-sm ${selectedItem?.id === item.id ? 'text-bg/80' : 'text-text-muted'}`}>
                                    {item.category} • LKR {item.price}
                                </div>
                            </div>
                            <ChevronRight size={20} className={`transition-transform ${selectedItem?.id === item.id ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Right: Recipe Editor */}
            <div className="flex-1 bg-surface rounded-3xl border border-border overflow-hidden flex flex-col relative">
                {!selectedItem ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-muted opacity-50">
                        <ChefHat size={64} className="mb-4" />
                        <p className="text-xl font-medium">Select a dish to edit recipe</p>
                    </div>
                ) : (
                    <>
                        <div className="p-6 border-b border-border bg-bg/50 flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-bold text-text mb-1">{selectedItem.name}</h2>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-text-muted flex items-center gap-2">
                                        Selling Price:
                                        {editingPrice ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={editPrice}
                                                    onChange={(e) => setEditPrice(e.target.value)}
                                                    className="bg-bg border border-primary rounded-lg px-2 py-1 w-24 text-text font-bold focus:outline-none"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={updatePrice}
                                                    className="p-1 bg-primary text-bg rounded hover:opacity-90"
                                                >
                                                    <Check size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setEditingPrice(false)}
                                                    className="p-1 bg-surface-hover text-text rounded hover:bg-border"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-text font-bold">LKR {selectedItem.price}</span>
                                                <button
                                                    onClick={() => {
                                                        setEditingPrice(true);
                                                        setEditPrice(selectedItem.price);
                                                    }}
                                                    className="p-1 hover:bg-surface-hover rounded transition-colors"
                                                >
                                                    <Edit2 size={14} className="text-text-muted hover:text-primary" />
                                                </button>
                                            </>
                                        )}
                                    </span>
                                    <span className="text-text-muted">Cost: <span className="text-secondary font-bold">LKR {totalCost.toFixed(2)}</span></span>
                                    <span className={`font-bold px-2 py-0.5 rounded ${grossMargin > 50 ? 'bg-secondary/20 text-secondary' : 'bg-red-500/20 text-red-400'}`}>
                                        Margin: {grossMargin.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Ingredients</h3>

                            <div className="space-y-4 mb-8">
                                {recipe.map(r => (
                                    <div key={r.id} className="flex items-center gap-4 bg-bg p-4 rounded-2xl border border-border">
                                        <div className="flex-1">
                                            <div className="font-bold text-text">{r.ingredients.name}</div>
                                            <div className="text-xs text-text-muted">
                                                Yield: {r.ingredients.yield_percent}% • Cost: LKR {r.ingredients.purchase_price}/{r.ingredients.unit}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={r.quantity_required}
                                                onChange={(e) => updateQuantity(r.id, e.target.value)}
                                                className="bg-surface border border-border rounded-lg px-3 py-2 w-24 text-right font-bold text-text focus:border-primary focus:outline-none"
                                                step="0.001"
                                            />
                                            <span className="text-text-muted w-8">{r.ingredients.unit}</span>
                                        </div>

                                        <button
                                            onClick={() => removeIngredient(r.id)}
                                            className="p-2 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add Ingredient */}
                            <div className="bg-bg/50 p-4 rounded-2xl border border-dashed border-border">
                                <h4 className="text-sm font-bold text-text mb-3">Add Ingredient</h4>
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 bg-surface border border-border rounded-xl px-4 py-2 text-text focus:border-primary focus:outline-none"
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                addIngredientToRecipe(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                    >
                                        <option value="">Select ingredient...</option>
                                        {ingredients
                                            .filter(ing => !recipe.find(r => r.ingredient_id === ing.id))
                                            .map(ing => (
                                                <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                                            ))
                                        }
                                    </select>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Menu;
