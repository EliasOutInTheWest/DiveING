'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { fmtDate, openPortal, PLAN, startCheckout } from '@/lib/billing';

const ROWS: { label: string; free: boolean | string | number; plus: boolean | string | number; visitor: boolean | string | number }[] = [
  { label: 'Look at the map and the feed', visitor: true, free: true, plus: true },
  { label: 'Add spots and write reviews', visitor: false, free: true, plus: true },
  { label: 'Follow people, earn XP and achievements', visitor: false, free: true, plus: true },
  { label: 'Photos and videos', visitor: false, free: `${PLAN.freeUploads} per month`, plus: 'Unlimited' },
  { label: 'Video length and size', visitor: false, free: `${PLAN.freeVideo.seconds} s, ${PLAN.freeVideo.mb} MB`, plus: `${PLAN.plusVideo.seconds} s, ${PLAN.plusVideo.mb} MB` },
  { label: 'Boost for your posts in the feed', visitor: false, free: false, plus: true },
  { label: 'XP boost', visitor: false, free: false, plus: `+${PLAN.xpBoost}%` },
  { label: 'Medals shown on your profile', visitor: false, free: PLAN.freeMedals, plus: PLAN.plusMedals },
  { label: 'Golden, animated profile frame and Plus badge', visitor: false, free: false, plus: true },
  { label: 'Your own logbook with stats and export', visitor: false, free: false, plus: true },
];

const mark = (v: boolean | string | number) => (v === true ? '✓' : v === false ? '–' : String(v));

export default function SubscribeView({ checkout }: { checkout?: string }) {
  const { user, isVerified, isAdmin, access, loading, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const polls = useRef(0);

  // after paying, Stripe tells us a moment later: look again a few times
  useEffect(() => {
    if (checkout !== 'success' || access.can_post_media) return;
    const t = window.setInterval(() => {
      polls.current += 1;
      void refresh();
      if (polls.current >= 8) window.clearInterval(t);
    }, 2500);
    return () => window.clearInterval(t);
  }, [checkout, access.can_post_media, refresh]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  if (loading) return <p className="py-16 text-center text-sm text-gray-500">Loading…</p>;

  const s = access.status;
  const on = access.can_post_media && !isAdmin;
  const ended = s !== 'none' && !access.can_post_media && !isAdmin;
  const canTrial = !access.had_trial;

  let action: React.ReactNode;
  if (!user) {
    action = <p className="text-sm text-gray-600">Log in or sign up (top right) to start your free trial.</p>;
  } else if (!isVerified) {
    action = <p className="text-sm text-gray-600">Please confirm your email address first.</p>;
  } else if (isAdmin) {
    action = <p className="text-sm text-gray-600">You are an admin: everything is included, no subscription needed.</p>;
  } else if (on) {
    action = (
      <button
        onClick={() => run(openPortal)}
        disabled={busy}
        className="rounded-full border border-gray-300 bg-gray-50 px-5 py-2.5 text-sm font-semibold hover:bg-gray-200 disabled:opacity-60"
      >
        {busy ? 'Opening…' : 'Manage subscription'}
      </button>
    );
  } else {
    action = (
      <button
        onClick={() => run(startCheckout)}
        disabled={busy}
        className="rounded-full bg-sky-600 px-6 py-3 text-base font-bold text-white hover:bg-sky-700 disabled:opacity-60"
      >
        {busy ? 'Opening…' : canTrial ? `Start ${PLAN.trialDays} days free` : 'Subscribe'}
      </button>
    );
  }

  return (
    <div>
      <h1 className="dv-title text-3xl">{PLAN.name}</h1>
      <p className="mt-1 text-gray-600">Unlimited photos and videos, a boost in the feed, a golden frame and your own logbook.</p>

      {checkout === 'success' && (
        <p className="dv-pop mt-4 rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-700">
          {access.can_post_media ? '🎉 Welcome to DiveING Plus! Unlimited uploads, your golden frame and the logbook are ready.' : 'Thank you! We are activating your plan, this takes a few seconds…'}
        </p>
      )}
      {checkout === 'cancelled' && (
        <p className="mt-4 rounded-2xl bg-white/5 px-4 py-3 text-sm text-gray-600">No problem, nothing was charged.</p>
      )}

      <section className="dv-glass dv-rise mt-5 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="dv-title text-4xl">
              {PLAN.price}
              <span className="text-base font-semibold text-gray-500"> / {PLAN.period}</span>
            </div>
            {canTrial && <div className="mt-1 text-sm font-semibold text-emerald-600">First {PLAN.trialDays} days free</div>}
          </div>
          <div>{action}</div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {on && (
          <dl className="mt-4 grid gap-2 border-t border-gray-200 pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Status</dt>
              <dd className="font-semibold">
                {s === 'trialing' ? `Free trial until ${fmtDate(access.trial_end)}` : s === 'past_due' ? 'Payment problem: please update your card' : 'Active'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">
                {access.cancel_at_period_end ? 'Ends on' : s === 'trialing' ? 'First payment' : 'Next payment'}
              </dt>
              <dd className="font-semibold">{fmtDate(access.current_period_end)}</dd>
            </div>
            {access.cancel_at_period_end && (
              <p className="sm:col-span-2 rounded-xl bg-amber-500/15 px-3 py-2 text-xs text-amber-700">
                Your subscription is cancelled and ends on {fmtDate(access.current_period_end)}. Photos and videos you posted with Plus are deleted 30 days after that, unless you subscribe again. Uploads within the free limit stay.
              </p>
            )}
          </dl>
        )}

        {ended && (
          <p className="mt-4 rounded-xl bg-amber-500/15 px-3 py-2 text-sm text-amber-700">
            Your subscription ended. Photos and videos you posted with Plus will be deleted on <b>{fmtDate(access.purge_at)}</b>. Subscribe again before that day to keep everything. Your logbook is never deleted.
          </p>
        )}
      </section>

      <section className="dv-glass dv-rise mt-4 overflow-hidden rounded-3xl" style={{ ['--d' as string]: '80ms' }}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 font-semibold" />
              <th className="px-2 py-3 text-center font-semibold">Visitor</th>
              <th className="px-2 py-3 text-center font-semibold">Free account</th>
              <th className="px-2 py-3 text-center font-semibold text-sky-700">Plus</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label} className="border-t border-gray-200">
                <td className="px-4 py-2.5">{r.label}</td>
                <td className="px-2 py-2.5 text-center text-gray-500">{mark(r.visitor)}</td>
                <td className="px-2 py-2.5 text-center text-gray-500">{mark(r.free)}</td>
                <td className="px-2 py-2.5 text-center font-bold text-emerald-600">{mark(r.plus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <ul className="mt-4 space-y-1.5 px-1 text-xs text-gray-500">
        <li>• {canTrial ? `You are not charged during the ${PLAN.trialDays}-day trial. After it, ${PLAN.price} per month.` : `${PLAN.price} per month.`} Cancel any time in “Manage subscription”.</li>
        <li>• If your subscription ends, the photos and videos you posted with Plus are deleted after {PLAN.purgeDays} days. Posts within the free {PLAN.freeUploads} per month, spots, reviews and your logbook entries are never deleted.</li>
        <li>• Payments are handled by Stripe. We never see your card number.</li>
      </ul>
    </div>
  );
}
