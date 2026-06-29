import { create } from 'zustand';

interface Ingredient {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    purchase_price: number;
    [key: string]: unknown;
}

interface InventoryLog {
    id: string;
    ingredient_id: string;
    change: number;
    reason: string;
    created_at: string;
    [key: string]: unknown;
}

interface InventoryState {
    ingredients: Ingredient[];
    logs: InventoryLog[];
    loading: boolean;
    setIngredients: (ingredients: Ingredient[]) => void;
    setLogs: (logs: InventoryLog[]) => void;
    addIngredient: (ingredient: Ingredient) => void;
    updateIngredient: (id: string, updates: Partial<Ingredient>) => void;
    deleteIngredient: (id: string) => void;
    addLog: (log: InventoryLog) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
    ingredients: [],
    logs: [],
    loading: true,

    setIngredients: (ingredients) => set({ ingredients, loading: false }),
    setLogs: (logs) => set({ logs }),

    addIngredient: (ingredient) => set((state) => {
        if (state.ingredients.some(i => i.id === ingredient.id)) return state;
        return { ingredients: [...state.ingredients, ingredient] };
    }),

    updateIngredient: (id, updates) => set((state) => ({
        ingredients: state.ingredients.map(ing =>
            ing.id === id ? { ...ing, ...updates } : ing
        )
    })),

    deleteIngredient: (id) => set((state) => ({
        ingredients: state.ingredients.filter(ing => ing.id !== id)
    })),

    addLog: (log) => set((state) => ({
        logs: [log, ...state.logs]
    }))
}));
