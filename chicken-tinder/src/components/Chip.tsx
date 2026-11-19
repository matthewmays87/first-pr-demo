import { Pressable, StyleSheet, Text } from 'react-native';

import { COLORS } from '@/lib/constants';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}>
      <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  selected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  text: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  selectedText: { color: '#fff' },
});
