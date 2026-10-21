'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { activityOf } from '@/lib/activities';
import { certLabel } from '@/lib/certs';
import { displayName, getProfile, type PublicProfile } from '@/lib/people';
import Avatar from '@/components/social/Avatar';
import FollowButton from '@/components/social/FollowButton';
import FollowList from '@/components/social/FollowList';
import PostGrid from '@/components/social/PostGrid';
import Favourites from '@/components/social/Favourites';
import LevelBadge from '@/components/progress/LevelBadge';
import LevelCard from '@/components/progress/LevelCard';
import Achievements from '@/components/progress/Achievements';
import { checkProgress, getProgress, type Progress } from '@/lib/progress';

type Tab = 'posts' | 'achievements' | 'favourites';

function banner(acts: string[]) {
  const colors = acts.slice(0, 3).map((a) => activityOf(a).color);
  if (colors.length === 0) colors.push('#0ea5e9', '#0d9488');
  if (colors.length === 1) colors.push('#0f172a');
  return `linear-gradient(120deg, ${colors.join(', ')})`;
}

// Steps that make a profile feel complete (only shown on your own profile)
function checklist(p: PublicProfile) {
  return [
    { done: !!p.avatar_url, text: 'Add a profile picture', href: '/settings' },
    { done: !!p.bio?.trim(), text: 'Write a short bio', href: '/settings' },
    { done: (p.activities ?? []).length > 0, text: 'Choose your favourite activities', href: '/settings' },
    { done: p.post_count > 0, text: 'Post your first photo or video', href: '/feed' },
    { done: p.following_count >= 3, text: 'Follow 3 people', href: '/people' },
  ];
}

