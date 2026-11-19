import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Button } from '@/components/Button';
import { COLORS } from '@/lib/constants';
import { ensureSession } from '@/lib/supabase';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Every phone gets an invisible anonymous account so database rules know who's who.
  useEffect(() => {
    ensureSession()
      .then(() => setReady(true))
      .catch((e: Error) => setError(e.message));
  }, [attempt]);

  if (!ready) {
    return (
      <View style={styles.center}>
        {error ? (
          <>
            <Text style={styles.error}>Couldn&apos;t connect: {error}</Text>
            <Button
              title="Try again"
              onPress={() => {
                setError(null);
                setAttempt((a) => a + 1);
              }}
            />
          </>
        ) : (
          <ActivityIndicator size="large" color={COLORS.primary} />
        )}
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.bg },
          headerTintColor: COLORS.primaryDark,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.bg },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="create" options={{ title: 'New Room' }} />
        <Stack.Screen name="join" options={{ title: 'Join Room' }} />
        <Stack.Screen name="room/[id]" options={{ title: '' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: COLORS.bg,
  },
  error: { color: COLORS.pass, textAlign: 'center', fontSize: 16 },
});
