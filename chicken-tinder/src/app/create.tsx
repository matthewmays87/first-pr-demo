import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { COLORS, CUISINE_OPTIONS, PRICE_OPTIONS, RADIUS_OPTIONS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { PriceLevel, Room } from '@/lib/types';

export default function CreateRoom() {
  const [radius, setRadius] = useState(10);
  const [prices, setPrices] = useState<PriceLevel[]>([]);
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const togglePrice = (p: PriceLevel) =>
    setPrices((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const start = async () => {
    setBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Location needed', 'We need your location to find restaurants near you.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      const { data, error } = await supabase.rpc('create_room', {
        p_radius_miles: radius,
        p_price_levels: prices.length ? prices : null,
        p_cuisine: cuisine,
        p_lat: pos.coords.latitude,
        p_lng: pos.coords.longitude,
      });
      if (error) throw error;

      // The room screen kicks off the one-time Google fetch.
      router.replace({ pathname: '/room/[id]', params: { id: (data as Room).id } });
    } catch (e) {
      Alert.alert('Could not create room', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>How far? (miles)</Text>
        <View style={styles.row}>
          {RADIUS_OPTIONS.map((r) => (
            <Chip key={r} label={`${r} mi`} selected={radius === r} onPress={() => setRadius(r)} />
          ))}
        </View>

        <Text style={styles.label}>Price (pick any, or none for all)</Text>
        <View style={styles.row}>
          {PRICE_OPTIONS.map((p) => (
            <Chip
              key={p.value}
              label={p.label}
              selected={prices.includes(p.value)}
              onPress={() => togglePrice(p.value)}
            />
          ))}
        </View>

        <Text style={styles.label}>Cuisine</Text>
        <View style={styles.row}>
          {CUISINE_OPTIONS.map((c) => (
            <Chip
              key={c.label}
              label={c.label}
              selected={cuisine === c.value}
              onPress={() => setCuisine(c.value)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Start Room" onPress={start} loading={busy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, gap: 12 },
  label: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { padding: 20, paddingBottom: 36 },
});