export default function ProfileView({ username }: { username: string }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading');
  const [tab, setTab] = useState<Tab>('posts');
  const [list, setList] = useState<'followers' | 'following' | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  const uid = user?.id;
  const load = useCallback(async () => {
    const { data, error } = await getProfile(username);
    if (error) return setState('error');
    if (!data) return setState('missing');
    setProfile(data);
    setState('ok');
  }, [username]);

  useEffect(() => {
    if (authLoading) return;
    setState('loading');
    setTab('posts');
    load();
  }, [load, authLoading, uid]);

  // XP + achievements of this profile (on your own profile: also hand out new ones)
  const profileId = profile?.id;
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    (async () => {
      const p = uid === profileId ? ((await checkProgress()) ?? (await getProgress(profileId))) : await getProgress(profileId);
      if (!cancelled) setProgress(p);
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId, uid]);

  if (state === 'loading' || authLoading) return <p className="py-16 text-center text-sm text-gray-500">Loading…</p>;
  if (state === 'error')
    return <p className="py-16 text-center text-sm text-red-600">Could not load this profile. Did you run social.sql in Supabase?</p>;
  if (state === 'missing' || !profile)
    return (
      <div className="py-16 text-center">
        <p className="font-semibold">No one is called @{username}.</p>
        <Link href="/people" className="mt-2 inline-block text-sm text-sky-700 hover:underline">
          Search for people
        </Link>
      </div>
    );

  const isMe = uid === profile.id;
  const acts = profile.activities ?? [];
  const steps = isMe ? checklist(profile) : [];
  const doneCount = steps.filter((s) => s.done).length;
  const hasDiving = profile.cert_level || profile.dive_count != null;

  const setFollowing = (next: boolean) =>
    setProfile((p) =>
      p && p.is_following !== next ? { ...p, is_following: next, follower_count: p.follower_count + (next ? 1 : -1) } : p
    );

  const stat = (value: number, label: string, onClick?: () => void) => {
    const inner = (
      <>
        <span className="block text-xl font-extrabold leading-tight">{value}</span>
        <span className="text-xs text-gray-500">{label}</span>
      </>
    );
    return onClick ? (
      <button onClick={onClick} className="dv-stat rounded-2xl px-5 py-2 text-center">
        {inner}
      </button>
    ) : (
      <div className="dv-stat rounded-2xl px-5 py-2 text-center">{inner}</div>
    );
  };

  return (
    <div>
      <div className="dv-glass dv-pop overflow-hidden rounded-3xl">
        <div className="dv-banner relative h-32 sm:h-40" style={{ background: banner(acts) }}>
          <div className="absolute inset-0 flex items-center justify-end gap-2 pr-5 text-4xl opacity-25" aria-hidden="true">
            {acts.slice(0, 4).map((a) => (
              <span key={a}>{activityOf(a).emoji}</span>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4 sm:px-6">
          <div className="relative z-10 -mt-10 flex items-end justify-between gap-3">
            <Avatar name={profile.username} path={profile.avatar_url} size={88} className="dv-avatar-ring" />
            <div className="pb-1">
              {isMe ? (
                <Link href="/settings" className="rounded-full border border-gray-300 bg-gray-50 px-5 py-1.5 text-sm font-semibold hover:bg-gray-200">
                  Edit profile
                </Link>
              ) : (
                <FollowButton targetId={profile.id} following={profile.is_following} onChange={setFollowing} />
              )}
            </div>
          </div>

          <h1 className="dv-title mt-3 flex flex-wrap items-center gap-2 text-2xl leading-tight">
            {displayName(profile)}
            {progress && <LevelBadge level={progress.level} />}
          </h1>
          <p className="text-sm text-gray-500">
            @{profile.username}
            {profile.follows_me && !isMe && (
              <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">Follows you</span>
            )}
          </p>

          {profile.bio && <p className="mt-3 whitespace-pre-line text-sm">{profile.bio}</p>}

          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {profile.location && <span>📍 {profile.location}</span>}
            {hasDiving && (
              <span>
                🤿 {profile.cert_level ? certLabel(profile.cert_level) : 'Diver'}
                {profile.cert_agency ? ` (${profile.cert_agency})` : ''}
                {profile.dive_count != null ? ` · ${profile.dive_count} dives` : ''}
              </span>
            )}
            <span>Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
          </p>

          {acts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {acts.map((a) => {
                const act = activityOf(a);
                return (
                  <span key={a} className="rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ backgroundColor: act.color }}>
                    {act.emoji} {act.label}
                  </span>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex justify-around border-t border-gray-100 pt-3">
            {stat(profile.post_count, 'Posts')}
            {stat(profile.follower_count, 'Followers', () => setList('followers'))}
            {stat(profile.following_count, 'Following', () => setList('following'))}
          </div>
        </div>
      </div>

      {isMe && doneCount < steps.length && (
        <section className="mt-4 dv-glass dv-rise rounded-3xl p-4" aria-label="Complete your profile">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-sky-100">Complete your profile</h2>
            <span className="text-xs font-medium text-sky-800">
              {doneCount} of {steps.length}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={steps.length}>
            <div className="h-full rounded-full bg-sky-600 transition-all duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {steps.map((s) => (
              <li key={s.text} className="flex items-center gap-2">
                <span aria-hidden="true" className={s.done ? 'text-green-400' : 'text-gray-400'}>
                  {s.done ? '✓' : '○'}
                </span>
                {s.done ? (
                  <span className="text-gray-500 line-through">{s.text}</span>
                ) : (
                  <Link href={s.href} className="font-medium text-sky-800 hover:underline">
                    {s.text}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {progress && (
        <div className="mt-4">
          <LevelCard progress={progress} isMe={isMe} />
        </div>
      )}

      <div role="tablist" className="mt-5 flex border-b border-gray-200">
        {(['posts', 'achievements', ...(isMe ? ['favourites'] : [])] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 border-b-2 py-2.5 text-sm font-semibold ${
              tab === t ? 'border-sky-600 text-sky-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t === 'posts' ? 'Posts' : t === 'achievements' ? '🏆 Achievements' : 'Favourites'}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'achievements' ? (
          progress ? <Achievements progress={progress} /> : <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
        ) : tab === 'posts' ? (
          <PostGrid
            userId={profile.id}
            isMe={isMe}
            onCountChange={(d) => setProfile((p) => (p ? { ...p, post_count: Math.max(0, p.post_count + d) } : p))}
          />
        ) : (
          <Favourites userId={profile.id} />
        )}
      </div>

      {list && (
        <FollowList
          userId={profile.id}
          username={profile.username}
          initial={list}
          hidden={!profile.show_follow_lists && !isMe}
          onClose={() => {
            setList(null);
            load(); // counts may have changed while the list was open
          }}
        />
      )}
    </div>
  );
}
