import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuthStore } from '../../store/authStore';

let mockSessionData: { data: { session: object | null } } = { data: { session: null } };

vi.mock('../../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockImplementation(() => Promise.resolve(mockSessionData)),
            onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
            signOut: vi.fn().mockResolvedValue({ error: null }),
        },
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: '1', full_name: 'Test', username: 'test', role: 'admin' }, error: null }),
        }),
    },
}));

beforeEach(() => {
    useAuthStore.setState({ user: null, loading: true, profile: null });
    mockSessionData = { data: { session: null } };
});

describe('ProtectedRoute', () => {
    it('should show loading spinner when loading', () => {
        render(
            <MemoryRouter>
                <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
            </MemoryRouter>
        );
        expect(document.querySelector('.lucide-loader')).toBeInTheDocument();
    });

    it('should redirect to login when not authenticated', async () => {
        useAuthStore.setState({ loading: false, user: null });
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
            </MemoryRouter>
        );
        await vi.waitFor(() => {
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });
    });

    it('should render children when authenticated', async () => {
        mockSessionData = {
            data: {
                session: { user: { id: '1', email: 'test@test.com' }, access_token: 'token', refresh_token: 'refresh' },
            },
        };
        render(
            <MemoryRouter>
                <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
            </MemoryRouter>
        );
        await vi.waitFor(() => {
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });
    });
});
