import { Image } from 'expo-image';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';

import { COLORS, priceLabel } from '@/lib/constants';
import { openInAppleMaps, openInGoogleMaps } from '@/lib/maps';
import type { Restaurant } from '@/lib/types';

import { Button } from './Button';

type Props = {
  restaurant: Restaurant | null;
  onClose: () => void;
};

export function MatchModal({ restaurant, onClose }: Props) {
  return (
    <Modal visible={!!restaurant} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {restaurant ? (
          <View style={styles.sheet}>
            <Text style={styles.title}>It&apos;s a Match! 🍗</Text>

            {restaurant.photoUrl ? (
              <Image source={{ uri: restaurant.photoUrl }} style={styles.photo} contentFit="cover" />
            ) : (
              <View style={[styles.photo, styles.noPhoto]}>
                <Text style={{ fontSize: 72 }}>🍗</Text>
              </View>
            )}

            <Text style={styles.name}>{restaurant.name}</Text>
            <Text style={styles.meta}>
              {[
                restaurant.rating != null ? `★ ${restaurant.rating.toFixed(1)}` : null,
                priceLabel(restaurant.priceLevel),
                restaurant.cuisine,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <Text style={styles.address}>{restaurant.address}</Text>

            <View style={styles.actions}>
              {Platform.OS === 'ios' ? (
                <>
                  <Button title="Open in Apple Maps" onPress={() => openInAppleMaps(restaurant)} />
                  <Button
                    title="Open in Google Maps"
                    variant="secondary"
                    onPress={() => openInGoogleMaps(restaurant)}
                  />
                </>
              ) : (
                <Button title="Open in Google Maps" onPress={() => openInGoogleMaps(restaurant)} />
              )}
              <Button title="Keep swiping" variant="ghost" onPress={onClose} />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  photo: { width: '100%', height: 220, borderRadius: 16 },
  noPhoto: { backgroundColor: '#FED7AA', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 8 },
  meta: { fontSize: 16, color: COLORS.text },
  address: { fontSize: 14, color: COLORS.muted },
  actions: { gap: 10, marginTop: 12 },
});
