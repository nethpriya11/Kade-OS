import { create } from 'zustand';

export const useCartStore = create((set) => ({
    cart: [],
    addToCart: (item) => set((state) => {
        const existingItem = state.cart.find((i) => i.id === item.id);
        if (existingItem) {
            return {
                cart: state.cart.map((i) =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                ),
            };
        }
        return { cart: [...state.cart, { ...item, quantity: 1 }] };
    }),
    removeFromCart: (itemId) => set((state) => ({
        cart: state.cart.filter((i) => i.id !== itemId),
    })),
    updateQuantity: (itemId, quantity) => set((state) => ({
        cart: state.cart.map((i) =>
            i.id === itemId ? { ...i, quantity: Math.max(0, quantity) } : i
        ).filter((i) => i.quantity > 0),
    })),
    clearCart: () => set({ cart: [] }),
    total: () => set((state) => ({
        total: state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    })),
}));
