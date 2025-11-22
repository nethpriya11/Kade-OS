import React, { useEffect, useState } from 'react';
import { useOfflineStore } from '../store/offlineStore';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SyncManager = () => {
    const { isOnline, setOnlineStatus, offlineQueue, removeFromQueue } = useOfflineStore();
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setOnlineStatus(true);
            toast.success('Back online! Syncing data...');
            processQueue();
        };

        const handleOffline = () => {
            setOnlineStatus(false);
            toast.warning('You are offline. Orders will be saved locally.');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Attempt to sync whenever queue changes and we are online
    useEffect(() => {
        if (isOnline && offlineQueue.length > 0 && !isSyncing) {
            processQueue();
        }
    }, [isOnline, offlineQueue.length]);

    const processQueue = async () => {
        if (offlineQueue.length === 0 || isSyncing) return;

        setIsSyncing(true);
        let syncedCount = 0;

        // Process sequentially to ensure order
        for (const orderData of offlineQueue) {
            try {
                // 1. Create Order
                const { data: order, error: orderError } = await supabase
                    .from('orders')
                    .insert([{
                        total_amount: orderData.total_amount,
                        status: 'pending', // Always pending when first synced
                        created_at: orderData.created_at // Preserve original timestamp
                    }])
                    .select()
                    .single();

                if (orderError) throw orderError;

                // 2. Create Order Items
                const orderItems = orderData.items.map(item => ({
                    order_id: order.id,
                    menu_item_id: item.id,
                    quantity: item.quantity,
                    price_at_time: item.price
                }));

                const { error: itemsError } = await supabase
                    .from('order_items')
                    .insert(orderItems);

                if (itemsError) throw itemsError;

                // 3. Remove from queue on success
                removeFromQueue(orderData.queuedAt);
                syncedCount++;

            } catch (error) {
                console.error('Sync failed for order:', error);
                // Keep in queue to retry later
            }
        }

        setIsSyncing(false);
        if (syncedCount > 0) {
            toast.success(`Synced ${syncedCount} offline orders!`);
        }
    };

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-6 right-6 z-50 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 font-bold"
                >
                    <WifiOff size={20} />
                    <span>Offline Mode</span>
                    {offlineQueue.length > 0 && (
                        <span className="bg-white/20 px-2 py-0.5 rounded-md text-sm">
                            {offlineQueue.length} pending
                        </span>
                    )}
                </motion.div>
            )}

            {isOnline && offlineQueue.length > 0 && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-6 right-6 z-50 bg-yellow-500 text-black px-6 py-3 rounded-full shadow-lg flex items-center gap-3 font-bold"
                >
                    <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
                    <span>Syncing {offlineQueue.length} orders...</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SyncManager;
