import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Room } from '@/lib/types';

/**
 * Loads a room and keeps it live. Fires when the guest joins and when the host's
 * Google fetch saves the deck.
 *
 * On any change we re-read the row instead of trusting the realtime payload:
 * Postgres can leave big unchanged columns (the restaurants jsonb) out of update events.
 */
export function useRoom(roomId: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    let active = true;

    const load = async () => {
      const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).single();
      if (!active) return;
      if (error) setError(error.message);
      else {
        setError(null);
        setRoom(data as Room);
      }
    };

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => load(),
      )
      .subscribe((status) => {
        // Re-read after (re)connecting so nothing is missed while offline.
        if (status === 'SUBSCRIBED') load();
      });

    load();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { room, error };
}
