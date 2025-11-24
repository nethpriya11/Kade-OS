import { create } from 'zustand';

export const useInventoryStore = create((set, get) => ({
    ingredients: [],
    logs: [],
    loading: true,

    setIngredients: (ingredients) => set({ ingredients, loading: false }),
    setLogs: (logs) => set({ logs }),

    // Optimistic updates (optional, but good for UI responsiveness)
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
