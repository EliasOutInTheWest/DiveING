'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useInView } from '@/components/landing/hooks';

type Props = { children: ReactNode; delay?: number; className?: string; style?: CSSProperties };

// Fades and slides its content in the first time it scrolls into view
export default function Reveal({ children, delay = 0, className = '', style }: Props) {
  const [ref, seen] = useInView<HTMLDivElement>(0.18);
  return (
    <div
      ref={ref}
      data-in={seen}
      className={`lp-reveal ${className}`}
      style={{ ...style, ['--d' as string]: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
