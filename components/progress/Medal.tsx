import { TIERS, trackOf } from '@/lib/progress';

// Round medal: coloured by tier, track icon inside. Locked = grey.
export default function Medal({
  track,
  tier,
  earned = true,
  size = 40,
  title,
}: {
  track: string;
  tier: number;
  earned?: boolean;
  size?: number;
  title?: string;
}) {
  const t = TIERS[tier] ?? TIERS[0];
  return (
    <span
      title={title}
      aria-label={title}
      role="img"
      className={`dv-medal ${earned ? 'dv-medal-on' : ''}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.46,
        // @ts-expect-error CSS custom property
        '--m': t.color,
      }}
    >
      <span style={{ filter: earned ? undefined : 'grayscale(1)' }}>{trackOf(track).icon}</span>
    </span>
  );
}
