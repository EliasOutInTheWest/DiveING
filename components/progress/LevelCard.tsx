import { levelTitle, XP_RULES, type Progress } from '@/lib/progress';

// Big level ring + XP bar
export default function LevelCard({ progress, isMe }: { progress: Progress; isMe: boolean }) {
  const r = levelTitle(progress.level);
  const span = Math.max(1, progress.next_level_xp - progress.level_start_xp);
  const into = Math.max(0, progress.xp - progress.level_start_xp);
  const pct = Math.min(100, Math.round((into / span) * 100));

  return (
    <section className="dv-glass dv-rise rounded-3xl p-4 sm:p-5" aria-label="Level and XP">
      <div className="flex items-center gap-4">
        <div
          className="dv-ring grid shrink-0 place-items-center rounded-full"
          style={{
            width: 84,
            height: 84,
            background: `conic-gradient(${r.color} ${pct * 3.6}deg, rgba(255,255,255,0.12) 0deg)`,
          }}
        >
          <div className="grid place-items-center rounded-full bg-[#071826]" style={{ width: 68, height: 68 }}>
            <div className="text-center leading-none">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Level</div>
              <div className="dv-title text-2xl" style={{ color: r.color }}>
                {progress.level}
              </div>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="dv-title text-xl" style={{ color: r.color }}>
            {r.title}
          </div>
          <div className="text-sm text-gray-600">
            <b className="text-gray-900">{progress.xp.toLocaleString()}</b> XP total
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="dv-xpbar h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${r.color}, #fff)` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>
              {into.toLocaleString()} / {span.toLocaleString()} XP
            </span>
            <span>Level {progress.level + 1}</span>
          </div>
        </div>
      </div>

      {isMe && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-sky-700">How do I earn XP?</summary>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
            {XP_RULES.map((x) => (
              <li key={x.text} className="flex items-center justify-between gap-2">
                <span>
                  {x.icon} {x.text}
                </span>
                <b className="text-gray-900">+{x.xp}</b>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500">Every achievement you unlock gives a bonus on top.</p>
        </details>
      )}
    </section>
  );
}
