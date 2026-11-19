import type { PriceLevel } from './types';

export const COLORS = {
  primary: '#F97316',
  primaryDark: '#C2410C',
  like: '#16A34A',
  pass: '#DC2626',
  bg: '#FFF7ED',
  card: '#FFFFFF',
  text: '#1C1917',
  muted: '#78716C',
  border: '#E7E5E4',
};

export const RADIUS_OPTIONS = [5, 10, 15, 20, 25];

export const PRICE_OPTIONS: { value: PriceLevel; label: string }[] = [
  { value: 'PRICE_LEVEL_INEXPENSIVE', label: '$' },
  { value: 'PRICE_LEVEL_MODERATE', label: '$$' },
  { value: 'PRICE_LEVEL_EXPENSIVE', label: '$$$' },
  { value: 'PRICE_LEVEL_VERY_EXPENSIVE', label: '$$$$' },
];

// Values are Google Places "place types" so they can go straight into Nearby Search.
export const CUISINE_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: 'Anything' },
  { value: 'american_restaurant', label: 'American' },
  { value: 'mexican_restaurant', label: 'Mexican' },
  { value: 'italian_restaurant', label: 'Italian' },
  { value: 'pizza_restaurant', label: 'Pizza' },
  { value: 'hamburger_restaurant', label: 'Burgers' },
  { value: 'barbecue_restaurant', label: 'BBQ' },
  { value: 'chinese_restaurant', label: 'Chinese' },
  { value: 'japanese_restaurant', label: 'Japanese' },
  { value: 'sushi_restaurant', label: 'Sushi' },
  { value: 'thai_restaurant', label: 'Thai' },
  { value: 'indian_restaurant', label: 'Indian' },
  { value: 'vietnamese_restaurant', label: 'Vietnamese' },
  { value: 'mediterranean_restaurant', label: 'Mediterranean' },
  { value: 'seafood_restaurant', label: 'Seafood' },
  { value: 'steak_house', label: 'Steak' },
  { value: 'breakfast_restaurant', label: 'Breakfast' },
];

export function priceLabel(level: PriceLevel | null): string | null {
  if (!level) return null;
  if (level === 'PRICE_LEVEL_FREE') return 'Free';
  return PRICE_OPTIONS.find((p) => p.value === level)?.label ?? null;
}

/** Today's line from Google's Monday-first weekdayDescriptions. */
export function todaysHours(hours: string[]): string | null {
  if (hours.length !== 7) return null;
  const mondayFirstIndex = (new Date().getDay() + 6) % 7;
  return hours[mondayFirstIndex];
}
