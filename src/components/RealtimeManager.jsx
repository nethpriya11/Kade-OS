import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useInventoryStore } from '../store/inventoryStore';
import { toast } from 'sonner';

const RealtimeManager = () => {
    const { setIngredients, setLogs, addLog, updateIngredient, addIngredient, deleteIngredient } = useInventoryStore();

    useEffect(() => {
        // Initial Fetch
        fetchInitialData();

        // Subscribe to Ingredients
        const ingredientSubscription = supabase
            .channel('ingredients-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    addIngredient(payload.new);
                } else if (payload.eventType === 'UPDATE') {
                    updateIngredient(payload.new.id, payload.new);
                } else if (payload.eventType === 'DELETE') {
                    deleteIngredient(payload.old.id);
                }
            })
            .subscribe();

        // Subscribe to Restock Logs
        const logsSubscription = supabase
            .channel('logs-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'restock_logs' }, async (payload) => {
                // We need to fetch the related ingredient name for the log
                // Since payload.new only has the raw data
                const { data, error } = await supabase
                    .from('restock_logs')
                    .select('*, ingredients(name, unit)')
                    .eq('id', payload.new.id)
                    .single();

                if (data) {
                    addLog(data);
                    toast.info(`New Restock: ${data.ingredients?.name} (+${data.quantity}${data.ingredients?.unit})`);
                }
            })
            .subscribe();

        return () => {
            ingredientSubscription.unsubscribe();
            logsSubscription.unsubscribe();
        };
    }, []);

    const fetchInitialData = async () => {
        // Fetch Ingredients
        const { data: ingredients } = await supabase
            .from('ingredients')
            .select('*')
            .order('name', { ascending: true });

        if (ingredients) setIngredients(ingredients);

        // Fetch Logs (Last 50)
        const { data: logs } = await supabase
            .from('restock_logs')
            .select('*, ingredients(name, unit)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (logs) setLogs(logs);
    };

    return null; // This component doesn't render anything visible
};

export default RealtimeManager;
