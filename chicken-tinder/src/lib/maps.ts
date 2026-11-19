import { Linking } from 'react-native';

import type { Restaurant } from './types';

export function appleMapsUrl(r: Restaurant): string {
  const params = new URLSearchParams({ q: r.name, address: r.address });
  if (r.lat != null && r.lng != null) params.set('ll', `${r.lat},${r.lng}`);
  return `https://maps.apple.com/?${params.toString()}`;
}

export function googleMapsUrl(r: Restaurant): string {
  const params = new URLSearchParams({
    api: '1',
    query: `${r.name}, ${r.address}`,
    query_place_id: r.id,
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function openInAppleMaps(r: Restaurant) {
  return Linking.openURL(appleMapsUrl(r));
}

export function openInGoogleMaps(r: Restaurant) {
  return Linking.openURL(googleMapsUrl(r));
}
