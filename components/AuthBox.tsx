'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Props = { onAdminChange: (isAdmin: boolean) => void };

const inputClass = 'w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900';

export default function AuthBox({ onAdminChange }: Props) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function refresh(sessionEmail: string | null) {
      setUserEmail(sessionEmail);
      if (!sessionEmail) {
        onAdminChange(false);
        return;
      }
      const { data } = await supabase.rpc('is_admin');
      onAdminChange(data === true);
    }

    supabase.auth.getSession().then(({ data }) => refresh(data.session?.user.email ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // run outside the auth callback to avoid blocking the auth client
      setTimeout(() => refresh(session?.user.email ?? null), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [onAdminChange]);

  async function signIn() {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setPassword('');
    setOpen(false);
  }

  return (
    <div className="absolute right-14 top-2.5 z-10 rounded bg-white p-2 text-sm text-gray-900 shadow">
      {userEmail ? (
        <div className="flex items-center gap-3">
          <span className="max-w-40 truncate text-gray-600">{userEmail}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded border border-gray-300 px-2 py-0.5 hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      ) : open ? (
        <div className="w-56 space-y-2">
          <input
            type="email"
            placeholder="Email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && signIn()}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={signIn}
              disabled={busy}
              className="rounded bg-sky-600 px-3 py-1 text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {busy ? '…' : 'Log in'}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="font-medium text-sky-700 hover:underline">
          Admin login
        </button>
      )}
    </div>
  );
}
