'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthState = {
  user: User | null;
  username: string | null;
  isAdmin: boolean;
  loading: boolean;
};

const initial: AuthState = { user: null, username: null, isAdmin: false, loading: true };

const AuthContext = createContext<AuthState>(initial);

// Use this in any component: const { user, username, isAdmin } = useAuth();
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initial);

  useEffect(() => {
    let cancelled = false;

    async function load(user: User | null) {
      if (!user) {
        if (!cancelled) setState({ user: null, username: null, isAdmin: false, loading: false });
        return;
      }
      const [profileRes, adminRes] = await Promise.all([
        supabase.from('profiles').select('username').eq('id', user.id).maybeSingle(),
        supabase.rpc('is_admin'),
      ]);
      if (cancelled) return;
      setState({
        user,
        username: profileRes.data?.username ?? null,
        isAdmin: adminRes.data === true,
        loading: false,
      });
    }

    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // run outside the auth callback to avoid blocking the auth client
      setTimeout(() => load(session?.user ?? null), 0);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
