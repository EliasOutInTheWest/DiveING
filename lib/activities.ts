// The activities of the adventure map.
// To add one later: add it here AND in the check constraints of activities.sql.

export type Activity = {
  value: string;
  label: string; // "Diving"
  emoji: string;
  color: string; // pin colour on the map
  spot: string; // what a spot of this activity is called
  provider: string; // what a school / provider of this activity is called
};

export const ACTIVITIES: Activity[] = [
  { value: 'diving', label: 'Diving', emoji: '🤿', color: '#0ea5e9', spot: 'Dive spot', provider: 'Dive school' },
  { value: 'hiking', label: 'Hiking', emoji: '🥾', color: '#16a34a', spot: 'Hiking spot', provider: 'Hiking guide / club' },
  { value: 'camping', label: 'Camping', emoji: '⛺', color: '#d97706', spot: 'Campsite', provider: 'Camping provider' },
  { value: 'biking', label: 'Biking', emoji: '🚴', color: '#9333ea', spot: 'Biking spot', provider: 'Bike shop / tours' },
  { value: 'climbing', label: 'Climbing', emoji: '🧗', color: '#dc2626', spot: 'Climbing spot', provider: 'Climbing gym / guide' },
  { value: 'paddling', label: 'Paddling', emoji: '🛶', color: '#0d9488', spot: 'Paddling spot', provider: 'Paddling school / rental' },
];

export const ACTIVITY_VALUES = ACTIVITIES.map((a) => a.value);

const FALLBACK: Activity = ACTIVITIES[0];

export function activityOf(value: string | null | undefined): Activity {
  return ACTIVITIES.find((a) => a.value === value) ?? FALLBACK;
}

export const activityLabel = (value: string | null | undefined) => activityOf(value).label;

// Keeps only known values, no duplicates, in the order of the list above
export function cleanActivities(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return ACTIVITY_VALUES.filter((v) => list.includes(v));
}

// Does something with this activity belong to the user's choice? (empty choice = everything)
export function matchesActivities(chosen: string[], activity: string | null | undefined): boolean {
  return chosen.length === 0 || chosen.includes(activity ?? 'diving');
}

export const ACTIVITIES_STORAGE_KEY = 'diveing-activities';

export function readStoredActivities(): string[] {
  try {
    return cleanActivities(JSON.parse(window.localStorage.getItem(ACTIVITIES_STORAGE_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function storeActivities(list: string[]) {
  try {
    window.localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // private mode etc.: the choice just is not remembered
  }
}
