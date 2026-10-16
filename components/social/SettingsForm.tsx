'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { CERT_AGENCIES, CERT_LEVELS } from '@/lib/certs';
import { removeAvatar, uploadAvatar } from '@/lib/avatar';
import ActivityChips from '@/components/ActivityChips';
import Avatar from '@/components/social/Avatar';

const USERNAME_RE = /^[A-Za-z0-9_-]{3,30}$/;
const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200';

type Row = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  cert_level: string | null;
  cert_agency: string | null;
  dive_count: number | null;
  show_cert: boolean | null;
  show_follow_lists: boolean | null;
};

type Form = {
  username: string;
  displayName: string;
  bio: string;
  location: string;
  certLevel: string;
  certAgency: string;
  diveCount: string;
  showCert: boolean;
  showLists: boolean;
  license: string;
  adult: boolean;
};

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
    <h2 className="font-semibold">{title}</h2>
    {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    <div className="mt-4 space-y-4">{children}</div>
  </section>
);

const Field = ({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) => (
  <label className="block text-sm">
    <span className="mb-1 flex items-center justify-between font-medium text-gray-700">
      {label}
      {note && <span className="text-xs font-normal text-gray-400">{note}</span>}
    </span>
    {children}
  </label>
);

const Toggle = ({ checked, onChange, title, text }: { checked: boolean; onChange: (v: boolean) => void; title: string; text: string }) => (
  <label className="flex cursor-pointer items-start justify-between gap-4">
    <span className="text-sm">
      <span className="block font-medium text-gray-800">{title}</span>
      <span className="text-xs text-gray-500">{text}</span>
    </span>
    <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-9 shrink-0 cursor-pointer accent-sky-600" />
  </label>
);

export default function SettingsForm() {
  const { user, username: savedUsername, loading: authLoading, refresh, activities, setActivities } = useAuth();
  const uid = user?.id;

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [saved, setSaved] = useState<Form | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [pw, setPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [p, priv] = await Promise.all([
        supabase.from('profiles').select('username,display_name,avatar_url,bio,location,cert_level,cert_agency,dive_count,show_cert,show_follow_lists').eq('id', uid).maybeSingle(),
        supabase.from('profile_private').select('license_number,adult_confirmed').eq('user_id', uid).maybeSingle(),
      ]);
      if (cancelled) return;
      if (p.error) {
        setError('Could not load your profile. Did you run social.sql in Supabase?');
        setLoading(false);
        return;
      }
      const r = p.data as Row | null;
      const pr = priv.data as { license_number: string | null; adult_confirmed: boolean } | null;
      if (r) {
        const f: Form = {
          username: r.username,
          displayName: r.display_name ?? '',
          bio: r.bio ?? '',
          location: r.location ?? '',
          certLevel: r.cert_level ?? '',
          certAgency: r.cert_agency ?? '',
          diveCount: r.dive_count == null ? '' : String(r.dive_count),
          showCert: r.show_cert ?? true,
          showLists: r.show_follow_lists ?? true,
          license: pr?.license_number ?? '',
          adult: pr?.adult_confirmed ?? false,
        };
        setForm(f);
        setSaved(f);
        setAvatar(r.avatar_url);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const dirty = !!form && !!saved && JSON.stringify(form) !== JSON.stringify(saved);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (authLoading || loading) return <p className="py-16 text-center text-sm text-gray-500">Loading…</p>;
  if (!user)
    return (
      <p className="py-16 text-center text-sm text-gray-600">
        Please log in (top right) to change your settings.
      </p>
    );
  if (!form || !saved) return <p className="py-16 text-center text-sm text-red-600">{error || 'Profile not found.'}</p>;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  async function pickAvatar(file: File | undefined) {
    if (!file || !uid) return;
    setError('');
    setAvatarBusy(true);
    try {
      setAvatar(await uploadAvatar(uid, file, avatar));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    }
    setAvatarBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function dropAvatar() {
    if (!uid) return;
    setAvatarBusy(true);
    try {
      await removeAvatar(uid, avatar);
      setAvatar(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove the picture.');
    }
    setAvatarBusy(false);
  }

  async function save() {
    if (!uid || !form || !saved) return;
    setError('');
    setInfo('');
    const name = form.username.trim();
    if (!USERNAME_RE.test(name)) return setError('Username: 3-30 characters, letters, numbers, _ or - only.');
    let dives: number | null = null;
    if (form.diveCount.trim() !== '') {
      const n = Number(form.diveCount);
      if (!Number.isInteger(n) || n < 0 || n > 100000) return setError('Number of dives must be a whole number.');
      dives = n;
    }
    if (form.bio.length > 300) return setError('The bio can have at most 300 characters.');

    setSaving(true);
    if (name.toLowerCase() !== saved.username.toLowerCase()) {
      const { data: free } = await supabase.rpc('username_available', { wanted_name: name });
      if (free === false) {
        setSaving(false);
        return setError('This username is already taken.');
      }
    }
    const { error: pErr } = await supabase
      .from('profiles')
      .update({
        username: name,
        display_name: form.displayName.trim() || null,
        bio: form.bio.trim() || null,
        location: form.location.trim() || null,
        cert_level: form.certLevel || null,
        cert_agency: form.certAgency || null,
        dive_count: dives,
        show_cert: form.showCert,
        show_follow_lists: form.showLists,
      })
      .eq('id', uid);
    if (pErr) {
      setSaving(false);
      return setError(pErr.code === '23505' ? 'This username is already taken.' : pErr.message);
    }
    const { error: privErr } = await supabase.from('profile_private').upsert({
      user_id: uid,
      license_number: form.license.trim() || null,
      adult_confirmed: form.adult,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (privErr) return setError(privErr.message);

    const clean = { ...form, username: name };
    setForm(clean);
    setSaved(clean);
    setInfo('Saved.');
    await refresh();
  }

  async function changePassword() {
    setPwMsg('');
    if (pw.length < 8) return setPwMsg('Use at least 8 characters.');
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    if (err) return setPwMsg(err.message);
    setPw('');
    setPwMsg('Password changed.');
  }

  const shownName = saved.username || savedUsername || '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="dv-title text-2xl">Settings</h1>
        <Link href={`/u/${shownName}`} className="text-sm font-medium text-sky-700 hover:underline">
          View my profile
        </Link>
      </div>

      <Section title="Profile picture">
        <div className="flex items-center gap-4">
          <Avatar name={form.username || 'U'} path={avatar} size={80} />
          <div className="space-y-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="avatar-file" onChange={(e) => pickAvatar(e.target.files?.[0])} />
            <div className="flex gap-2">
              <label htmlFor="avatar-file" className={`cursor-pointer rounded-full bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 ${avatarBusy ? 'pointer-events-none opacity-60' : ''}`}>
                {avatarBusy ? 'Working…' : avatar ? 'Change picture' : 'Upload picture'}
              </label>
              {avatar && (
                <button onClick={dropAvatar} disabled={avatarBusy} className="rounded-full border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-60">
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500">JPG, PNG or WebP. It is cropped to a square. Saved right away.</p>
          </div>
        </div>
      </Section>

      <Section title="About you" hint="This is what other people see on your profile.">
        <Field label="Username" note="used in your profile link">
          <input className={input} value={form.username} onChange={(e) => set('username', e.target.value)} autoComplete="username" />
        </Field>
        <Field label="Display name" note="optional">
          <input className={input} maxLength={40} value={form.displayName} onChange={(e) => set('displayName', e.target.value)} placeholder={form.username} />
        </Field>
        <Field label="Short bio" note={`${form.bio.length}/300`}>
          <textarea rows={3} maxLength={300} className={input} value={form.bio} onChange={(e) => set('bio', e.target.value)} />
        </Field>
        <Field label="Location" note="optional">
          <input className={input} maxLength={60} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Victoria, BC" />
        </Field>
      </Section>

      <Section title="My activities" hint="The map and the feed only show these. Choose none to see everything. Saved automatically.">
        <ActivityChips value={activities} onChange={setActivities} />
      </Section>

      <Section title="Diving" hint="Optional. Leave empty if you do not dive.">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Certification">
            <select className={input} value={form.certLevel} onChange={(e) => set('certLevel', e.target.value)}>
              <option value="">—</option>
              {CERT_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Agency">
            <select className={input} value={form.certAgency} onChange={(e) => set('certAgency', e.target.value)}>
              <option value="">—</option>
              {CERT_AGENCIES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Number of dives">
          <input type="number" min={0} className={input} value={form.diveCount} onChange={(e) => set('diveCount', e.target.value)} />
        </Field>
      </Section>

      <Section title="Privacy">
        <Toggle checked={form.showCert} onChange={(v) => set('showCert', v)} title="Show my diving details" text="Certification, agency and number of dives on my profile." />
        <Toggle checked={form.showLists} onChange={(v) => set('showLists', v)} title="Show my followers and who I follow" text="When off, other people only see the numbers, not the names. You always see your own lists." />
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-600">Private: only you and admins can see this</p>
          <Field label="Licence number (optional)">
            <input className={input} value={form.license} onChange={(e) => set('license', e.target.value)} />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={form.adult} onChange={(e) => set('adult', e.target.checked)} />
            <span>I confirm that I am 18 years or older.</span>
          </label>
        </div>
      </Section>

      <Section title="Account">
        <p className="text-sm text-gray-600">
          Signed in as <span className="font-medium">{user.email}</span>
        </p>
        <div className="flex gap-2">
          <input type="password" className={input} placeholder="New password (8+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          <button onClick={changePassword} className="shrink-0 rounded-lg border border-gray-300 px-3 text-sm font-medium hover:bg-gray-50">
            Change
          </button>
        </div>
        {pwMsg && <p role="status" className="text-xs text-gray-600">{pwMsg}</p>}
        <button onClick={() => supabase.auth.signOut()} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
          Log out
        </button>
      </Section>

      <div className="sticky bottom-3 z-10 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <button onClick={save} disabled={saving || !dirty} className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <span role="status" className="min-w-0 text-sm">
          {error ? <span className="text-red-600">{error}</span> : info && !dirty ? <span className="text-green-700">{info}</span> : dirty ? <span className="text-amber-700">Unsaved changes</span> : null}
        </span>
      </div>
    </div>
  );
}
