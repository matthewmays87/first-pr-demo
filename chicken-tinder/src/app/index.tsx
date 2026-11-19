import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { COLORS } from '@/lib/constants';

export default function Home() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🍗</Text>
        <Text style={styles.title}>Chicken Tinder</Text>
        <Text style={styles.tagline}>Swipe together. Eat sooner.</Text>
      </View>

      <View style={styles.actions}>
        <Button title="Create a Room" onPress={() => router.push('/create')} />
        <Button title="Join with a Code" variant="secondary" onPress={() => router.push('/join')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg, padding: 24, justifyContent: 'space-between' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emoji: { fontSize: 96 },
  title: { fontSize: 40, fontWeight: '900', color: COLORS.primaryDark },
  tagline: { fontSize: 18, color: COLORS.muted },
  actions: { gap: 12, paddingBottom: 16 },
});
