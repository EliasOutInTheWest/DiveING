export const CERT_LEVELS = [
  { value: 'not_certified', label: 'Not certified yet' },
  { value: 'open_water', label: 'Open Water Diver' },
  { value: 'advanced_open_water', label: 'Advanced Open Water' },
  { value: 'rescue', label: 'Rescue Diver' },
  { value: 'divemaster', label: 'Divemaster' },
  { value: 'instructor', label: 'Instructor' },
] as const;

export const CERT_AGENCIES = ['PADI', 'SSI', 'NAUI', 'CMAS', 'BSAC', 'SDI', 'Other'] as const;

export function certLabel(value: string | null): string {
  return CERT_LEVELS.find((l) => l.value === value)?.label ?? '—';
}
