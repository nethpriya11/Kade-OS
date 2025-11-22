import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useOfflineStore = create(
    persist(
        (set, get) => ({
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
            partialize: (state) => ({ offlineQueue: state.offlineQueue }), // Only persist the queue
        }
    )
);
