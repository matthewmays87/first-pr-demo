import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput } from 'react-native';

import { Button } from '@/components/Button';
import { COLORS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { Room } from '@/lib/types';

export default function JoinRoom() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const join = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('join_room', { p_code: code });
    setBusy(false);
    if (error) {
      Alert.alert('Could not join', error.message);
      return;
    }
    router.replace({ pathname: '/room/[id]', params: { id: (data as Room).id } });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.label}>Enter the 4-character room code</Text>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        maxLength={4}
        placeholder="ABCD"
        placeholderTextColor={COLORS.border}
        style={styles.input}
        onSubmitEditing={() => code.length === 4 && join()}
      />
      <Button title="Join" onPress={join} loading={busy} disabled={code.length !== 4} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 24, gap: 20, justifyContent: 'center' },
  label: { fontSize: 18, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  input: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 16,
    textAlign: 'center',
    color: COLORS.primaryDark,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
});
