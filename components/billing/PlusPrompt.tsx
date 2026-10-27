'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { fmtDate, PLAN, startCheckout } from '@/lib/billing';

// "Posting photos and videos needs DiveING Plus" with the button to start the free trial.
// variant "modal" = pop-up over the page, "inline" = small box inside a panel.
export default function PlusPrompt({ variant = 'inline', onClose }: { variant?: 'modal' | 'inline'; onClose?: () => void }) {
  const { user, isVerified, access, quota } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ended = access.status !== 'none' && !access.can_post_media;
  const canTrial = !access.had_trial;

  async function go() {
    setBusy(true);
    setError('');
    try {
      await startCheckout(); // leaves the page
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  const body = (
    <div className="text-sm">
      <div className="dv-title text-lg">
        {user && isVerified ? `✨ You used your ${quota?.limit ?? PLAN.freeUploads} free uploads this month` : `📸 Post photos and videos`}
      </div>
      <p className="mt-1 text-gray-600">
        {PLAN.name} gives you unlimited photos and videos, videos up to {PLAN.plusVideo.seconds} seconds, a boost in the feed, +{PLAN.xpBoost}% XP, {PLAN.plusMedals} medal slots, a golden profile frame and your own logbook.{' '}
        {canTrial ? `${PLAN.trialDays} days free, then ${PLAN.price} per month.` : `${PLAN.price} per month.`} Cancel any time.
      </p>
      {quota?.resets_at && (
        <p className="mt-1 text-xs text-gray-500">Or wait: you get {quota.limit} new free uploads on {fmtDate(quota.resets_at)}.</p>
      )}
      {ended && access.purge_at && (
        <p className="mt-2 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-700">
          Your subscription ended. The photos and videos you posted with {PLAN.name} will be deleted on <b>{fmtDate(access.purge_at)}</b> unless you subscribe again.
        </p>
      )}

      {!user ? (
        <p className="mt-3 text-gray-600">Log in or sign up first (top right), then you can start your free trial.</p>
      ) : !isVerified ? (
        <p className="mt-3 text-gray-600">Please confirm your email address first, then you can start your free trial.</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={go}
            disabled={busy}
            className="rounded-full bg-sky-600 px-5 py-2 font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {busy ? 'Opening…' : canTrial ? `Start ${PLAN.trialDays} days free` : 'Subscribe'}
          </button>
          <Link href="/subscribe" className="text-xs font-medium text-sky-700 hover:underline">
            See what is included
          </Link>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );

  if (variant === 'inline') {
    return <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">{body}</div>;
  }
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-3 sm:items-center" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="dv-glass dv-pop w-full max-w-sm rounded-3xl bg-white p-5 text-gray-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end">
          <button onClick={onClose} aria-label="Close" className="rounded px-2 text-2xl leading-none text-gray-500 hover:text-gray-900">
            ×
          </button>
        </div>
        {body}
      </div>
    </div>
  );
}
