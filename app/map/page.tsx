import type { Metadata } from 'next';
import MapApp from '@/components/MapApp';
import { font } from '@/components/theme/font';
import '@/components/theme/theme.css';

export const metadata: Metadata = {
  title: 'Map – DiveING',
  description: 'Dive spots, dive schools, boat routes, depth map, photos and reviews.',
};

export default function MapPage() {
  return (
    <main className={`dv ${font.variable} h-screen w-screen`}>
      <MapApp />
    </main>
  );
}
