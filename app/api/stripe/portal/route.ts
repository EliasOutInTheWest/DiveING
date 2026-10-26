import { NextResponse } from 'next/server';
import { adminClient, userFromRequest } from '@/lib/server/admin';
import { getStripe, siteUrl } from '@/lib/server/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST: Stripe's page where the customer can cancel, change the card, see invoices
export async function POST(req: Request) {
  try {
    const user = await userFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });

    const { data: row } = await adminClient()
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!row?.stripe_customer_id) {
      return NextResponse.json({ error: 'You have no subscription yet.' }, { status: 404 });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${siteUrl(req)}/subscribe`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('portal error:', e);
    return NextResponse.json({ error: 'Could not open the subscription page. Please try again.' }, { status: 500 });
  }
}
