import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface DashboardData {
    dailyRevenue: number;
    orderCount: number;
    lowStockCount: number;
    pendingOrders: number;
    weekRevenue: number;
    lastWeekRevenue: number;
    topItem: { name: string; count: number } | null;
    staffOnDuty: number;
}

const getStartOfBusinessDay = (): Date => {
    const now = new Date();
    const start = new Date(now);
    if (now.getHours() < 4) start.setDate(now.getDate() - 1);
    start.setHours(4, 0, 0, 0);
    return start;
};

export function useDashboardData(): { data: DashboardData | undefined; isLoading: boolean; error: Error | null } {
    return useQuery({
        queryKey: ['dashboard'],
        queryFn: async (): Promise<DashboardData> => {
            const now = new Date();
            const startOfDay = getStartOfBusinessDay().toISOString();

            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - 7);
            weekStart.setHours(4, 0, 0, 0);

            const lastWeekStart = new Date(weekStart);
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);

            const [ordersRes, lowStockRes, pendingRes, weekOrdersRes, lastWeekRes, staffRes] = await Promise.all([
                supabase.from('orders').select('total_amount, order_items(*, menu_items(name))').gte('created_at', startOfDay).eq('status', 'completed'),
                supabase.from('ingredients').select('*', { count: 'exact', head: true }).lt('current_stock', 5),
                supabase.from('orders').select('*', { count: 'exact', head: true }).neq('status', 'completed').neq('status', 'cancelled'),
                supabase.from('orders').select('total_amount').gte('created_at', weekStart.toISOString()).eq('status', 'completed'),
                supabase.from('orders').select('total_amount').gte('created_at', lastWeekStart.toISOString()).lt('created_at', weekStart.toISOString()).eq('status', 'completed'),
                supabase.from('shifts').select('user_id').is('clock_out', null),
            ]);

            const orders = (ordersRes.data as { total_amount: number; order_items: { menu_items: { name: string } | null; quantity: number }[] | null }[]) || [];
            const dailyRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

            const itemMap: Record<string, number> = {};
            orders.forEach(o => o.order_items?.forEach(item => {
                const name = item.menu_items?.name || 'Unknown';
                itemMap[name] = (itemMap[name] || 0) + item.quantity;
            }));
            const top = Object.entries(itemMap).sort(([, a], [, b]) => b - a)[0];
            const topItem = top ? { name: top[0], count: top[1] } : null;

            const weekRevenue = ((weekOrdersRes.data as { total_amount: number }[]) || []).reduce((s, o) => s + Number(o.total_amount || 0), 0);
            const lastWeekRevenue = ((lastWeekRes.data as { total_amount: number }[]) || []).reduce((s, o) => s + Number(o.total_amount || 0), 0);

            return {
                dailyRevenue,
                orderCount: orders.length,
                lowStockCount: lowStockRes.count || 0,
                pendingOrders: pendingRes.count || 0,
                weekRevenue,
                lastWeekRevenue,
                topItem,
                staffOnDuty: (staffRes.data || []).length,
            };
        },
        staleTime: 15_000,
    });
}
