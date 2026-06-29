import { describe, it, expect, beforeEach } from 'vitest';
import { useInventoryStore } from '../../store/inventoryStore';

const mockIngredient = {
    id: '1',
    name: 'Tomato',
    category: 'Produce',
    quantity: 10,
    unit: 'kg',
    purchase_price: 3.5,
};

beforeEach(() => {
    useInventoryStore.setState({ ingredients: [], logs: [], loading: true });
});

describe('inventoryStore', () => {
    it('should start with empty state', () => {
        const { ingredients, logs, loading } = useInventoryStore.getState();
        expect(ingredients).toEqual([]);
        expect(logs).toEqual([]);
        expect(loading).toBe(true);
    });

    it('should set ingredients and clear loading', () => {
        useInventoryStore.getState().setIngredients([mockIngredient]);
        const { ingredients, loading } = useInventoryStore.getState();
        expect(ingredients).toHaveLength(1);
        expect(ingredients[0].name).toBe('Tomato');
        expect(loading).toBe(false);
    });

    it('should add ingredient', () => {
        useInventoryStore.getState().addIngredient(mockIngredient);
        const { ingredients } = useInventoryStore.getState();
        expect(ingredients).toHaveLength(1);
    });

    it('should not add duplicate ingredient', () => {
        useInventoryStore.getState().addIngredient(mockIngredient);
        useInventoryStore.getState().addIngredient(mockIngredient);
        const { ingredients } = useInventoryStore.getState();
        expect(ingredients).toHaveLength(1);
    });

    it('should update ingredient', () => {
        useInventoryStore.getState().addIngredient(mockIngredient);
        useInventoryStore.getState().updateIngredient('1', { quantity: 5 });
        const { ingredients } = useInventoryStore.getState();
        expect(ingredients[0].quantity).toBe(5);
    });

    it('should delete ingredient', () => {
        useInventoryStore.getState().addIngredient(mockIngredient);
        useInventoryStore.getState().addIngredient({
            ...mockIngredient, id: '2', name: 'Onion'
        });
        useInventoryStore.getState().deleteIngredient('1');
        const { ingredients } = useInventoryStore.getState();
        expect(ingredients).toHaveLength(1);
        expect(ingredients[0].name).toBe('Onion');
    });

    it('should add log entry', () => {
        const log = {
            id: '1', ingredient_id: '1', change: -2,
            reason: 'Used in cooking', created_at: new Date().toISOString()
        };
        useInventoryStore.getState().addLog(log);
        const { logs } = useInventoryStore.getState();
        expect(logs).toHaveLength(1);
        expect(logs[0].change).toBe(-2);
    });

    it('should prepend logs', () => {
        useInventoryStore.getState().addLog({ id: '1' } as never);
        useInventoryStore.getState().addLog({ id: '2' } as never);
        const { logs } = useInventoryStore.getState();
        expect(logs[0].id).toBe('2');
    });

    it('should set logs', () => {
        const logs = [{ id: '1', ingredient_id: '1', change: -2, reason: 'test', created_at: '' }];
        useInventoryStore.getState().setLogs(logs);
        expect(useInventoryStore.getState().logs).toHaveLength(1);
    });
});
