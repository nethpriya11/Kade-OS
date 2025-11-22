import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set) => ({
    user: null,
    profile: null,
    loading: true,

    initialize: async () => {
        set({ loading: true });

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            set({ user: session.user, profile, loading: false });
        } else {
            set({ user: null, profile: null, loading: false });
        }

        // Listen for changes
        supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                set({ user: session.user, profile, loading: false });
            } else {
                set({ user: null, profile: null, loading: false });
            }
        });
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null });
    }
}));
