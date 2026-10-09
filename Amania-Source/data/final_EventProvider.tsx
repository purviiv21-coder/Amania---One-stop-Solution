import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { cancelEventReminders, scheduleEventReminders } from './final_notifications';
import { readAppData, writeAppData } from './final_storage';
import { AppData, CampusEvent, EMPTY_DATA, Role } from './final_types';
import { useAuth } from './final_AuthProvider';

type EventContextValue = {
  data: AppData;
  role: Role;
  ready: boolean;
  setRole: (role: Role) => void;
  refresh: () => Promise<void>;
  publish: (draft: Omit<CampusEvent, 'id' | 'publishedBy' | 'createdAt'>) => Promise<boolean>;
  toggleFavorite: (event: CampusEvent) => Promise<void>;
  deleteEvent: (event: CampusEvent) => Promise<boolean>;
  updateEvent: (event: CampusEvent) => Promise<boolean>;
  addNote: (note: string) => Promise<void>;
  deleteNote: (index: number) => Promise<void>;
  setAvatar: (avatar: string) => Promise<void>;
  canPublish: boolean;
  currentUserId: string;
  adminClubId?: string;
};

const EventContext = createContext<EventContextValue | null>(null);

function eventHasEnded(event: CampusEvent, now = new Date()): boolean {
  const end = event.endTime || event.startTime || '23:59';
  const endAt = new Date(`${event.date}T${end}:00`);
  return !Number.isNaN(endAt.getTime()) && endAt.getTime() <= now.getTime();
}

function textKey(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function EventProvider({ children }: PropsWithChildren) {
  const { profile } = useAuth();
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const dataRef = useRef(data);
  const [rolePreview, setRolePreview] = useState<{ profileId: string; role: Role } | null>(null);
  const role = profile && rolePreview?.profileId === profile.id ? rolePreview.role : profile?.role ?? 'Student';
  const activeProfileId = profile?.id;
  const setRole = useCallback((next: Role) => { if (activeProfileId) setRolePreview({ profileId: activeProfileId, role: next }); }, [activeProfileId]);
  const [ready, setReady] = useState(false);

  const adopt = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
    void writeAppData(next).catch(() => Alert.alert('Could not save changes', 'Check that Amania has enough storage space, then try again.'));
  }, []);

  const refresh = useCallback(async () => {
    const loaded = await readAppData();
    dataRef.current = loaded;
    setData(loaded);
  }, []);

  useEffect(() => {
    let active = true;
    readAppData().then((loaded) => {
      if (!active) return;
      dataRef.current = loaded;
      setData(loaded);
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  const publish = useCallback(async (draft: Omit<CampusEvent, 'id' | 'publishedBy' | 'createdAt'>) => {
    const current = dataRef.current;
    const duplicate = current.events.some((event) => event.date === draft.date && textKey(event.title) === textKey(draft.title) && textKey(event.venue) === textKey(draft.venue));
    if (duplicate) return false;
    const item: CampusEvent = { ...draft, id: `event-${Date.now()}`, publishedBy: role === 'Admin' ? (profile?.id ?? 'demo-admin') : 'owner', createdAt: Date.now() };
    adopt({ ...current, events: [...current.events, item] });
    return true;
  }, [adopt, profile?.id, role]);

  const toggleFavorite = useCallback(async (event: CampusEvent) => {
    const current = dataRef.current;
    const isSaved = current.favorites.includes(event.id);
    if (isSaved) {
      const ids = current.notificationIds[event.id] ?? [];
      const { [event.id]: _removed, ...notificationIds } = current.notificationIds;
      adopt({ ...current, favorites: current.favorites.filter((id) => id !== event.id), notificationIds });
      await cancelEventReminders(ids);
      return;
    }
    adopt({ ...current, favorites: [...current.favorites, event.id] });
    let ids: string[] = [];
    if (!eventHasEnded(event)) {
      try { ids = await scheduleEventReminders(event); }
      catch { Alert.alert('Reminders unavailable', 'Amania could not schedule local notifications on this device.'); }
    }
    const latest = dataRef.current;
    if (!latest.favorites.includes(event.id)) { await cancelEventReminders(ids); return; }
    adopt({ ...latest, notificationIds: { ...latest.notificationIds, [event.id]: ids } });
  }, [adopt]);

  const deleteEvent = useCallback(async (event: CampusEvent) => {
    if (role !== 'Owner' && !(role === 'Admin' && event.publishedBy === profile?.id)) return false;
    const current = dataRef.current;
    const ids = current.notificationIds[event.id] ?? [];
    const { [event.id]: _removed, ...notificationIds } = current.notificationIds;
    adopt({ ...current, events: current.events.filter((item) => item.id !== event.id), favorites: current.favorites.filter((id) => id !== event.id), notificationIds });
    await cancelEventReminders(ids);
    return true;
  }, [adopt, profile?.id, role]);

  const updateEvent = useCallback(async (event: CampusEvent) => {
    if (role !== 'Owner') return false;
    const current = dataRef.current;
    adopt({ ...current, events: current.events.map((item) => item.id === event.id ? event : item) });
    if (current.favorites.includes(event.id)) {
      await cancelEventReminders(current.notificationIds[event.id] ?? []);
      let ids: string[] = [];
      if (!eventHasEnded(event)) {
        try { ids = await scheduleEventReminders(event); } catch { /* Event editing should succeed even if reminders fail. */ }
      }
      if (dataRef.current.favorites.includes(event.id)) adopt({ ...dataRef.current, notificationIds: { ...dataRef.current.notificationIds, [event.id]: ids } });
    }
    return true;
  }, [adopt, role]);

  const addNote = useCallback(async (note: string) => {
    const text = note.trim();
    if (!text) return;
    adopt({ ...dataRef.current, notes: [...dataRef.current.notes, text] });
  }, [adopt]);

  const deleteNote = useCallback(async (index: number) => {
    adopt({ ...dataRef.current, notes: dataRef.current.notes.filter((_, i) => i !== index) });
  }, [adopt]);

  const setAvatar = useCallback(async (avatar: string) => {
    adopt({ ...dataRef.current, avatar });
  }, [adopt]);

  const value = useMemo(() => ({
    data, role, ready, setRole, refresh, publish, toggleFavorite, deleteEvent, updateEvent, addNote, deleteNote, setAvatar,
    canPublish: role === 'Owner' || role === 'Admin',
    currentUserId: profile?.id ?? '', adminClubId: profile?.adminClubId,
  }), [data, role, ready, setRole, refresh, publish, toggleFavorite, deleteEvent, updateEvent, addNote, deleteNote, setAvatar, profile?.id, profile?.adminClubId]);
  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvents(): EventContextValue {
  const context = useContext(EventContext);
  if (!context) throw new Error('useEvents must be used inside EventProvider');
  return context;
}

export function isEnded(event: CampusEvent, now = new Date()): boolean { return eventHasEnded(event, now); }
