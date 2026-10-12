'use client';

import Link from 'next/link';
import { useState } from 'react';
import { activityOf } from '@/lib/activities';
import { certLabel } from '@/lib/certs';
import { displayName, type Person } from '@/lib/people';
import Avatar from '@/components/social/Avatar';
import FollowButton from '@/components/social/FollowButton';

// One row in a list of people: picture, name, short info, follow button
export default function PersonRow({ person, onNavigate }: { person: Person; onNavigate?: () => void }) {
  const [following, setFollowing] = useState(person.is_following);
  const acts = (person.activities ?? []).slice(0, 4);
  const info = [person.cert_level ? certLabel(person.cert_level) : null, `${person.follower_count} follower${person.follower_count === 1 ? '' : 's'}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="flex items-center gap-3 py-3">
      <Link href={`/u/${person.username}`} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={person.username} path={person.avatar_url} size={48} />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-gray-900">{displayName(person)}</span>
            {person.follows_me && (
              <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                Follows you
              </span>
            )}
          </span>
          <span className="block truncate text-xs text-gray-500">
            @{person.username} · {info}
          </span>
          {person.bio && <span className="mt-0.5 block truncate text-xs text-gray-600">{person.bio}</span>}
          {acts.length > 0 && (
            <span className="mt-1 flex gap-1" aria-label="Favourite activities">
              {acts.map((a) => (
                <span key={a} title={activityOf(a).label} className="text-sm">
                  {activityOf(a).emoji}
                </span>
              ))}
            </span>
          )}
        </span>
      </Link>
      <FollowButton targetId={person.id} following={following} onChange={setFollowing} small />
    </li>
  );
}
