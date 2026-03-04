import { create } from 'zustand';

export const useCartStore = create((set) => ({
    cart: [],
    addToCart: (item) => set((state) => {
        const cartItemId = item.cartItemId || item.id;
        const existingItem = state.cart.find((i) => (i.cartItemId || i.id) === cartItemId);
        if (existingItem) {
            return {
                cart: state.cart.map((i) =>
                    (i.cartItemId || i.id) === cartItemId ? { ...i, quantity: i.quantity + 1 } : i
                ),
            };
        }
        return { cart: [...state.cart, { ...item, quantity: 1, cartItemId }] };
    }),
    removeFromCart: (cartItemId) => set((state) => ({
        cart: state.cart.filter((i) => (i.cartItemId || i.id) !== cartItemId),
    })),
    updateQuantity: (cartItemId, quantity) => set((state) => ({
        cart: state.cart.map((i) =>
            (i.cartItemId || i.id) === cartItemId ? { ...i, quantity: Math.max(0, quantity) } : i
        ).filter((i) => i.quantity > 0),
    })),
    clearCart: () => set({ cart: [] }),
    total: () => set((state) => ({
        total: state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    })),
}));
