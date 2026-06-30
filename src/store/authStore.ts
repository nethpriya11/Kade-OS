import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { logAuthAction } from '../lib/auditLog';

export interface Profile {
    id: string;
    full_name: string;
    username: string;
    role: string;
    created_at?: string;
    updated_at?: string;
}

interface AuthState {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    initialize: () => Promise<void>;
    signOut: () => Promise<void>;
}

    let _authListener: { data: { subscription: { unsubscribe: () => void } } } | null = null;

const handleAuthChange = async (_event: AuthChangeEvent, session: Session | null) => {
    if (session) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single<Profile>();
        useAuthStore.setState({ user: session.user, profile, loading: false });
    } else {
        useAuthStore.setState({ user: null, profile: null, loading: false });
    }
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    profile: null,
    loading: true,

    initialize: async () => {
        set({ loading: true });

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single<Profile>();

                set({ user: session.user, profile, loading: false });
            } else {
                set({ user: null, profile: null, loading: false });
            }
        } catch {
            set({ user: null, profile: null, loading: false });
        }

        if (_authListener) {
            _authListener.data.subscription.unsubscribe();
        }
        _authListener = supabase.auth.onAuthStateChange(handleAuthChange) as typeof _authListener;
    },

    signOut: async () => {
        const state = useAuthStore.getState();
        logAuthAction(state.user?.id, 'logout');
        await supabase.auth.signOut();
        set({ user: null, profile: null });
    }
}));
