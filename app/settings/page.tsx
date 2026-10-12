import type { Metadata } from 'next';
import SettingsForm from '@/components/social/SettingsForm';
import SocialShell from '@/components/social/SocialShell';

export const metadata: Metadata = { title: 'Settings – DiveING' };

export default function SettingsPage() {
  return (
    <SocialShell>
      <SettingsForm />
    </SocialShell>
  );
}
