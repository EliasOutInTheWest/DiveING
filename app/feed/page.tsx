import type { Metadata } from 'next';
import FeedApp from '@/components/FeedApp';
import { font } from '@/components/theme/font';
import '@/components/theme/theme.css';

export const metadata: Metadata = {
  title: 'Feed – DiveING',
  description: 'Photos and videos from dive spots, recommended for you.',
};

export default function FeedPage() {
  return (
    <main className={`dv dv-feed ${font.variable} h-dvh w-screen`}>
      <FeedApp />
    </main>
  );
}
