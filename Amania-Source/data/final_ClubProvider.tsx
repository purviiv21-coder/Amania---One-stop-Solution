import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLUB_STORAGE_KEY, DEFAULT_CLUBS } from './final_clubConfig';
import { ClubProfile } from './final_types';

type ClubContextValue = { clubs: ClubProfile[]; ready: boolean; refresh: () => Promise<void>; updateClub: (club: ClubProfile) => Promise<void> };
const ClubContext = createContext<ClubContextValue | null>(null);

export function ClubProvider({ children }: PropsWithChildren) {
  const [clubs, setClubs] = useState(DEFAULT_CLUBS);
  const clubsRef = useRef(clubs);
  const [ready, setReady] = useState(false);

  const adopt = useCallback((next: ClubProfile[]) => { clubsRef.current = next; setClubs(next); }, []);
  const refresh = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(CLUB_STORAGE_KEY);
      if (stored) {
        const saved = JSON.parse(stored) as ClubProfile[];
        if (Array.isArray(saved)) {
          const byId = new Map(saved.filter((club) => club && typeof club.id === 'string').map((club) => [club.id, club]));
          adopt(DEFAULT_CLUBS.map((club) => ({ ...club, ...(byId.get(club.id) ?? {}) })));
        }
      }
    } catch { /* Keep current club details if local storage is unavailable or unreadable. */ }
  }, [adopt]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(CLUB_STORAGE_KEY).then((stored) => {
      if (!active) return;
      if (stored) {
        try {
          const saved = JSON.parse(stored) as ClubProfile[];
          if (Array.isArray(saved)) {
            const byId = new Map(saved.filter((club) => club && typeof club.id === 'string').map((club) => [club.id, club]));
            adopt(DEFAULT_CLUBS.map((club) => ({ ...club, ...(byId.get(club.id) ?? {}) })));
          }
        } catch { /* Start with defaults if saved club data is unreadable. */ }
      }
      setReady(true);
    }).catch(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [adopt]);

  const updateClub = useCallback(async (updated: ClubProfile) => {
    const next = clubsRef.current.map((club) => club.id === updated.id ? updated : club);
    adopt(next);
    await AsyncStorage.setItem(CLUB_STORAGE_KEY, JSON.stringify(next));
  }, [adopt]);

  const value = useMemo(() => ({ clubs, ready, refresh, updateClub }), [clubs, ready, refresh, updateClub]);
  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export function useClubs(): ClubContextValue {
  const context = useContext(ClubContext);
  if (!context) throw new Error('useClubs must be used inside ClubProvider');
  return context;
}
