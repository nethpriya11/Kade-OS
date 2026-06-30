import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useMenuItems() {
    return useQuery({
        queryKey: ['menu_items'],
        queryFn: async () => {
            const { data } = await supabase.from('menu_items').select('*').eq('is_available', true).order('category');
            return data ?? [];
        },
    });
}

export function useIngredients() {
    return useQuery({
        queryKey: ['ingredients'],
        queryFn: async () => {
            const { data } = await supabase.from('ingredients').select('*').order('name');
            return data ?? [];
        },
    });
}

export function useOrders() {
    return useQuery({
        queryKey: ['orders'],
        queryFn: async () => {
            const { data } = await supabase.from('orders').select('*, order_items(*, menu_items(name))').order('created_at', { ascending: false });
            return data ?? [];
        },
    });
}

export function useTables() {
    return useQuery({
        queryKey: ['restaurant_tables'],
        queryFn: async () => {
            const { data } = await supabase.from('restaurant_tables').select('*').order('table_number');
            return data ?? [];
        },
    });
}

export function useSuppliers() {
    return useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const { data } = await supabase.from('suppliers').select('*').order('name');
            return data ?? [];
        },
    });
}

export function useShifts() {
    return useQuery({
        queryKey: ['shifts'],
        queryFn: async () => {
            const { data } = await supabase.from('shifts').select('*, profiles(username, full_name)').order('clock_in', { ascending: false });
            return data ?? [];
        },
    });
}

export function useSettings() {
    return useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const { data } = await supabase.from('settings').select('*');
            const map: Record<string, string> = {};
            (data ?? []).forEach(s => { map[s.key] = s.value; });
            return map;
        },
    });
}

export function useLowStockIngredients() {
    return useQuery({
        queryKey: ['ingredients', 'low_stock'],
        queryFn: async () => {
            const { data } = await supabase.from('ingredients').select('*').lt('current_stock', 5);
            return data ?? [];
        },
    });
}
