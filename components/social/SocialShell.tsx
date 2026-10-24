'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import AuthBox from '@/components/AuthBox';
import AuthProvider from '@/components/AuthProvider';
import AppNav from '@/components/nav/AppNav';
import { font } from '@/components/theme/font';
import '@/components/theme/theme.css';

// Top bar + page frame for the profile, people and settings pages
export default function SocialShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <AuthProvider>
      <div className={`dv dv-page ${font.variable}`}>
        <header className="dv-glass sticky top-0 z-20 !rounded-none">
          <nav className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5">
            <Link href="/" className="dv-logo">
              DiveING
            </Link>
            <AuthBox className="relative" />
          </nav>
        </header>
        <main className={`dv-rise mx-auto px-4 pb-32 pt-6 ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>{children}</main>
        <AppNav />
      </div>
    </AuthProvider>
  );
}
