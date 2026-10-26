import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { adminClient } from '@/lib/server/admin';
import { getStripe, saveSubscription } from '@/lib/server/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Stripe calls this URL whenever a subscription changes.
// The signature proves that the call really comes from Stripe.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get('stripe-signature');
  if (!secret) return NextResponse.json({ error: 'Webhook secret missing.' }, { status: 500 });
  if (!signature) return NextResponse.json({ error: 'No signature.' }, { status: 400 });

  const stripe = getStripe();
  const raw = await req.text(); // must be the untouched body

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, signature, secret);
  } catch {
    return NextResponse.json({ error: 'Bad signature.' }, { status: 400 });
  }

  try {
    const admin = adminClient();
    const at = new Date(event.created * 1000);

    // which user does this subscription belong to?
    async function userOf(sub: Stripe.Subscription): Promise<string | null> {
      if (sub.metadata?.user_id) return sub.metadata.user_id;
      const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const { data } = await admin.from('subscriptions').select('user_id').eq('stripe_customer_id', customer).maybeSingle();
      return (data as { user_id: string } | null)?.user_id ?? null;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      const userId = session.client_reference_id ?? session.metadata?.user_id ?? null;
      if (subId && userId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        await saveSubscription(admin, userId, sub, at);
      }
    } else if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await userOf(sub);
      if (userId) await saveSubscription(admin, userId, sub, at);
      else console.warn('webhook: subscription without a known user', sub.id);
    }
    // all other events are ignored on purpose
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('webhook error:', e);
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 }); // Stripe tries again later
  }
}
