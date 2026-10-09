'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

type AdminUser = {
  id: string;
  email: string;
  username: string | null;
  created_at: string;
  email_confirmed: boolean;
  last_sign_in_at: string | null;
  is_admin: boolean;
  school_ids: string[];
};

type SchoolOption = { id: string; name: string };

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null); // id of the user being changed
  const [pick, setPick] = useState<Record<string, string>>({}); // chosen school per user

  const load = useCallback(async () => {
    const [usersRes, schoolsRes] = await Promise.all([
      supabase.rpc('admin_list_users'),
      supabase.from('schools').select('id,name').order('name'),
    ]);
    if (usersRes.error) {
      setError(usersRes.error.message);
    } else {
      setError('');
      setUsers((usersRes.data as AdminUser[]) ?? []);
    }
    if (schoolsRes.data) setSchools(schoolsRes.data as SchoolOption[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const schoolName = useMemo(() => {
    const map = new Map<string, string>();
    schools.forEach((s) => map.set(s.id, s.name));
    return (id: string) => map.get(id) ?? 'Unknown school';
  }, [schools]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.email.toLowerCase().includes(q) || (u.username ?? '').toLowerCase().includes(q)
    );
  }, [users, query]);

  function patchUser(id: string, patch: Partial<AdminUser>) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  async function toggleAdmin(u: AdminUser) {
    const make = !u.is_admin;
    const who = u.username ?? u.email;
    const ok = window.confirm(
      make
        ? `Make ${who} an admin? Admins can edit and delete everything and manage accounts.`
        : `Remove admin rights from ${who}?`
    );
    if (!ok) return;

    setBusy(u.id);
    setError('');
    const { error: err } = await supabase.rpc('admin_set_admin', {
      target_user: u.id,
      make_admin: make,
    });
    setBusy(null);
    if (err) {
      setError(err.message);
      return;
    }
    patchUser(u.id, { is_admin: make });
  }

  async function addSchool(u: AdminUser) {
    const schoolId = pick[u.id];
    if (!schoolId) return;

    setBusy(u.id);
    setError('');
    const { error: err } = await supabase
      .from('school_members')
      .insert({ school_id: schoolId, user_id: u.id });
    setBusy(null);
    // 23505 = already assigned, treat as success
    if (err && err.code !== '23505') {
      setError(err.message);
      return;
    }
    if (!u.school_ids.includes(schoolId)) {
      patchUser(u.id, { school_ids: [...u.school_ids, schoolId] });
    }
    setPick((p) => ({ ...p, [u.id]: '' }));
  }

  async function removeSchool(u: AdminUser, schoolId: string) {
    setBusy(u.id);
    setError('');
    const { error: err } = await supabase
      .from('school_members')
      .delete()
      .eq('school_id', schoolId)
      .eq('user_id', u.id);
    setBusy(null);
    if (err) {
      setError(err.message);
      return;
    }
    patchUser(u.id, { school_ids: u.school_ids.filter((id) => id !== schoolId) });
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-auto bg-black/40 p-3 sm:p-6">
      <div className="w-full max-w-5xl rounded-lg bg-white text-gray-900 shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-4">
          <div>
            <h2 className="text-lg font-semibold">Admin: accounts</h2>
            <p className="text-xs text-gray-500">
              {users.length} accounts · Admins can edit everything. School staff can edit only the
              schools listed for them.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded px-2 text-2xl leading-none text-gray-500 hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-4">
          <input
            type="search"
            placeholder="Search by username or email"
            className="w-full max-w-xs rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            onClick={() => {
              setLoading(true);
              load();
            }}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Refresh
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-4 text-sm text-gray-500">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No accounts found.</p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Account</th>
                  <th className="px-4 py-2 font-medium">Dates</th>
                  <th className="px-4 py-2 font-medium">Admin</th>
                  <th className="px-4 py-2 font-medium">Schools and providers (staff)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isMe = u.id === me?.id;
                  const free = schools.filter((s) => !u.school_ids.includes(s.id));
                  return (
                    <tr key={u.id} className="border-t border-gray-100 align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {u.username ?? '—'}
                          {isMe && (
                            <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-normal text-gray-600">
                              you
                            </span>
                          )}
                        </div>
                        <div className="break-all text-xs text-gray-500">{u.email}</div>
                        {!u.email_confirmed && (
                          <div className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                            email not confirmed
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <div>Registered: {fmt(u.created_at)}</div>
                        <div>Last login: {fmt(u.last_sign_in_at)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleAdmin(u)}
                          disabled={busy === u.id || isMe}
                          title={isMe ? 'You cannot change your own admin role' : undefined}
                          className={`rounded px-3 py-1 text-xs font-medium disabled:opacity-50 ${
                            u.is_admin
                              ? 'bg-sky-600 text-white hover:bg-sky-700'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {u.is_admin ? 'Admin ✓' : 'Make admin'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {u.school_ids.length === 0 && (
                            <span className="text-xs text-gray-400">none</span>
                          )}
                          {u.school_ids.map((id) => (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-900"
                            >
                              {schoolName(id)}
                              <button
                                onClick={() => removeSchool(u, id)}
                                disabled={busy === u.id}
                                aria-label={`Remove ${schoolName(id)}`}
                                className="leading-none text-orange-700 hover:text-red-600 disabled:opacity-50"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <select
                            className="max-w-48 rounded border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-900"
                            value={pick[u.id] ?? ''}
                            onChange={(e) => setPick((p) => ({ ...p, [u.id]: e.target.value }))}
                          >
                            <option value="">Add a school…</option>
                            {free.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => addSchool(u)}
                            disabled={!pick[u.id] || busy === u.id}
                            className="rounded bg-orange-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
