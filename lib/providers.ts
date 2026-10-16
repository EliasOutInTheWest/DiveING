import { activityOf } from '@/lib/activities';

// What kind of business a "school" row is. The activity says WHAT (diving, biking, ...),
// the type says HOW (lessons, rental, shop, guided tours).
// To add a type: add it here AND in the check constraint of providers.sql.
export type ProviderType = { value: string; label: string; noun: string; emoji: string };

export const PROVIDER_TYPES: ProviderType[] = [
  { value: 'school', label: 'School / courses', noun: 'school', emoji: '🎓' },
  { value: 'rental', label: 'Rental', noun: 'rental', emoji: '🔑' },
  { value: 'shop', label: 'Shop', noun: 'shop', emoji: '🛍️' },
  { value: 'tours', label: 'Guided tours', noun: 'tours', emoji: '🧭' },
];

export const PROVIDER_VALUES = PROVIDER_TYPES.map((t) => t.value);

export function providerTypeOf(value: string | null | undefined): ProviderType {
  return PROVIDER_TYPES.find((t) => t.value === value) ?? PROVIDER_TYPES[0];
}

const NOUN: Record<string, string> = {
  diving: 'Dive',
  hiking: 'Hiking',
  camping: 'Camping',
  biking: 'Bike',
  climbing: 'Climbing',
  paddling: 'Paddling',
};

// "Bike rental", "Dive shop", "Paddling tours" ...
export function providerName(activity: string | null | undefined, type: string | null | undefined): string {
  const a = activityOf(activity);
  return `${NOUN[a.value] ?? a.label} ${providerTypeOf(type).noun}`;
}
