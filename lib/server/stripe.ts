import 'server-only';
import Stripe from 'stripe';

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set.');
  stripe = new Stripe(key);
  return stripe;
}

// Where Stripe sends people back to
export function siteUrl(req: Request): string {
  const fixed = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (fixed) return fixed;
  return new URL(req.url).origin;
}

export const TRIAL_DAYS = 14;

// Writes the state of a Stripe subscription into the database.
// The SQL function ignores events that arrive late (older than the saved one).
export async function saveSubscription(
  admin: import('@supabase/supabase-js').SupabaseClient,
  userId: string,
  sub: Stripe.Subscription,
  eventAt: Date
) {
  const periodEnd = sub.items?.data?.[0]?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end ?? null;
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const { error } = await admin.rpc('apply_subscription', {
    p_user: userId,
    p_customer: customer,
    p_subscription: sub.id,
    p_status: sub.status,
    p_trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    p_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    p_cancel_at_end: sub.cancel_at_period_end,
    p_event_at: eventAt.toISOString(),
  });
  if (error) throw new Error(`apply_subscription failed: ${error.message}`);
}
