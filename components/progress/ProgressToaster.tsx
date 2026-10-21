'use client';

import { useEffect, useState } from 'react';
import Medal from '@/components/progress/Medal';
import { achievementTitle, levelTitle, parseCode, type Progress } from '@/lib/progress';

type Toast = { id: number; kind: 'level' | 'ach'; title: string; sub: string; track?: string; tier?: number; color?: string };

let nextId = 1;

// Pop-ups for "Achievement unlocked" and "Level up". Listens for the
// "dv-progress" event that lib/progress.ts sends.
export default function ProgressToaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function onProgress(e: Event) {
      const p = (e as CustomEvent<Progress>).detail;
      if (!p) return;
      const list: Toast[] = [];

      if (p.old_level != null && p.level > p.old_level) {
        const r = levelTitle(p.level);
        list.push({ id: nextId++, kind: 'level', title: `Level ${p.level}!`, sub: `You are now a ${r.title}`, color: r.color });
      }
      const codes = p.new_achievements ?? [];
      // show the best ones first, never more than 3 pop-ups at once
      const sorted = [...codes].sort((a, b) => parseCode(b).tier - parseCode(a).tier);
      const room = list.length > 0 ? 1 : 2;
      const shown = sorted.length > room + 1 ? room : sorted.length;
      sorted.slice(0, shown).forEach((c) => {
        const { track, tier } = parseCode(c);
        list.push({ id: nextId++, kind: 'ach', title: achievementTitle(track, tier), sub: 'Achievement unlocked', track, tier });
      });
      if (sorted.length > shown) {
        list.push({ id: nextId++, kind: 'ach', title: `+${sorted.length - shown} more achievements`, sub: 'See them on your profile', track: 'spots', tier: 0 });
      }
      if (list.length === 0) return;

      setToasts((t) => [...t, ...list].slice(-5));
      list.forEach((n, i) => {
        window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== n.id)), 6500 + i * 600);
      });
    }
    window.addEventListener('dv-progress', onProgress);
    return () => window.removeEventListener('dv-progress', onProgress);
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="dv pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex flex-col items-center gap-2 px-3" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="dv-glass dv-toast pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3"
          style={t.kind === 'level' ? { boxShadow: `inset 0 0 0 1.5px ${t.color}, 0 18px 50px -12px ${t.color}88` } : undefined}
        >
          {t.kind === 'level' ? (
            <span className="dv-title grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg" style={{ background: t.color, color: '#041018' }}>
              ⬆
            </span>
          ) : (
            <Medal track={t.track!} tier={t.tier!} size={42} />
          )}
          <div className="min-w-0 flex-1">
            <div className="dv-title truncate text-base text-white">{t.title}</div>
            <div className="truncate text-xs text-gray-400">{t.sub}</div>
          </div>
          <button
            onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
            aria-label="Close"
            className="rounded px-1.5 text-lg leading-none text-gray-500 hover:text-white"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
