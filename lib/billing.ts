import { supabase } from '@/lib/supabase';

export const PLAN = {
  name: 'DiveING Plus',
  price: '$1.99',
  period: 'month',
  trialDays: 14,
  purgeDays: 30,
};

export type Access = {
  registered: boolean;
  admin: boolean;
  status: string; // none | trialing | active | past_due | canceled | ...
  can_post_media: boolean;
  had_trial?: boolean;
  trial_end?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  ended_at?: string | null;
  purge_at?: string | null;
};

export const NO_ACCESS: Access = { registered: false, admin: false, status: 'none', can_post_media: false };

async function call(path: string): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please log in first.');
  const res = await fetch(path, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error ?? 'Something went wrong. Please try again.');
  return json.url;
}

// Opens Stripe's checkout page (14 days free, then $1.99 / month)
export async function startCheckout() {
  window.location.href = await call('/api/stripe/checkout');
}

// Opens Stripe's page for cancelling, changing the card, invoices
export async function openPortal() {
  window.location.href = await call('/api/stripe/portal');
}

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
