export type PriceLevel =
  | 'PRICE_LEVEL_FREE'
  | 'PRICE_LEVEL_INEXPENSIVE'
  | 'PRICE_LEVEL_MODERATE'
  | 'PRICE_LEVEL_EXPENSIVE'
  | 'PRICE_LEVEL_VERY_EXPENSIVE';

/** One card in the deck. Shape is set by supabase/functions/places-nearby. */
export type Restaurant = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  ratingCount: number | null;
  priceLevel: PriceLevel | null;
  cuisine: string | null;
  hours: string[]; // Monday-first, e.g. "Monday: 11:00 AM – 9:00 PM"
  photoUrl: string | null;
  lat: number | null;
  lng: number | null;
};

export type Room = {
  id: string;
  code: string;
  host_id: string;
  guest_id: string | null;
  radius_miles: number;
  price_levels: PriceLevel[] | null;
  cuisine: string | null;
  lat: number | null;
  lng: number | null;
  restaurants: Restaurant[];
  status: 'waiting' | 'active' | 'closed';
  created_at: string;
};

export type Match = {
  room_id: string;
  place_id: string;
  created_at: string;
};
