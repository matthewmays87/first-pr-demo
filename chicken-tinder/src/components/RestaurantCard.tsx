import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS, priceLabel, todaysHours } from '@/lib/constants';
import type { Restaurant } from '@/lib/types';

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const price = priceLabel(restaurant.priceLevel);
  const hours = todaysHours(restaurant.hours);
  const subtitle = [restaurant.cuisine, price].filter(Boolean).join(' · ');

  return (
    <View style={styles.card}>
      {restaurant.photoUrl ? (
        <Image
          source={{ uri: restaurant.photoUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noPhoto]}>
          <Text style={styles.noPhotoEmoji}>🍗</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {restaurant.name}
        </Text>
        {subtitle ? <Text style={styles.line}>{subtitle}</Text> : null}
        {restaurant.rating != null ? (
          <Text style={styles.line}>
            ★ {restaurant.rating.toFixed(1)}
            {restaurant.ratingCount ? ` (${restaurant.ratingCount.toLocaleString()})` : ''}
          </Text>
        ) : null}
        {hours ? (
          <Text style={styles.small} numberOfLines={1}>
            {hours}
          </Text>
        ) : null}
        <Text style={styles.small} numberOfLines={1}>
          {restaurant.address}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  noPhoto: {
    backgroundColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPhotoEmoji: { fontSize: 96 },
  info: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 18,
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  name: { color: '#fff', fontSize: 26, fontWeight: '800' },
  line: { color: '#fff', fontSize: 16, fontWeight: '600' },
  small: { color: '#E7E5E4', fontSize: 13 },
});
