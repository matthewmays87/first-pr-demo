import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { COLORS } from '@/lib/constants';
import type { Restaurant } from '@/lib/types';

import { RestaurantCard } from './RestaurantCard';

type Direction = 'left' | 'right';

type Props = {
  cards: Restaurant[];
  onSwipe: (restaurant: Restaurant, liked: boolean) => void;
};

export function SwipeDeck({ cards, onSwipe }: Props) {
  const [forced, setForced] = useState<Direction | null>(null);
  const top = cards[0];
  const next = cards[1];

  const handleDone = (liked: boolean) => {
    setForced(null);
    if (top) onSwipe(top, liked);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.stack}>
        {next ? (
          <View style={[StyleSheet.absoluteFill, styles.behind]}>
            <RestaurantCard restaurant={next} />
          </View>
        ) : null}
        {top ? (
          // key= resets the card's animation state for each new restaurant
          <SwipeCard key={top.id} restaurant={top} forced={forced} onDone={handleDone} />
        ) : null}
      </View>

      <View style={styles.buttons}>
        <Pressable
          accessibilityLabel="Pass"
          disabled={!!forced || !top}
          onPress={() => setForced('left')}
          style={({ pressed }) => [styles.circle, styles.passCircle, pressed && styles.pressed]}>
          <Text style={[styles.circleIcon, { color: COLORS.pass }]}>✕</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Like"
          disabled={!!forced || !top}
          onPress={() => setForced('right')}
          style={({ pressed }) => [styles.circle, styles.likeCircle, pressed && styles.pressed]}>
          <Text style={[styles.circleIcon, { color: COLORS.like }]}>♥</Text>
        </Pressable>
      </View>
    </View>
  );
}

type CardProps = {
  restaurant: Restaurant;
  forced: Direction | null;
  onDone: (liked: boolean) => void;
};

function SwipeCard({ restaurant, forced, onDone }: CardProps) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const threshold = width * 0.3;
  const offscreen = width * 1.5;

  // Like / pass buttons animate the card off the same way a swipe does.
  useEffect(() => {
    if (!forced) return;
    const dir = forced === 'right' ? 1 : -1;
    x.set(withTiming(dir * offscreen, { duration: 250 }, (finished) => {
      if (finished) scheduleOnRN(onDone, dir === 1);
    }));
  }, [forced, offscreen, onDone, x]);

  const pan = usePanGesture({
    enabled: !forced,
    onUpdate: (e) => {
      'worklet';
      x.set(e.translationX);
      y.set(e.translationY);
    },
    onDeactivate: (e) => {
      'worklet';
      const flung = Math.abs(e.velocityX) > 800;
      if (!e.canceled && (Math.abs(e.translationX) > threshold || flung)) {
        const dir = (Math.abs(e.translationX) > threshold ? e.translationX : e.velocityX) > 0 ? 1 : -1;
        x.set(withTiming(dir * offscreen, { duration: 200 }, (finished) => {
          if (finished) scheduleOnRN(onDone, dir === 1);
        }));
      } else {
        x.set(withSpring(0));
        y.set(withSpring(0));
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { rotate: `${interpolate(x.get(), [-width, width], [-15, 15])}deg` },
    ],
  }));

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.get(), [0, threshold], [0, 1], 'clamp'),
  }));

  const passStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.get(), [-threshold, 0], [1, 0], 'clamp'),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[StyleSheet.absoluteFill, cardStyle]}>
        <RestaurantCard restaurant={restaurant} />
        <Animated.View style={[styles.stamp, styles.likeStamp, likeStyle]}>
          <Text style={[styles.stampText, { color: COLORS.like }]}>YUM</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.passStamp, passStyle]}>
          <Text style={[styles.stampText, { color: COLORS.pass }]}>NOPE</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 20 },
  stack: { flex: 1 },
  behind: { transform: [{ scale: 0.95 }], opacity: 0.9 },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingBottom: 8 },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  passCircle: { borderColor: COLORS.pass },
  likeCircle: { borderColor: COLORS.like },
  pressed: { transform: [{ scale: 0.92 }] },
  circleIcon: { fontSize: 32, fontWeight: '700' },
  stamp: {
    position: 'absolute',
    top: 40,
    borderWidth: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  likeStamp: { left: 24, borderColor: COLORS.like, transform: [{ rotate: '-15deg' }] },
  passStamp: { right: 24, borderColor: COLORS.pass, transform: [{ rotate: '15deg' }] },
  stampText: { fontSize: 32, fontWeight: '900', letterSpacing: 2 },
});
