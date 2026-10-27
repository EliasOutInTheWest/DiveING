import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------
// XP, levels and achievements (the numbers live in progress.sql;
// this file only has names, icons and colours).
// ---------------------------------------------------------------

export type Tier = { index: number; name: string; color: string };

// 0 = the "first" step, then bronze ... emerald
export const TIERS: Tier[] = [
  { index: 0, name: 'First', color: '#a78bfa' },
  { index: 1, name: 'Bronze', color: '#cd7f32' },
  { index: 2, name: 'Silver', color: '#cbd5e1' },
  { index: 3, name: 'Gold', color: '#facc15' },
  { index: 4, name: 'Diamond', color: '#67e8f9' },
  { index: 5, name: 'Emerald', color: '#34d399' },
];

export type Track = {
  track: string;
  name: string; // "Reviewer" -> "Gold Reviewer"
  first: string; // name of the first achievement
  icon: string;
  unit: string; // "reviews written"
};

export const TRACKS: Track[] = [
  { track: 'spots', name: 'Spot Scout', first: 'First Spot', icon: '📍', unit: 'spots added' },
  { track: 'reviews', name: 'Reviewer', first: 'First Review', icon: '⭐', unit: 'reviews written' },
  { track: 'photos', name: 'Poster', first: 'First Photo', icon: '📸', unit: 'photos posted' },
  { track: 'videos', name: 'Filmmaker', first: 'First Video', icon: '🎬', unit: 'videos posted' },
  { track: 'followers', name: 'Crowd Magnet', first: 'First Follower', icon: '👥', unit: 'followers' },
  { track: 'likes', name: 'Fan Favourite', first: 'First Like', icon: '❤️', unit: 'likes on your posts' },
];

export const trackOf = (track: string) => TRACKS.find((t) => t.track === track) ?? TRACKS[0];

export function achievementTitle(track: string, tier: number): string {
  const t = trackOf(track);
  return tier === 0 ? t.first : `${TIERS[tier]?.name ?? ''} ${t.name}`;
}

// "spots_3" -> { track: 'spots', tier: 3 }
export function parseCode(code: string): { track: string; tier: number } {
  const i = code.lastIndexOf('_');
  return { track: code.slice(0, i), tier: Number(code.slice(i + 1)) };
}

export const XP_RULES = [
  { icon: '📍', text: 'Add a spot', xp: 50 },
  { icon: '🎬', text: 'Post a video', xp: 25 },
  { icon: '⭐', text: 'Write a review', xp: 20 },
  { icon: '📸', text: 'Post a photo', xp: 10 },
  { icon: '👥', text: 'Get a follower', xp: 5 },
  { icon: '❤️', text: 'Get a like on a post', xp: 2 },
];

export function levelTitle(level: number): { title: string; color: string } {
  if (level < 5) return { title: 'Newcomer', color: '#38bdf8' };
  if (level < 10) return { title: 'Explorer', color: '#34d399' };
  if (level < 20) return { title: 'Adventurer', color: '#facc15' };
  if (level < 30) return { title: 'Trailblazer', color: '#fb923c' };
  if (level < 40) return { title: 'Veteran', color: '#f472b6' };
  return { title: 'Legend', color: '#a78bfa' };
}

export type Progress = {
  xp: number;
  level: number;
  level_start_xp: number;
  next_level_xp: number;
  counts: Record<string, number>;
  achievements: { code: string; earned_at: string }[];
  showcase: string[]; // codes the owner picked to show off (3, or 6 with Plus)
  plus?: boolean; // DiveING Plus member
  plus_boost_xp?: number; // XP that comes from the Plus boost
  showcase_slots?: number; // 3, or 6 with Plus
  old_level?: number; // only after sync_progress
  new_achievements?: string[]; // only after sync_progress
};

export type Def = { code: string; track: string; tier: number; threshold: number; bonus_xp: number };

let defsPromise: Promise<Def[]> | null = null;
export function loadDefs(): Promise<Def[]> {
  if (!defsPromise) {
    defsPromise = (async () => {
      const { data, error } = await supabase
        .from('achievement_defs')
        .select('code,track,tier,threshold,bonus_xp')
        .order('track')
        .order('tier');
      if (error || !data) {
        defsPromise = null; // try again next time
        return [];
      }
      return data as Def[];
    })();
  }
  return defsPromise;
}

export async function getProgress(userId: string): Promise<Progress | null> {
  const { data, error } = await supabase.rpc('get_progress', { p_user: userId });
  if (error || !data) return null;
  return data as Progress;
}

// Asks the database to hand out new achievements to the logged-in user, and shows
// a pop-up for new achievements / a new level. Safe to call often.
let running: Promise<Progress | null> | null = null;
export function checkProgress(): Promise<Progress | null> {
  if (running) return running;
  running = (async () => {
    try {
      const { data, error } = await supabase.rpc('sync_progress');
      if (error || !data) return null;
      const p = data as Progress;
      const leveled = p.old_level != null && p.level > p.old_level;
      if (typeof window !== 'undefined' && ((p.new_achievements?.length ?? 0) > 0 || leveled)) {
        window.dispatchEvent(new CustomEvent('dv-progress', { detail: p }));
      }
      return p;
    } catch {
      return null;
    } finally {
      setTimeout(() => {
        running = null;
      }, 800);
    }
  })();
  return running;
}
