import { avatarSrc } from '@/lib/avatar';

const TONES = ['#0ea5e9', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0d9488', '#db2777', '#4f46e5'];

function tone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

type Props = { name: string; path?: string | null; size?: number; className?: string; plus?: boolean };

// Profile picture, or a coloured circle with the first letter
function Avatar({ name, path, size = 40, className = '' }: Omit<Props, 'plus'>) {
  const src = avatarSrc(path);
  const style = { width: size, height: size, fontSize: size * 0.42 };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        style={style}
        className={`shrink-0 rounded-full bg-gray-200 object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...style, backgroundColor: tone(name) }}
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${className}`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

// DiveING Plus members get a golden, softly shimmering frame
export default function AvatarWithFrame({ plus, ...rest }: Props) {
  if (!plus) return <Avatar {...rest} />;
  const ring = Math.max(2, Math.round((rest.size ?? 40) / 20));
  return (
    <span
      className="dv-gold relative inline-flex shrink-0 rounded-full"
      style={{ ['--ring' as string]: `${ring}px` }}
      title="DiveING Plus"
    >
      <Avatar {...rest} />
    </span>
  );
}
