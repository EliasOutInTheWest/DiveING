import type { Metadata } from 'next';
import PeopleSearch from '@/components/social/PeopleSearch';
import SocialShell from '@/components/social/SocialShell';

export const metadata: Metadata = {
  title: 'People – DiveING',
  description: 'Find divers, hikers, campers and other adventurers and follow them.',
};

export default function PeoplePage() {
  return (
    <SocialShell>
      <h1 className="dv-title mb-4 text-3xl">Find people</h1>
      <PeopleSearch />
    </SocialShell>
  );
}
