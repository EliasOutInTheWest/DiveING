import type { Metadata } from 'next';
import MapApp from '@/components/MapApp';

export const metadata: Metadata = {
  title: 'Map – DiveING',
  description: 'Dive spots, dive schools, boat routes, depth map, photos and reviews.',
};

export default function MapPage() {
  return (
    <main className="h-screen w-screen">
      <MapApp />
    </main>
  );
}
