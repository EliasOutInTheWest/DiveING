'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import AuthBox from '@/components/AuthBox';
import AuthProvider from '@/components/AuthProvider';
import { font } from '@/components/theme/font';
import '@/components/theme/theme.css';

const LINKS = [
  { href: '/map', label: 'Map' },
  { href: '/feed', label: 'Feed' },
  { href: '/people', label: 'People' },
];

// Top bar + page frame for the profile, people and settings pages
export default function SocialShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const path = usePathname();
  return (
    <AuthProvider>
      <div className={`dv dv-page ${font.variable}`}>
        <header className="dv-glass sticky top-0 z-20 !rounded-none">
          <nav className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5">
            <div className="flex items-center gap-1 text-sm font-semibold">
              <Link href="/" className="dv-logo mr-3">
                DiveING
              </Link>
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-full px-3.5 py-1.5 ${
                    path?.startsWith(l.href) ? 'dv-active' : 'hover:bg-gray-100'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <AuthBox className="relative" />
          </nav>
        </header>
        <main className={`dv-rise mx-auto px-4 pb-20 pt-6 ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>{children}</main>
      </div>
    </AuthProvider>
  );
}
