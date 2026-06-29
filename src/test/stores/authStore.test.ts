import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
            onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
            signOut: vi.fn().mockResolvedValue({ error: null }),
        },
        from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn() }),
    },
}));

beforeEach(async () => {
    const { useAuthStore } = await import('../../store/authStore');
    useAuthStore.setState({ user: null, profile: null, loading: false });
});

describe('authStore', () => {
    it('should start with default state', async () => {
        const { useAuthStore } = await import('../../store/authStore');
        const { user, profile, loading } = useAuthStore.getState();
        expect(user).toBeNull();
        expect(profile).toBeNull();
        expect(loading).toBe(false);
    });

    it('should update user and profile via setState', async () => {
        const { useAuthStore } = await import('../../store/authStore');
        const mockUser = { id: '1', email: 'test@test.com' };
        useAuthStore.setState({ user: mockUser as never });
        expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('should update profile via setState', async () => {
        const { useAuthStore } = await import('../../store/authStore');
        const mockProfile = { id: '1', full_name: 'Test User', role: 'admin' };
        useAuthStore.setState({ profile: mockProfile as never });
        expect(useAuthStore.getState().profile?.full_name).toBe('Test User');
    });

    it('should sign out and clear state', async () => {
        const { useAuthStore } = await import('../../store/authStore');
        useAuthStore.setState({ user: { id: '1' } as never, profile: { id: '1' } as never });
        await useAuthStore.getState().signOut();
        const { user, profile } = useAuthStore.getState();
        expect(user).toBeNull();
        expect(profile).toBeNull();
    });

    it('should set loading true during initialize', async () => {
        const { useAuthStore } = await import('../../store/authStore');
        useAuthStore.getState().initialize();
        expect(useAuthStore.getState().loading).toBe(true);
    });
});
