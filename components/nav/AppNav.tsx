'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import '@/components/theme/theme.css';

// The one navigation of the whole site: a floating bar at the bottom centre,
// the same on the start page, map, feed, people, profiles and settings.
// It looks up the login by itself, so it also works on the start page.

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const ICONS = {
  home: icon(
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h5v-6h4v6h5V9.5" />
    </>
  ),
  map: icon(
    <>
      <path d="M9 4 3 6.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </>
  ),
  feed: icon(
    <>
      <rect x="4" y="3" width="16" height="18" rx="4" />
      <path d="m10.5 8.8 4.2 3.2-4.2 3.2V8.8Z" />
    </>
  ),
  people: icon(
    <>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 20c.6-3.5 3.1-5.3 6.5-5.3s5.9 1.8 6.5 5.3" />
      <path d="M16.5 4.8a3.4 3.4 0 0 1 0 6.4M18.5 14.9c1.5.7 2.5 2.3 2.9 4.6" />
    </>
  ),
};

type Me = { id: string; email: string | null; username: string | null } | null;
let cachedMe: Me | undefined; // remembered while moving between pages

function useMe(): Me | undefined {
  const [me, setMe] = useState<Me | undefined>(cachedMe);
  useEffect(() => {
    let alive = true;
    async function load(u: { id: string; email?: string } | undefined | null) {
      if (!u) {
        cachedMe = null;
        if (alive) setMe(null);
        return;
      }
      const { data } = await supabase.from('profiles').select('username').eq('id', u.id).maybeSingle();
      cachedMe = { id: u.id, email: u.email ?? null, username: (data as { username?: string } | null)?.username ?? null };
      if (alive) setMe(cachedMe);
    }
    supabase.auth.getSession().then(({ data }) => load(data.session?.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setTimeout(() => load(session?.user), 0);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return me;
}

export default function AppNav() {
  const path = usePathname() ?? '/';
  const me = useMe();
  const user = me ?? null;
  const username = me?.username ?? null;

  const meHref = user ? (username ? `/u/${username}` : '/settings') : '/settings';
  const onMe = user
    ? (!!username && path === `/u/${username}`) || path.startsWith('/settings')
    : path.startsWith('/settings');

  const items: { key: string; href: string; label: string; active: boolean; node: ReactNode }[] = [
    { key: 'home', href: '/', label: 'Home', active: path === '/', node: ICONS.home },
    { key: 'map', href: '/map', label: 'Map', active: path.startsWith('/map'), node: ICONS.map },
    { key: 'feed', href: '/feed', label: 'Feed', active: path.startsWith('/feed'), node: ICONS.feed },
    {
      key: 'people',
      href: '/people',
      label: 'People',
      active: path.startsWith('/people') || (path.startsWith('/u/') && !onMe),
      node: ICONS.people,
    },
    {
      key: 'me',
      href: meHref,
      label: user ? 'Me' : 'Log in',
      active: onMe,
      node: (
        <span className="dv-dock-me" aria-hidden="true">
          {user ? (username ?? user.email ?? '?').charAt(0).toUpperCase() : '☺'}
        </span>
      ),
    },
  ];

  return (
    <nav className="dv dv-dock" aria-label="Main navigation">
      {items.map((it) => (
        <Link key={it.key} href={it.href} aria-current={it.active ? 'page' : undefined} className={`dv-dock-item ${it.active ? 'dv-dock-on' : ''}`}>
          {it.node}
          <span>{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}
