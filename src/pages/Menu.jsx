import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { Utensils, Plus, Trash2, Save, ChevronRight, ChefHat, Edit2, Check, X, Search, Filter } from 'lucide-react';

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
    const [editingCategory, setEditingCategory] = useState(false);
    const [editCategory, setEditCategory] = useState('');
    const [editingCost, setEditingCost] = useState(false);
    const [editCost, setEditCost] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

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
            setEditPrice(selectedItem.price); // Initialize edit price
            setEditCategory(selectedItem.category); // Initialize edit category
            setEditCost(selectedItem.cost || 0); // Initialize edit cost
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
            setSelectedItem(data); // Auto-open the new item modal
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

    // Update Menu Item Category
    const updateCategory = async () => {
        if (!editCategory || !selectedItem) return;

        const { error } = await supabase
            .from('menu_items')
            .update({ category: editCategory })
            .eq('id', selectedItem.id);

        if (!error) {
            setSelectedItem({ ...selectedItem, category: editCategory });
            setEditingCategory(false);
            fetchData(); // Refresh list
        }
    };

    // Update Menu Item Cost
    const updateCost = async () => {
        if (editCost === '' || !selectedItem) return;

        const { error } = await supabase
            .from('menu_items')
            .update({ cost: editCost })
            .eq('id', selectedItem.id);

        if (!error) {
            setSelectedItem({ ...selectedItem, cost: editCost });
            setEditingCost(false);
            fetchData(); // Refresh list
        }
    };

    // Calculate Recipe Cost
    const recipeCost = recipe.reduce((sum, r) => {
        const ing = r.ingredients;
        const yieldDecimal = (ing.yield_percent || 100) / 100;
        const realCostPerUnit = yieldDecimal > 0 ? (ing.purchase_price / yieldDecimal) : 0;
        return sum + (realCostPerUnit * r.quantity_required);
    }, 0);

    const currentCost = selectedItem?.cost || 0;
    const grossMargin = selectedItem ? ((selectedItem.price - currentCost) / selectedItem.price) * 100 : 0;

    // Filter Menu Items
    const filteredItems = menuItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = ['All', ...new Set(menuItems.map(item => item.category))];

    return (
        <div className="h-[calc(100vh-40px)] flex flex-col gap-6 relative">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-surface p-6 rounded-3xl border border-border shadow-sm">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="p-3 bg-primary/20 rounded-2xl text-primary">
                        <Utensils size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text">Menu Management</h1>
                        <p className="text-text-muted text-sm">{menuItems.length} items available</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                        <input
                            type="text"
                            placeholder="Search menu..."
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
                        <span className="hidden md:inline">New Item</span>
                        <span className="md:hidden">Add</span>
                    </button>
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors border ${selectedCategory === cat
                            ? 'bg-text text-bg border-text'
                            : 'bg-surface text-text-muted border-border hover:border-text'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Menu Grid */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-20">
                {filteredItems.map(item => (
                    <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="bg-surface border border-border rounded-3xl p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className="px-3 py-1 bg-bg rounded-full text-xs font-bold text-text-muted border border-border">
                                {item.category}
                            </span>
                            <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text-muted group-hover:bg-primary group-hover:text-bg transition-colors">
                                <Edit2 size={14} />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-text mb-1">{item.name}</h3>
                        <p className="text-primary font-bold">LKR {item.price}</p>
                    </div>
                ))}

                {/* Empty State */}
                {filteredItems.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-text-muted opacity-50">
                        <Utensils size={48} className="mb-4" />
                        <p className="text-lg font-medium">No items found</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isCreating && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-surface border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-text">New Menu Item</h2>
                            <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-surface-hover rounded-full text-text-muted">
                                <X size={20} />
                            </button>
                        </div>
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
                            <button
                                onClick={handleCreateItem}
                                className="w-full py-4 bg-primary text-bg font-bold rounded-xl hover:opacity-90 transition-opacity mt-4"
                            >
                                Create Item
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Recipe Edit Modal */}
            {selectedItem && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-surface border border-border rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-border flex justify-between items-start bg-bg/50 rounded-t-3xl">
                            <div>
                                <h2 className="text-3xl font-bold text-text mb-1">{selectedItem.name}</h2>
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2 bg-surface px-3 py-1 rounded-lg border border-border">
                                        <span className="text-text-muted">Price:</span>
                                        {editingPrice ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={editPrice}
                                                    onChange={(e) => setEditPrice(e.target.value)}
                                                    className="bg-bg border border-primary rounded px-2 py-0.5 w-20 text-text font-bold focus:outline-none"
                                                    autoFocus
                                                />
                                                <button onClick={updatePrice} className="text-green-400 hover:text-green-300"><Check size={16} /></button>
                                                <button onClick={() => setEditingPrice(false)} className="text-red-400 hover:text-red-300"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-text font-bold">LKR {selectedItem.price}</span>
                                                <button onClick={() => { setEditingPrice(true); setEditPrice(selectedItem.price); }} className="text-text-muted hover:text-primary">
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 bg-surface px-3 py-1 rounded-lg border border-border">
                                        <span className="text-text-muted">Category:</span>
                                        {editingCategory ? (
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={editCategory}
                                                    onChange={(e) => setEditCategory(e.target.value)}
                                                    className="bg-bg border border-primary rounded px-2 py-0.5 text-text font-bold focus:outline-none text-sm"
                                                    autoFocus
                                                >
                                                    {['Base', 'Protein', 'Drink', 'Extra'].map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                                <button onClick={updateCategory} className="text-green-400 hover:text-green-300"><Check size={16} /></button>
                                                <button onClick={() => setEditingCategory(false)} className="text-red-400 hover:text-red-300"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-text font-bold">{selectedItem.category}</span>
                                                <button onClick={() => { setEditingCategory(true); setEditCategory(selectedItem.category); }} className="text-text-muted hover:text-primary">
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 bg-surface px-3 py-1 rounded-lg border border-border">
                                        <span className="text-text-muted">Cost:</span>
                                        {editingCost ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={editCost}
                                                    onChange={(e) => setEditCost(e.target.value)}
                                                    className="bg-bg border border-primary rounded px-2 py-0.5 w-20 text-text font-bold focus:outline-none"
                                                    autoFocus
                                                />
                                                <button onClick={updateCost} className="text-green-400 hover:text-green-300"><Check size={16} /></button>
                                                <button onClick={() => setEditingCost(false)} className="text-red-400 hover:text-red-300"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-secondary font-bold">LKR {currentCost}</span>
                                                <button onClick={() => { setEditingCost(true); setEditCost(currentCost); }} className="text-text-muted hover:text-primary">
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <span className={`font-bold px-3 py-1 rounded-lg border ${grossMargin > 50
                                        ? 'bg-secondary/10 text-secondary border-secondary/20'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                        Margin: {grossMargin.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="p-2 hover:bg-surface-hover rounded-full text-text-muted transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body - Recipe Editor */}
                        <div className="flex-1 overflow-y-auto p-6 bg-surface">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                    <ChefHat size={16} />
                                    Recipe Ingredients
                                </h3>
                                {recipe.length > 0 && (
                                    <span className="text-xs text-text-muted">
                                        Recipe Cost: LKR {recipeCost.toFixed(2)}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3 mb-8">
                                {recipe.length === 0 && (
                                    <div className="text-center py-8 text-text-muted border-2 border-dashed border-border rounded-2xl">
                                        <p>No ingredients added yet.</p>
                                        <p className="text-sm">Add ingredients below to calculate cost.</p>
                                    </div>
                                )}
                                {recipe.map(r => (
                                    <div key={r.id} className="flex items-center gap-4 bg-bg p-4 rounded-2xl border border-border group hover:border-primary/30 transition-colors">
                                        <div className="flex-1">
                                            <div className="font-bold text-text">{r.ingredients.name}</div>
                                            <div className="text-xs text-text-muted flex gap-2">
                                                <span>Yield: {r.ingredients.yield_percent}%</span>
                                                <span>•</span>
                                                <span>Cost: LKR {r.ingredients.purchase_price}/{r.ingredients.unit}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 bg-surface rounded-lg p-1 border border-border">
                                            <input
                                                type="number"
                                                value={r.quantity_required}
                                                onChange={(e) => updateQuantity(r.id, e.target.value)}
                                                className="bg-transparent w-20 text-right font-bold text-text focus:outline-none"
                                                step="0.001"
                                            />
                                            <span className="text-text-muted text-sm font-medium pr-2 border-l border-border pl-2">
                                                {r.ingredients.unit}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => removeIngredient(r.id)}
                                            className="p-2 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add Ingredient Section */}
                            <div className="bg-bg/50 p-5 rounded-2xl border border-dashed border-border">
                                <h4 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
                                    <Plus size={16} className="text-primary" />
                                    Add Ingredient
                                </h4>
                                <div className="relative">
                                    <select
                                        className="w-full appearance-none bg-surface border border-border rounded-xl px-4 py-3 text-text focus:border-primary focus:outline-none cursor-pointer hover:border-text-muted transition-colors"
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                addIngredientToRecipe(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                    >
                                        <option value="">Search and select ingredient...</option>
                                        {ingredients
                                            .filter(ing => !recipe.find(r => r.ingredient_id === ing.id))
                                            .map(ing => (
                                                <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                                            ))
                                        }
                                    </select>
                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none rotate-90" size={16} />
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-border bg-bg/50 rounded-b-3xl flex justify-end">
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="px-6 py-3 bg-primary text-bg font-bold rounded-xl hover:opacity-90 transition-opacity"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Menu;
