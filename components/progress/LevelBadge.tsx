import { levelTitle } from '@/lib/progress';

// Small "Lv 8" chip, colour depends on the rank
export default function LevelBadge({ level, className = '' }: { level: number; className?: string }) {
  const r = levelTitle(level);
  return (
    <span
      title={`${r.title}, level ${level}`}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold leading-none ${className}`}
      style={{ background: `linear-gradient(135deg, ${r.color}, #ffffffcc)`, color: '#041018' }}
    >
      Lv {level}
    </span>
  );
}
