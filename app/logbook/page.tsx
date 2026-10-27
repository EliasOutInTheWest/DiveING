import type { Metadata } from 'next';
import LogbookView from '@/components/logbook/LogbookView';
import SocialShell from '@/components/social/SocialShell';

export const metadata: Metadata = { title: 'My logbook – DiveING' };

export default function LogbookPage() {
  return (
    <SocialShell>
      <LogbookView />
    </SocialShell>
  );
}
