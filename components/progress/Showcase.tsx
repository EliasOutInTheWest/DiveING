import Medal from '@/components/progress/Medal';
import { achievementTitle, parseCode } from '@/lib/progress';

// The achievements somebody picked to show off (shown next to the name)
export default function Showcase({ codes, size = 30 }: { codes: string[]; size?: number }) {
  if (!codes || codes.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5" aria-label="Showcased achievements">
      {codes.map((c) => {
        const { track, tier } = parseCode(c);
        return <Medal key={c} track={track} tier={tier} size={size} title={achievementTitle(track, tier)} />;
      })}
    </span>
  );
}
