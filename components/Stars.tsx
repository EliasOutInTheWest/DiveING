// Five stars. With onChange the stars can be clicked (for writing a review).
export default function Stars({
  value,
  onChange,
  size = 'text-base',
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: string;
}) {
  return (
    <span className={`inline-flex ${size}`} aria-label={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const color = n <= Math.round(value) ? 'text-amber-500' : 'text-gray-300';
        return onChange ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            className={`${color} leading-none hover:text-amber-400`}
          >
            ★
          </button>
        ) : (
          <span key={n} className={`${color} leading-none`}>
            ★
          </span>
        );
      })}
    </span>
  );
}
