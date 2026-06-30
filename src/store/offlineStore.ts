import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QueuedOrder {
    queuedAt?: string;
    [key: string]: unknown;
}

interface OfflineState {
    isOnline: boolean;
    offlineQueue: QueuedOrder[];
    setOnlineStatus: (status: boolean) => void;
    addToQueue: (order: QueuedOrder) => void;
    removeFromQueue: (timestamp: string) => void;
    clearQueue: () => void;
}

export const useOfflineStore = create<OfflineState>()(
    persist(
        (set) => ({
            isOnline: navigator.onLine,
            offlineQueue: [],

            setOnlineStatus: (status) => set({ isOnline: status }),

            addToQueue: (order) => set((state) => ({
                offlineQueue: [...state.offlineQueue, { ...order, queuedAt: new Date().toISOString() }]
            })),

            removeFromQueue: (timestamp) => set((state) => ({
                offlineQueue: state.offlineQueue.filter(order => order.queuedAt !== timestamp)
            })),

            clearQueue: () => set({ offlineQueue: [] }),
        }),
        {
            name: 'kade-offline-storage',
            partialize: (state: OfflineState) => ({ offlineQueue: state.offlineQueue }),
        }
    )
);
