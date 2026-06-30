import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useInventoryStore } from '../store/inventoryStore';
import type { Tables } from '../lib/database.types';
import { toast } from 'sonner';

type IngredientRow = Tables['ingredients']['Row'];
type RestockLogRow = Tables['restock_logs']['Row'] & {
    ingredients?: { name: string; unit: string } | null;
    suppliers?: { name: string } | null;
};

const RealtimeManager = () => {
    const { setIngredients, setLogs, addLog, updateIngredient, addIngredient, deleteIngredient } = useInventoryStore();

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: ingredients } = await supabase
                .from('ingredients')
                .select('*')
                .order('name', { ascending: true });

            if (ingredients) setIngredients(ingredients as unknown as Parameters<typeof setIngredients>[0]);

            const { data: logs } = await supabase
                .from('restock_logs')
                .select('*, ingredients(name, unit), suppliers(name)')
                .order('created_at', { ascending: false })
                .limit(50);

            if (logs) setLogs(logs as unknown as Parameters<typeof setLogs>[0]);
        };

        fetchInitialData();

        const ingredientSubscription = supabase
            .channel('ingredients-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, (payload) => {
                const row = payload.new as IngredientRow;
                if (payload.eventType === 'INSERT') {
                    addIngredient(row as unknown as Parameters<typeof addIngredient>[0]);
                } else if (payload.eventType === 'UPDATE') {
                    updateIngredient(row.id, row as unknown as Parameters<typeof updateIngredient>[1]);
                } else if (payload.eventType === 'DELETE') {
                    deleteIngredient((payload.old as IngredientRow).id);
                }
            })
            .subscribe();

        const logsSubscription = supabase
            .channel('logs-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'restock_logs' }, async (payload) => {
                const { data } = await supabase
                    .from('restock_logs')
                    .select('*, ingredients(name, unit), suppliers(name)')
                    .eq('id', (payload.new as RestockLogRow).id)
                    .single();

                if (data) {
                    const log = data as unknown as Parameters<typeof addLog>[0];
                    addLog(log);
                    const restock = data as RestockLogRow;
                    toast.info(`New Restock: ${restock.ingredients?.name} (+${restock.quantity}${restock.ingredients?.unit ?? ''})`);
                }
            })
            .subscribe();

        return () => {
            ingredientSubscription.unsubscribe();
            logsSubscription.unsubscribe();
        };
    }, [addIngredient, addLog, deleteIngredient, updateIngredient, setIngredients, setLogs]);

    return null;
};

export default RealtimeManager;
