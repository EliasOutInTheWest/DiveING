import { supabase } from '@/lib/supabase';
import { withPlus } from '@/lib/plus';

// One person in a list (search results, followers, following). Only public information.
export type Person = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  cert_level: string | null;
  activities: string[] | null;
  follower_count: number;
  is_following: boolean;
  follows_me: boolean;
  is_plus?: boolean; // DiveING Plus: gold frame
};

// A full public profile
export type PublicProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  cert_level: string | null;
  cert_agency: string | null;
  dive_count: number | null;
  activities: string[] | null;
  created_at: string;
  show_follow_lists: boolean;
  post_count: number;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  follows_me: boolean;
  is_plus?: boolean;
};

export const PEOPLE_PAGE = 20;

export async function searchPeople(query: string, offset = 0): Promise<{ data: Person[]; error: string | null }> {
  const { data, error } = await supabase.rpc('search_people', {
    p_query: query,
    p_limit: PEOPLE_PAGE,
    p_offset: offset,
  });
  return { data: await withPlus((data as Person[] | null) ?? []), error: error ? error.message : null };
}

export async function listFollows(
  userId: string,
  kind: 'followers' | 'following',
  offset = 0
): Promise<{ data: Person[]; error: string | null }> {
  const { data, error } = await supabase.rpc('list_follows', {
    p_user: userId,
    p_kind: kind,
    p_limit: PEOPLE_PAGE,
    p_offset: offset,
  });
  return { data: await withPlus((data as Person[] | null) ?? []), error: error ? error.message : null };
}

export async function getProfile(username: string): Promise<{ data: PublicProfile | null; error: string | null }> {
  const { data, error } = await supabase.rpc('get_profile', { p_username: username });
  const row = Array.isArray(data) ? (data[0] as PublicProfile | undefined) : undefined;
  const [withFlag] = row ? await withPlus([row]) : [];
  return { data: withFlag ?? null, error: error ? error.message : null };
}

export const displayName = (p: { username: string; display_name: string | null }) => p.display_name?.trim() || p.username;
