import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useInventoryStore } from '../store/inventoryStore';
import { toast } from 'sonner';

const RealtimeManager = () => {
    const { setIngredients, setLogs, addLog, updateIngredient, addIngredient, deleteIngredient } = useInventoryStore();

    const fetchInitialData = async () => {
        const { data: ingredients } = await supabase
            .from('ingredients')
            .select('*')
            .order('name', { ascending: true });

        if (ingredients) setIngredients(ingredients as any[]);

        const { data: logs } = await supabase
            .from('restock_logs')
            .select('*, ingredients(name, unit), suppliers(name)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (logs) setLogs(logs as any[]);
    };

    useEffect(() => {
        fetchInitialData();

        const ingredientSubscription = supabase
            .channel('ingredients-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    addIngredient(payload.new as any);
                } else if (payload.eventType === 'UPDATE') {
                    updateIngredient((payload.new as any).id, payload.new as any);
                } else if (payload.eventType === 'DELETE') {
                    deleteIngredient((payload.old as any).id);
                }
            })
            .subscribe();

        const logsSubscription = supabase
            .channel('logs-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'restock_logs' }, async (payload) => {
                const { data } = await supabase
                    .from('restock_logs')
                    .select('*, ingredients(name, unit), suppliers(name)')
                    .eq('id', (payload.new as any).id)
                    .single();

                if (data) {
                    addLog(data as any);
                    toast.info(`New Restock: ${(data as any).ingredients?.name} (+${(data as any).quantity}${(data as any).ingredients?.unit})`);
                }
            })
            .subscribe();

        return () => {
            ingredientSubscription.unsubscribe();
            logsSubscription.unsubscribe();
        };
    }, [addIngredient, addLog, deleteIngredient, fetchInitialData, updateIngredient]);

    return null;
};

export default RealtimeManager;
