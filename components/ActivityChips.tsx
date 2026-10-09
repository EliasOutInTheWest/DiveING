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

  const size = compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  const idle = dark
    ? 'border-white/40 bg-black/40 text-white hover:bg-black/60'
    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50';

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ''}`} role="group" aria-label="Activities">
      {showAll && (
        <button
          type="button"
          onClick={() => onChange([])}
          aria-pressed={value.length === 0}
          className={`rounded-full border font-medium ${size} ${
            value.length === 0 ? 'border-slate-800 bg-slate-800 text-white' : idle
          }`}
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
            className={`rounded-full border font-medium ${size} ${on ? 'text-white' : idle}`}
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
