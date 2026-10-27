// Small gold "Plus" pill next to the name of a DiveING Plus member
export default function PlusBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`dv-plus-badge ${className}`} title="DiveING Plus member">
      ✦ PLUS
    </span>
  );
}
