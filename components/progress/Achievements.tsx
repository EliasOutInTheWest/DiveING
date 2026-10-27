'use client';

import { useEffect, useState } from 'react';
import Medal from '@/components/progress/Medal';
import { achievementTitle, loadDefs, TIERS, TRACKS, type Def, type Progress } from '@/lib/progress';

// One card per track: the six medals, and the progress to the next one
export default function Achievements({
  progress,
  isMe = false,
  onShowcase,
  error,
}: {
  progress: Progress;
  isMe?: boolean;
  onShowcase?: (next: string[]) => void;
  error?: string;
}) {
  const [defs, setDefs] = useState<Def[] | null>(null);
  useEffect(() => {
    loadDefs().then(setDefs);
  }, []);

  if (!defs) return <p className="py-8 text-center text-sm text-gray-500">Loading…</p>;
  if (defs.length === 0)
    return <p className="py-8 text-center text-sm text-red-600">Could not load achievements. Did you run progress.sql in Supabase?</p>;

  const earned = new Set(progress.achievements.map((a) => a.code));
  const total = defs.length;
  const picked = progress.showcase ?? [];
  const slots = progress.showcase_slots ?? 3;

  function toggle(code: string) {
    if (!onShowcase) return;
    if (picked.includes(code)) onShowcase(picked.filter((c) => c !== code));
    else if (picked.length < slots) onShowcase([...picked, code]);
  }

  return (
    <div>
      <p className="mb-1 text-sm text-gray-600">
        <b className="text-gray-900">{earned.size}</b> of {total} achievements unlocked
      </p>
      {isMe && (
        <p className="mb-3 text-xs text-gray-500">
          Tap an unlocked medal to show it off next to your name ({picked.length}/{slots} picked). Tap again to remove it.{slots < 6 ? ' DiveING Plus has 6 slots.' : ''}
        </p>
      )}
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {TRACKS.map((t, i) => {
          const list = defs.filter((d) => d.track === t.track).sort((a, b) => a.tier - b.tier);
          const count = progress.counts[t.track] ?? 0;
          const next = list.find((d) => !earned.has(d.code));
          const prev = [...list].reverse().find((d) => earned.has(d.code));
          const from = prev?.threshold ?? 0;
          const pct = next ? Math.min(100, Math.round(((count - from) / Math.max(1, next.threshold - from)) * 100)) : 100;
          return (
            <section key={t.track} className="dv-glass dv-rise rounded-2xl p-4" style={{ ['--d' as string]: `${i * 60}ms` }}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="dv-title text-base">
                  {t.icon} {t.name}
                </h3>
                <span className="text-xs text-gray-500">
                  {count.toLocaleString()} {t.unit}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-1">
                {list.map((d) => {
                  const on = earned.has(d.code);
                  const pinned = picked.includes(d.code);
                  const medal = (
                    <Medal
                      track={t.track}
                      tier={d.tier}
                      earned={on}
                      size={38}
                      title={`${achievementTitle(t.track, d.tier)}: ${d.threshold.toLocaleString()} ${t.unit}${on ? ' (unlocked)' : ''}`}
                    />
                  );
                  if (!isMe || !on) return <span key={d.code}>{medal}</span>;
                  return (
                    <button
                      key={d.code}
                      type="button"
                      onClick={() => toggle(d.code)}
                      aria-pressed={pinned}
                      aria-label={`${pinned ? 'Remove' : 'Show'} ${achievementTitle(t.track, d.tier)} on my profile`}
                      className={`relative rounded-full ${pinned ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a2234]' : 'hover:scale-110'}`}
                    >
                      {medal}
                      {pinned && (
                        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-white text-[9px] text-slate-900">
                          📌
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3">
                {next ? (
                  <>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: TIERS[next.tier].color }} />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Next: <b className="text-gray-700">{achievementTitle(t.track, next.tier)}</b> at {next.threshold.toLocaleString()} (+{next.bonus_xp} XP)
                    </p>
                  </>
                ) : (
                  <p className="text-xs font-semibold" style={{ color: TIERS[5].color }}>
                    ✦ Everything unlocked
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
