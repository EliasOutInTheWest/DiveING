import type { Metadata } from 'next';
import FeedApp from '@/components/FeedApp';

export const metadata: Metadata = {
  title: 'Feed – DiveING',
  description: 'Photos and videos from dive spots, recommended for you.',
};

export default function FeedPage() {
  return (
    <main className="h-dvh w-screen bg-black">
      <FeedApp />
    </main>
  );
}
