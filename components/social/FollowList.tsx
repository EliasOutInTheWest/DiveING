'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PEOPLE_PAGE, listFollows, type Person } from '@/lib/people';
import PersonRow from '@/components/social/PersonRow';

type Kind = 'followers' | 'following';
type Props = { userId: string; username: string; initial: Kind; hidden: boolean; onClose: () => void };

// Pop-up with the followers / following of one person
export default function FollowList({ userId, username, initial, hidden, onClose }: Props) {
  const [kind, setKind] = useState<Kind>(initial);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const run = useRef(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(
    async (k: Kind, offset: number) => {
      const id = ++run.current;
      setLoading(true);
      setError('');
      const res = await listFollows(userId, k, offset);
      if (id !== run.current) return;
      setLoading(false);
      if (res.error) {
        setError('Could not load this list.');
        return;
      }
      setPeople((prev) => (offset === 0 ? res.data : [...prev, ...res.data]));
      setMore(res.data.length === PEOPLE_PAGE);
    },
    [userId]
  );

  useEffect(() => {
    setPeople([]);
    if (hidden) {
      setLoading(false);
      return;
    }
    load(kind, 0);
  }, [kind, hidden, load]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tab = (k: Kind, label: string) => (
    <button
      role="tab"
      aria-selected={kind === k}
      onClick={() => setKind(k)}
      className={`flex-1 border-b-2 py-2 text-sm font-semibold ${
        kind === k ? 'border-sky-600 text-sky-700' : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Followers and following of ${username}`}
        className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between px-4 pt-3">
          <h2 className="font-semibold">@{username}</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="rounded px-2 text-2xl leading-none text-gray-500 hover:bg-gray-100"
          >
            ×
          </button>
        </div>
        <div role="tablist" className="mt-1 flex border-b border-gray-200 px-4">
          {tab('followers', 'Followers')}
          {tab('following', 'Following')}
        </div>
        <div className="overflow-y-auto px-4 pb-4">
          {hidden ? (
            <p className="py-8 text-center text-sm text-gray-500">@{username} keeps this list private.</p>
          ) : (
            <>
              {error && <p className="py-4 text-sm text-red-600">{error}</p>}
              {!loading && !error && people.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-500">
                  {kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                </p>
              )}
              <ul className="divide-y divide-gray-100">
                {people.map((p) => (
                  <PersonRow key={p.id} person={p} onNavigate={onClose} />
                ))}
              </ul>
              {loading && <p className="py-4 text-center text-sm text-gray-500">Loading…</p>}
              {!loading && more && (
                <button
                  onClick={() => load(kind, people.length)}
                  className="mx-auto mt-2 block rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium hover:bg-gray-50"
                >
                  Show more
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
