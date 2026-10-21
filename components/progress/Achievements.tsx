'use client';

import { useEffect, useState } from 'react';
import Medal from '@/components/progress/Medal';
import { achievementTitle, loadDefs, TIERS, TRACKS, type Def, type Progress } from '@/lib/progress';

// One card per track: the six medals, and the progress to the next one
export default function Achievements({ progress }: { progress: Progress }) {
  const [defs, setDefs] = useState<Def[] | null>(null);
  useEffect(() => {
    loadDefs().then(setDefs);
  }, []);

  if (!defs) return <p className="py-8 text-center text-sm text-gray-500">Loading…</p>;
  if (defs.length === 0)
    return <p className="py-8 text-center text-sm text-red-600">Could not load achievements. Did you run progress.sql in Supabase?</p>;

  const earned = new Set(progress.achievements.map((a) => a.code));
  const total = defs.length;

  return (
    <div>
      <p className="mb-3 text-sm text-gray-600">
        <b className="text-gray-900">{earned.size}</b> of {total} achievements unlocked
      </p>
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
                {list.map((d) => (
                  <Medal
                    key={d.code}
                    track={t.track}
                    tier={d.tier}
                    earned={earned.has(d.code)}
                    size={38}
                    title={`${achievementTitle(t.track, d.tier)}: ${d.threshold.toLocaleString()} ${t.unit}${earned.has(d.code) ? ' (unlocked)' : ''}`}
                  />
                ))}
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
