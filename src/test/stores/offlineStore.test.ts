import { describe, it, expect, beforeEach } from 'vitest';
import { useOfflineStore } from '../../store/offlineStore';

beforeEach(() => {
    useOfflineStore.setState({ isOnline: true, offlineQueue: [] });
});

describe('offlineStore', () => {
    it('should start online with empty queue', () => {
        const { isOnline, offlineQueue } = useOfflineStore.getState();
        expect(isOnline).toBe(true);
        expect(offlineQueue).toEqual([]);
    });

    it('should set online status', () => {
        useOfflineStore.getState().setOnlineStatus(false);
        expect(useOfflineStore.getState().isOnline).toBe(false);
    });

    it('should add order to queue', () => {
        const order = { id: '1', total_amount: 100 };
        useOfflineStore.getState().addToQueue(order as never);
        const { offlineQueue } = useOfflineStore.getState();
        expect(offlineQueue).toHaveLength(1);
        expect(offlineQueue[0].queuedAt).toBeDefined();
    });

    it('should remove order from queue by timestamp', () => {
        const order = { id: '1', total_amount: 100 };
        useOfflineStore.getState().addToQueue(order as never);
        const timestamp = useOfflineStore.getState().offlineQueue[0].queuedAt;
        useOfflineStore.getState().removeFromQueue(timestamp);
        expect(useOfflineStore.getState().offlineQueue).toHaveLength(0);
    });

    it('should clear queue', () => {
        useOfflineStore.getState().addToQueue({ id: '1' } as never);
        useOfflineStore.getState().addToQueue({ id: '2' } as never);
        useOfflineStore.getState().clearQueue();
        expect(useOfflineStore.getState().offlineQueue).toHaveLength(0);
    });

    it('should persist multiple orders', () => {
        useOfflineStore.getState().addToQueue({ id: '1' } as never);
        useOfflineStore.getState().addToQueue({ id: '2' } as never);
        useOfflineStore.getState().addToQueue({ id: '3' } as never);
        expect(useOfflineStore.getState().offlineQueue).toHaveLength(3);
    });
});
