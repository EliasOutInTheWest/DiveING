import type { Metadata } from 'next';
import SubscribeView from '@/components/billing/SubscribeView';
import SocialShell from '@/components/social/SocialShell';

export const metadata: Metadata = {
  title: 'DiveING Plus',
  description: 'Post photos and videos. 14 days free, then $1.99 per month.',
};

type Props = { searchParams: Promise<{ checkout?: string }> };

export default async function SubscribePage({ searchParams }: Props) {
  const { checkout } = await searchParams;
  return (
    <SocialShell>
      <SubscribeView checkout={checkout} />
    </SocialShell>
  );
}
