'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthData = {
  user: User | null;
  username: string | null;
  isAdmin: boolean;
  isVerified: boolean; // email confirmed
  schoolIds: string[]; // schools this user is staff of
  loading: boolean;
};

type AuthState = AuthData & { refresh: () => Promise<void> };

const initial: AuthData = {
  user: null,
  username: null,
  isAdmin: false,
  isVerified: false,
  schoolIds: [],
  loading: true,
};

const AuthContext = createContext<AuthState>({ ...initial, refresh: async () => {} });

// Use this in any component: const { user, username, isAdmin, isVerified, schoolIds, refresh } = useAuth();
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthData>(initial);

  const load = useCallback(async (user: User | null) => {
    if (!user) {
      setState({ ...initial, loading: false });
      return;
    }
    const [profileRes, adminRes, memberRes] = await Promise.all([
      supabase.from('profiles').select('username').eq('id', user.id).maybeSingle(),
      supabase.rpc('is_admin'),
      supabase.from('school_members').select('school_id').eq('user_id', user.id),
    ]);
    setState({
      user,
      username: profileRes.data?.username ?? null,
      isAdmin: adminRes.data === true,
      isVerified: !!user.email_confirmed_at,
      schoolIds: ((memberRes.data as { school_id: string }[] | null) ?? []).map((r) => r.school_id),
      loading: false,
    });
  }, []);

  // reload username / roles, e.g. after the profile was edited
  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await load(data.session?.user ?? null);
  }, [load]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // run outside the auth callback to avoid blocking the auth client
      setTimeout(() => load(session?.user ?? null), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const value = useMemo(() => ({ ...state, refresh }), [state, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
