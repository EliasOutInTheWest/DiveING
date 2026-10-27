import Medal from '@/components/progress/Medal';
import { achievementTitle, parseCode } from '@/lib/progress';

// The achievements somebody picked to show off (shown next to the name)
export default function Showcase({ codes, size = 30, plus = false }: { codes: string[]; size?: number; plus?: boolean }) {
  if (!codes || codes.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5" aria-label="Showcased achievements">
      {codes.map((c) => {
        const { track, tier } = parseCode(c);
        const medal = <Medal track={track} tier={tier} size={size} title={achievementTitle(track, tier)} />;
        return plus ? (
          <span key={c} className="dv-glint">
            {medal}
          </span>
        ) : (
          <span key={c} className="inline-flex">
            {medal}
          </span>
        );
      })}
    </span>
  );
}
