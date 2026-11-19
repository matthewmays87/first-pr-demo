import { FunctionsHttpError } from '@supabase/supabase-js';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { MatchModal } from '@/components/MatchModal';
import { SwipeDeck } from '@/components/SwipeDeck';
import { useMatches } from '@/hooks/useMatches';
import { useRoom } from '@/hooks/useRoom';
import { COLORS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { Restaurant } from '@/lib/types';

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { room, error: roomError } = useRoom(id);
  const { matches, newMatch, dismissNewMatch } = useMatches(id);

  const [userId, setUserId] = useState<string | null>(null);
  const [swiped, setSwiped] = useState<Set<string> | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const fetchStarted = useRef(false);

  // Who am I, and which cards have I already swiped (so re-opening the app resumes)?
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data } = await supabase
        .from('swipes')
        .select('place_id')
        .eq('room_id', id)
        .eq('user_id', uid);
      setSwiped(new Set((data ?? []).map((r) => r.place_id as string)));
    })();
  }, [id]);

  const isHost = !!room && !!userId && room.host_id === userId;

  // The ONE Google call. Only the host runs it; the edge function saves the deck to the room.
  const loadDeck = useCallback(async () => {
    setFetchError(null);
    const { error } = await supabase.functions.invoke('places-nearby', { body: { room_id: id } });
    if (error) {
      let message = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const body = await error.context.json();
          message = body.error ?? message;
        } catch {
          // keep the generic message
        }
      }
      setFetchError(message);
    }
    // On success, useRoom picks up the saved deck through realtime.
  }, [id]);

  useEffect(() => {
    if (isHost && room && room.restaurants.length === 0 && !fetchStarted.current) {
      fetchStarted.current = true;
      loadDeck();
    }
  }, [isHost, room, loadDeck]);

  const byId = useMemo(() => {
    const map = new Map<string, Restaurant>();
    room?.restaurants.forEach((r) => map.set(r.id, r));
    return map;
  }, [room]);

  const deck = useMemo(
    () => (room && swiped ? room.restaurants.filter((r) => !swiped.has(r.id)) : []),
    [room, swiped],
  );

  const handleSwipe = async (restaurant: Restaurant, liked: boolean) => {
    if (!userId || !id) return;
    setSwiped((prev) => new Set(prev).add(restaurant.id));

    const { error } = await supabase
      .from('swipes')
      .insert({ room_id: id, user_id: userId, place_id: restaurant.id, liked });

    // 23505 = already swiped this one (e.g. double tap). Anything else: put the card back.
    if (error && error.code !== '23505') {
      setSwiped((prev) => {
        const next = new Set(prev);
        next.delete(restaurant.id);
        return next;
      });
      Alert.alert("Swipe didn't save", error.message);
    }
  };

  const shareCode = () => {
    if (room) Share.share({ message: `Join my Chicken Tinder room: ${room.code}` });
  };

  const modalPlaceId = newMatch?.place_id ?? selectedMatch;
  const modalRestaurant = modalPlaceId ? (byId.get(modalPlaceId) ?? null) : null;
  const closeModal = () => {
    dismissNewMatch();
    setSelectedMatch(null);
  };

  const header = <Stack.Screen options={{ title: room ? `Room ${room.code}` : '' }} />;

  // ---------- states ----------

  if (roomError && !room) {
    return (
      <Centered>
        {header}
        <Text style={styles.errorText}>Couldn&apos;t load this room: {roomError}</Text>
        <Button title="Home" onPress={() => router.replace('/')} />
      </Centered>
    );
  }

  if (!room || swiped === null) {
    return (
      <Centered>
        {header}
        <ActivityIndicator size="large" color={COLORS.primary} />
      </Centered>
    );
  }

  if (room.restaurants.length === 0) {
    return (
      <Centered>
        {header}
        {isHost && fetchError ? (
          <>
            <Text style={styles.errorText}>{fetchError}</Text>
            <Button title="Try again" onPress={loadDeck} />
            <Button title="Change filters" variant="ghost" onPress={() => router.replace('/create')} />
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.message}>
              {isHost ? 'Finding restaurants near you…' : 'Waiting for your partner’s restaurant list…'}
            </Text>
            {isHost && !room.guest_id ? <CodeBanner code={room.code} onShare={shareCode} /> : null}
          </>
        )}
      </Centered>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {header}

      {isHost && !room.guest_id ? (
        <CodeBanner code={room.code} onShare={shareCode} />
      ) : (
        <Text style={styles.status}>
          {room.guest_id ? 'You’re both in ✓' : ''}
          {matches.length ? `  ·  ${matches.length} match${matches.length > 1 ? 'es' : ''}` : ''}
        </Text>
      )}

      {deck.length > 0 ? (
        <View style={styles.deck}>
          <SwipeDeck cards={deck} onSwipe={handleSwipe} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.done}>
          <Text style={styles.doneTitle}>That&apos;s the whole deck!</Text>
          {matches.length === 0 ? (
            <Text style={styles.message}>
              No matches yet. If your partner is still swiping, a match will pop up here.
            </Text>
          ) : (
            <>
              <Text style={styles.message}>Your matches:</Text>
              {matches.map((m) => {
                const r = byId.get(m.place_id);
                if (!r) return null;
                return (
                  <Pressable
                    key={m.place_id}
                    style={styles.matchRow}
                    onPress={() => setSelectedMatch(m.place_id)}>
                    <Text style={styles.matchName}>{r.name}</Text>
                    <Text style={styles.matchMeta}>
                      {r.rating != null ? `★ ${r.rating.toFixed(1)}  ` : ''}
                      {r.address}
                    </Text>
                  </Pressable>
                );
              })}
            </>
          )}
          <Button title="Start a new room" variant="secondary" onPress={() => router.replace('/')} />
        </ScrollView>
      )}

      <MatchModal restaurant={modalRestaurant} onClose={closeModal} />
    </SafeAreaView>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

function CodeBanner({ code, onShare }: { code: string; onShare: () => void }) {
  return (
    <Pressable style={styles.banner} onPress={onShare}>
      <Text style={styles.bannerLabel}>Share this code with your partner</Text>
      <Text style={styles.bannerCode}>{code}</Text>
      <Text style={styles.bannerHint}>Tap to share · you can start swiping now</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    backgroundColor: COLORS.bg,
  },
  deck: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  message: { fontSize: 16, color: COLORS.muted, textAlign: 'center' },
  errorText: { fontSize: 16, color: COLORS.pass, textAlign: 'center' },
  status: { textAlign: 'center', color: COLORS.muted, fontWeight: '600', paddingVertical: 6 },
  banner: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  bannerLabel: { color: COLORS.muted, fontWeight: '600' },
  bannerCode: { fontSize: 36, fontWeight: '900', letterSpacing: 8, color: COLORS.primaryDark },
  bannerHint: { color: COLORS.muted, fontSize: 12 },
  done: { padding: 24, gap: 12 },
  doneTitle: { fontSize: 26, fontWeight: '900', color: COLORS.text, textAlign: 'center' },
  matchRow: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  matchName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  matchMeta: { fontSize: 13, color: COLORS.muted },
});
