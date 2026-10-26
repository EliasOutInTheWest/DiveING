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
import { cleanActivities, readStoredActivities, storeActivities } from '@/lib/activities';
import { checkProgress } from '@/lib/progress';
import { NO_ACCESS, type Access } from '@/lib/billing';
import ProgressToaster from '@/components/progress/ProgressToaster';

type AuthData = {
  user: User | null;
  username: string | null;
  isAdmin: boolean;
  isVerified: boolean; // email confirmed
  schoolIds: string[]; // schools this user is staff of
  activities: string[]; // favourite activities, empty = show everything
  access: Access; // plan: free account, Plus (trial / paid) or admin
  canPostMedia: boolean; // may post photos and videos (Plus or admin)
  loading: boolean;
};

type AuthState = AuthData & {
  refresh: () => Promise<void>;
  setActivities: (next: string[]) => Promise<void>; // saves to the profile (or to this browser when logged out)
};

const initial: AuthData = {
  user: null,
  username: null,
  isAdmin: false,
  isVerified: false,
  schoolIds: [],
  activities: [],
  access: NO_ACCESS,
  canPostMedia: false,
  loading: true,
};

const AuthContext = createContext<AuthState>({ ...initial, refresh: async () => {}, setActivities: async () => {} });

// Use this in any component: const { user, username, isAdmin, isVerified, schoolIds, activities, refresh } = useAuth();
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthData>(initial);

  const load = useCallback(async (user: User | null) => {
    if (!user) {
      setState({ ...initial, activities: readStoredActivities(), loading: false });
      return;
    }
    const [profileRes, adminRes, memberRes, accessRes] = await Promise.all([
      supabase.from('profiles').select('username,activities').eq('id', user.id).maybeSingle(),
      supabase.rpc('is_admin'),
      supabase.from('school_members').select('school_id').eq('user_id', user.id),
      supabase.rpc('my_access'), // needs subscription.sql
    ]);
    const access: Access = accessRes.error || !accessRes.data ? { ...NO_ACCESS, registered: true } : (accessRes.data as Access);
    // if the database update (activities.sql) was not run yet, still load the username
    let profile = profileRes.data as { username: string; activities?: unknown } | null;
    if (profileRes.error) {
      const { data } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle();
      profile = data as { username: string } | null;
    }
    setState({
      user,
      username: profile?.username ?? null,
      isAdmin: adminRes.data === true,
      isVerified: !!user.email_confirmed_at,
      schoolIds: ((memberRes.data as { school_id: string }[] | null) ?? []).map((r) => r.school_id),
      activities: cleanActivities(profile?.activities),
      access,
      canPostMedia: adminRes.data === true || access.can_post_media === true,
      loading: false,
    });
  }, []);

  // reload username / roles, e.g. after the profile was edited
  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await load(data.session?.user ?? null);
  }, [load]);

  // choose favourite activities: shown at once, then saved
  const uid = state.user?.id;
  const setActivities = useCallback(
    async (next: string[]) => {
      const clean = cleanActivities(next);
      setState((prev) => ({ ...prev, activities: clean }));
      if (!uid) {
        storeActivities(clean);
        return;
      }
      const { error } = await supabase.from('profiles').update({ activities: clean }).eq('id', uid);
      if (error) {
        console.error('activities error:', error.message);
        await refresh(); // go back to what is really saved
      }
    },
    [uid, refresh]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // run outside the auth callback to avoid blocking the auth client
      setTimeout(() => load(session?.user ?? null), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  // hand out achievements earned while away (new followers, likes), at most every 10 minutes
  useEffect(() => {
    if (!uid) return;
    try {
      const last = Number(window.sessionStorage.getItem('dv-progress-sync') ?? 0);
      if (Date.now() - last < 10 * 60 * 1000) return;
      window.sessionStorage.setItem('dv-progress-sync', String(Date.now()));
    } catch {
      // no storage: just sync
    }
    const t = window.setTimeout(() => void checkProgress(), 2500);
    return () => window.clearTimeout(t);
  }, [uid]);

  const value = useMemo(() => ({ ...state, refresh, setActivities }), [state, refresh, setActivities]);
  return (
    <AuthContext.Provider value={value}>
      {children}
      <ProgressToaster />
    </AuthContext.Provider>
  );
}
