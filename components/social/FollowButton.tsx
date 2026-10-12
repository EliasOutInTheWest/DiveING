'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

type Props = {
  targetId: string;
  following: boolean;
  onChange: (next: boolean) => void;
  small?: boolean;
};

export default function FollowButton({ targetId, following, onChange, small }: Props) {
  const { user, isVerified, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  if (loading || user?.id === targetId) return null;

  async function toggle() {
    setMsg('');
    if (!user) {
      setMsg('Log in to follow people.');
      return;
    }
    if (!isVerified) {
      setMsg('Confirm your email first.');
      return;
    }
    setBusy(true);
    const next = !following;
    onChange(next); // shown at once
    const res = next
      ? await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId })
      : await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
    setBusy(false);
    // 23505 = already following: fine
    if (res.error && res.error.code !== '23505') {
      onChange(!next);
      setMsg('Could not save. Please try again.');
    }
  }

  const pad = small ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm';
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={following}
        className={`rounded-full font-semibold transition-colors disabled:opacity-60 ${pad} ${
          following
            ? 'border border-gray-300 bg-white text-gray-800 hover:border-red-300 hover:text-red-600'
            : 'bg-sky-600 text-white hover:bg-sky-700'
        }`}
      >
        {following ? 'Following' : 'Follow'}
      </button>
      {msg && (
        <span role="status" className="text-xs text-amber-700">
          {msg}
        </span>
      )}
    </span>
  );
}
