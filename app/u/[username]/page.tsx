import type { Metadata } from 'next';
import ProfileView from '@/components/social/ProfileView';
import SocialShell from '@/components/social/SocialShell';

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username)} – DiveING` };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  return (
    <SocialShell wide>
      <ProfileView username={decodeURIComponent(username)} />
    </SocialShell>
  );
}
