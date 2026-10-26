import { NextResponse } from 'next/server';
import { adminClient, userFromRequest } from '@/lib/server/admin';
import { getStripe, siteUrl, TRIAL_DAYS } from '@/lib/server/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST: start the Stripe checkout (14 days free, then $1.99 / month)
export async function POST(req: Request) {
  try {
    const user = await userFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });
    if (!user.email_confirmed_at) {
      return NextResponse.json({ error: 'Please confirm your email address first.' }, { status: 403 });
    }
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) return NextResponse.json({ error: 'The subscription is not set up yet.' }, { status: 500 });

    const admin = adminClient();
    const stripe = getStripe();

    const { data: row } = await admin
      .from('subscriptions')
      .select('stripe_customer_id,status,had_trial')
      .eq('user_id', user.id)
      .maybeSingle();

    if (row && ['trialing', 'active', 'past_due'].includes(row.status)) {
      return NextResponse.json({ error: 'You already have DiveING Plus.', code: 'already_subscribed' }, { status: 409 });
    }

    // one Stripe customer per user
    let customerId: string | null = row?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
      customerId = customer.id;
      if (row) await admin.from('subscriptions').update({ stripe_customer_id: customerId }).eq('user_id', user.id);
      else await admin.from('subscriptions').insert({ user_id: user.id, stripe_customer_id: customerId, status: 'none' });
    }

    const site = siteUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { user_id: user.id },
        // the free trial only for people who never had one
        ...(row?.had_trial ? {} : { trial_period_days: TRIAL_DAYS }),
      },
      metadata: { user_id: user.id },
      success_url: `${site}/subscribe?checkout=success`,
      cancel_url: `${site}/subscribe?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('checkout error:', e);
    return NextResponse.json({ error: 'Could not start the checkout. Please try again.' }, { status: 500 });
  }
}
