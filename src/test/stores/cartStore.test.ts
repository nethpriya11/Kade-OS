import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../../store/cartStore';

beforeEach(() => {
    useCartStore.setState({ cart: [] });
});

describe('cartStore', () => {
    const testItem = { id: '1', name: 'Test Item', price: 100, quantity: 1 };

    it('should start with empty cart', () => {
        const { cart } = useCartStore.getState();
        expect(cart).toEqual([]);
    });

    it('should add item to cart', () => {
        useCartStore.getState().addToCart(testItem);
        const { cart } = useCartStore.getState();
        expect(cart).toHaveLength(1);
        expect(cart[0].name).toBe('Test Item');
    });

    it('should increase quantity when adding duplicate item', () => {
        useCartStore.getState().addToCart(testItem);
        useCartStore.getState().addToCart({ ...testItem, cartItemId: '1' });
        const { cart } = useCartStore.getState();
        expect(cart).toHaveLength(1);
        expect(cart[0].quantity).toBe(2);
    });

    it('should update quantity', () => {
        useCartStore.getState().addToCart(testItem);
        useCartStore.getState().updateQuantity('1', 5);
        const { cart } = useCartStore.getState();
        expect(cart[0].quantity).toBe(5);
    });

    it('should remove item when quantity reaches 0', () => {
        useCartStore.getState().addToCart(testItem);
        useCartStore.getState().updateQuantity('1', 0);
        const { cart } = useCartStore.getState();
        expect(cart).toHaveLength(0);
    });

    it('should clear cart', () => {
        useCartStore.getState().addToCart(testItem);
        useCartStore.getState().addToCart({ id: '2', name: 'Item 2', price: 50, quantity: 1 });
        useCartStore.getState().clearCart();
        const { cart } = useCartStore.getState();
        expect(cart).toHaveLength(0);
    });

    it('should handle multiple items independently', () => {
        useCartStore.getState().addToCart(testItem);
        useCartStore.getState().addToCart({ id: '2', name: 'Item 2', price: 50, quantity: 1 });
        useCartStore.getState().updateQuantity('1', 3);
        const { cart } = useCartStore.getState();
        expect(cart).toHaveLength(2);
        expect(cart.find(i => i.id === '1')?.quantity).toBe(3);
        expect(cart.find(i => i.id === '2')?.quantity).toBe(1);
    });
});
