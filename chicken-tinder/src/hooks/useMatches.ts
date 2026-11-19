import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Match } from '@/lib/types';

/**
 * Listens for matches in a room. The database trigger inserts a match row the
 * instant the second person swipes right, and both phones get the insert event.
 *
 * `newMatch` is set for matches that arrive while the screen is open, which is
 * what pops the "It's a Match!" modal. Matches that already existed when the
 * screen opened go in `matches` without popping.
 */
export function useMatches(roomId: string | undefined) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [newMatch, setNewMatch] = useState<Match | null>(null);
  const known = useRef(new Set<string>());
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!roomId) return;
    let active = true;
    known.current = new Set();
    initialLoadDone.current = false;

    const ingest = (rows: Match[]) => {
      const fresh = rows.filter((m) => !known.current.has(m.place_id));
      if (fresh.length === 0) return;
      fresh.forEach((m) => known.current.add(m.place_id));
      setMatches((prev) => [...prev, ...fresh]);
      if (initialLoadDone.current) setNewMatch(fresh[fresh.length - 1]);
    };

    const load = async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at');
      if (!active || !data) return;
      ingest(data as Match[]);
      initialLoadDone.current = true;
    };

    const channel = supabase
      .channel(`matches:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches', filter: `room_id=eq.${roomId}` },
        (payload) => ingest([payload.new as Match]),
      )
      .subscribe((status) => {
        // Catch up on anything that happened while disconnected (e.g. phone was locked).
        if (status === 'SUBSCRIBED') load();
      });

    load();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const dismissNewMatch = useCallback(() => setNewMatch(null), []);

  return { matches, newMatch, dismissNewMatch };
}
