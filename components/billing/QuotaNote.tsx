'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { fmtDate, PLAN } from '@/lib/billing';

// "7 of 10 free uploads left this month". Not shown for Plus members and admins.
export default function QuotaNote({ className = '' }: { className?: string }) {
  const { isPlus, quota } = useAuth();
  if (isPlus || !quota) return null;
  const left = quota.remaining ?? 0;
  return (
    <p className={`text-xs ${left === 0 ? 'text-amber-700' : 'text-gray-500'} ${className}`}>
      <b className="text-gray-700">
        {left} of {quota.limit}
      </b>{' '}
      free uploads left this month{quota.resets_at ? ` (new ones on ${fmtDate(quota.resets_at)})` : ''}.{' '}
      <Link href="/subscribe" className="font-medium text-sky-700 hover:underline">
        {PLAN.name}: unlimited
      </Link>
    </p>
  );
}
