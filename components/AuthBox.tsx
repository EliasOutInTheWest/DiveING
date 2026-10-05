'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { CERT_AGENCIES, CERT_LEVELS } from '@/lib/certs';

const inputClass = 'w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900';
const USERNAME_RE = /^[A-Za-z0-9_-]{3,30}$/;

type Props = { onOpenAdmin?: () => void; onOpenProfile?: () => void };

export default function AuthBox({ onOpenAdmin, onOpenProfile }: Props) {
  const { user, username, isAdmin, loading } = useAuth();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adult, setAdult] = useState(false);
  const [certLevel, setCertLevel] = useState('');
  const [certAgency, setCertAgency] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  function switchMode(next: 'login' | 'signup') {
    setMode(next);
    setError('');
    setInfo('');
  }

  async function submit() {
    setError('');
    setInfo('');

    if (mode === 'signup') {
      if (!USERNAME_RE.test(name)) {
        setError('Username: 3-30 characters, letters, numbers, _ or - only.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (!adult) {
        setError('You need to confirm that you are 18 or older.');
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          setError(err.message);
          return;
        }
        setPassword('');
        setOpen(false);
      } else {
        const { data: free } = await supabase.rpc('username_available', { wanted_name: name });
        if (free === false) {
          setError('This username is already taken.');
          return;
        }
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: name,
              adult_confirmed: true,
              cert_level: certLevel || null,
              cert_agency: certAgency || null,
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (err) {
          setError(err.message);
          return;
        }
        setPassword('');
        if (data.session) {
          setOpen(false); // email confirmation is switched off in Supabase
        } else {
          setInfo(`Almost done! We sent a confirmation link to ${email}. Click it, then log in.`);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  return (
    <div className="absolute right-14 top-2.5 z-10 rounded bg-white p-2 text-sm text-gray-900 shadow">
      {user ? (
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenProfile}
            title="My profile"
            className="max-w-40 truncate font-medium hover:underline"
          >
            {username ?? user.email}
          </button>
          {isAdmin &&
            (onOpenAdmin ? (
              <button
                onClick={onOpenAdmin}
                className="rounded bg-sky-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-sky-700"
              >
                Admin menu
              </button>
            ) : (
              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-800">Admin</span>
            ))}
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded border border-gray-300 px-2 py-0.5 hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      ) : open ? (
        <div className="w-64 space-y-2">
          <div className="flex gap-1 text-xs font-medium">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 rounded px-2 py-1 ${
                mode === 'login' ? 'bg-sky-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Log in
            </button>
            <button
              onClick={() => switchMode('signup')}
              className={`flex-1 rounded px-2 py-1 ${
                mode === 'signup' ? 'bg-sky-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Sign up
            </button>
          </div>

          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Username"
              autoComplete="username"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder={mode === 'signup' ? 'Password (min. 8 characters)' : 'Password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && mode === 'login' && submit()}
          />

          {mode === 'signup' && (
            <>
              <select className={inputClass} value={certLevel} onChange={(e) => setCertLevel(e.target.value)}>
                <option value="">Certification (optional)</option>
                {CERT_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
              <select className={inputClass} value={certAgency} onChange={(e) => setCertAgency(e.target.value)}>
                <option value="">Agency (optional)</option>
                {CERT_AGENCIES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <label className="flex items-start gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={adult}
                  onChange={(e) => setAdult(e.target.checked)}
                />
                <span>I confirm that I am 18 years or older.</span>
              </label>
            </>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
          {info && <p className="text-xs text-green-700">{info}</p>}

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy}
              className="rounded bg-sky-600 px-3 py-1 text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {busy ? '…' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="font-medium text-sky-700 hover:underline">
          Log in / Sign up
        </button>
      )}
    </div>
  );
}
