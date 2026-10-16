'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { PEOPLE_PAGE, searchPeople, type Person } from '@/lib/people';
import PersonRow from '@/components/social/PersonRow';

// Search box + results. With no search text it suggests people you do not follow yet.
export default function PeopleSearch() {
  const { user, loading: authLoading } = useAuth();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const run = useRef(0);

  // wait a moment after typing
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(text.trim()), 300);
    return () => window.clearTimeout(t);
  }, [text]);

  const uid = user?.id;
  const load = useCallback(
    async (q: string, offset: number) => {
      const id = ++run.current;
      setLoading(true);
      setError('');
      const res = await searchPeople(q, offset);
      if (id !== run.current) return; // a newer search is already running
      setLoading(false);
      if (res.error) {
        setError('Could not load people. Did you run social.sql in Supabase?');
        return;
      }
      setPeople((prev) => (offset === 0 ? res.data : [...prev, ...res.data]));
      setMore(res.data.length === PEOPLE_PAGE);
    },
    []
  );

  useEffect(() => {
    if (authLoading) return;
    setPeople([]);
    load(query, 0);
  }, [query, authLoading, uid, load]);

  const searching = query !== '';
  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Search people</span>
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search by username or name"
          autoFocus
          className="w-full rounded-full border border-gray-300 bg-white py-2.5 pl-11 pr-4 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        />
        <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          🔎
        </span>
      </label>

      <h2 className="mb-1 mt-6 text-sm font-semibold text-gray-700">
        {searching ? `Results for “${query}”` : user ? 'People you may like' : 'People on DiveING'}
      </h2>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!error && !loading && people.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-500">
          {searching ? 'Nobody found. Check the spelling or try a shorter name.' : 'No suggestions right now.'}
        </p>
      )}

      <ul className="space-y-2">
        {people.map((p) => (
          <PersonRow key={p.id} person={p} />
        ))}
      </ul>

      {loading && <p className="py-4 text-center text-sm text-gray-500">Loading…</p>}
      {!loading && more && (
        <button
          onClick={() => load(query, people.length)}
          className="mx-auto mt-3 block rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium hover:bg-gray-50"
        >
          Show more
        </button>
      )}
    </div>
  );
}
