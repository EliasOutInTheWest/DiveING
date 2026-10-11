'use client';

import { ACTIVITIES } from '@/lib/activities';

type Props = {
  value: string[]; // chosen activities, empty = all
  onChange: (next: string[]) => void;
  showAll?: boolean; // show the "All" chip (default: yes)
  dark?: boolean; // for dark backgrounds (feed)
  compact?: boolean; // smaller chips, emoji only on small screens
  className?: string;
};

// Row of activity buttons. Click to choose, click again to remove.
// Nothing chosen means: show everything.
export default function ActivityChips({ value, onChange, showAll = true, dark = false, compact = false, className }: Props) {
  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }

  const size = compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm';
  const idle = dark
    ? 'border-white/25 bg-white/10 text-white backdrop-blur-md hover:bg-white/20'
    : 'border-[#0a2a33]/15 bg-white text-[#12303a] hover:border-[#0a2a33]/40';
  const focus =
    'transition duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5b2e] focus-visible:ring-offset-1';
  const allOn = dark ? 'border-white bg-white text-[#0a2a33]' : 'border-[#0a2a33] bg-[#0a2a33] text-white';

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ''}`} role="group" aria-label="Activities">
      {showAll && (
        <button
          type="button"
          onClick={() => onChange([])}
          aria-pressed={value.length === 0}
          className={`rounded-full border font-medium ${focus} ${size} ${value.length === 0 ? allOn : idle}`}
        >
          All
        </button>
      )}
      {ACTIVITIES.map((a) => {
        const on = value.includes(a.value);
        return (
          <button
            key={a.value}
            type="button"
            onClick={() => toggle(a.value)}
            aria-pressed={on}
            title={a.label}
            className={`rounded-full border font-medium ${focus} ${size} ${on ? 'text-white shadow-sm' : idle}`}
            style={on ? { backgroundColor: a.color, borderColor: a.color } : undefined}
          >
            <span aria-hidden="true">{a.emoji}</span>
            <span className={compact ? 'ml-1 hidden sm:inline' : 'ml-1'}>{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}
