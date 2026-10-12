'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import AuthBox from '@/components/AuthBox';
import AuthProvider from '@/components/AuthProvider';

// Top bar + page frame for the profile, people and settings pages
export default function SocialShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <AuthProvider>
    <div className="min-h-dvh bg-slate-50 text-gray-900">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5">
          <div className="flex items-center gap-1 text-sm font-medium">
            <Link href="/" className="mr-2 text-base font-extrabold text-sky-700">
              DiveING
            </Link>
            <Link href="/map" className="rounded-full px-3 py-1.5 hover:bg-gray-100">
              Map
            </Link>
            <Link href="/feed" className="rounded-full px-3 py-1.5 hover:bg-gray-100">
              Feed
            </Link>
            <Link href="/people" className="rounded-full px-3 py-1.5 hover:bg-gray-100">
              People
            </Link>
          </div>
          <AuthBox className="relative" />
        </nav>
      </header>
      <main className={`mx-auto px-4 pb-16 pt-5 ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>{children}</main>
    </div>
    </AuthProvider>
  );
}
