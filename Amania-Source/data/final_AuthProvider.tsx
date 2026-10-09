import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Role } from './final_types';
import { AdminClubId, INITIAL_OWNER_USNS } from './final_authConfig';

export type AccessStatus = 'PENDING' | 'APPROVED' | 'DENIED';
export type CampusProfile = {
  id: string;
  usn: string;
  username: string;
  email: string;
  role: Role;
  adminClubId?: AdminClubId;
  requestedRole?: 'Owner' | 'Admin';
  accessStatus?: AccessStatus;
};
export type AccessRequest = {
  id: string;
  profileId: string;
  usn: string;
  username: string;
  email: string;
  requestedRole: 'Owner' | 'Admin';
  adminClubId?: AdminClubId;
  createdAt: number;
  status: AccessStatus;
};
type AuthDatabase = { version: 1; profiles: CampusProfile[]; requests: AccessRequest[]; activeProfileId: string | null };
type RequestedRole = 'Student' | 'Owner' | 'Admin';
type SignupInput = { usn: string; username: string; email: string; password: string; requestedRole: RequestedRole; adminClubId?: AdminClubId };
type AuthContextValue = {
  profile: CampusProfile | null;
  profiles: CampusProfile[];
  requests: AccessRequest[];
  ready: boolean;
  error: string;
  signUp: (input: SignupInput) => Promise<CampusProfile>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (username: string, email: string, password: string) => Promise<void>;
  decideAccess: (requestId: string, approved: boolean) => Promise<void>;
};

const STORAGE_KEY = '@amania/profiles/v1';
const EMPTY_DB: AuthDatabase = { version: 1, profiles: [], requests: [], activeProfileId: null };
const AuthContext = createContext<AuthContextValue | null>(null);
const normalized = (value: string) => value.trim().toLowerCase();
const cleanUsn = (value: string) => value.trim().replace(/\s+/g, '').toUpperCase();
const passwordKey = (profileId: string) => `amania.password.${profileId}`;
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function AuthProvider({ children }: PropsWithChildren) {
  const [database, setDatabase] = useState<AuthDatabase>(EMPTY_DB);
  const databaseRef = useRef(database);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const profile = database.profiles.find((item) => item.id === database.activeProfileId) ?? null;

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!alive) return;
      try {
        const parsed = raw ? JSON.parse(raw) as Partial<AuthDatabase> : {};
        const loaded: AuthDatabase = {
          version: 1,
          profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
          requests: Array.isArray(parsed.requests) ? parsed.requests : [],
          activeProfileId: typeof parsed.activeProfileId === 'string' ? parsed.activeProfileId : null,
        };
        databaseRef.current = loaded;
        setDatabase(loaded);
      } catch {
        databaseRef.current = EMPTY_DB;
        setDatabase(EMPTY_DB);
      }
      setReady(true);
    }).catch(() => { if (alive) { setError('Could not load profiles from this device.'); setReady(true); } });
    return () => { alive = false; };
  }, []);

  const commit = useCallback(async (next: AuthDatabase) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    databaseRef.current = next;
    setDatabase(next);
    setError('');
  }, []);

  const signUp = useCallback(async (input: SignupInput) => {
    const usn = cleanUsn(input.usn);
    const username = input.username.trim();
    const email = input.email.trim().toLowerCase();
    if (!/^[A-Z0-9-]{6,24}$/.test(usn)) throw new Error('Enter a valid USN using 6–24 letters, numbers, or hyphens.');
    if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) throw new Error('Username must be 3–24 characters using letters, numbers, dot, dash, or underscore.');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address.');
    if (input.password.length < 8) throw new Error('Use a password with at least 8 characters.');
    const current = databaseRef.current;
    if (current.profiles.some((item) => cleanUsn(item.usn) === usn)) throw new Error('An account already exists for that USN.');
    if (current.profiles.some((item) => normalized(item.username) === normalized(username))) throw new Error('That username is already taken. Choose another one.');
    if (current.profiles.some((item) => normalized(item.email) === email)) throw new Error('That email is already connected to an account.');

    const id = `profile-${usn.toLowerCase()}`;
    const isInitialOwner = INITIAL_OWNER_USNS.some((item) => cleanUsn(item) === usn);
    const role: Role = isInitialOwner ? 'Owner' : 'Student';
    const requestedRole = isInitialOwner ? 'Owner' : input.requestedRole === 'Student' ? undefined : input.requestedRole;
    const accessStatus: AccessStatus | undefined = isInitialOwner || input.requestedRole === 'Student' ? 'APPROVED' : 'PENDING';
    const savedProfile: CampusProfile = {
      id, usn, username, email, role,
      ...(input.requestedRole === 'Admin' ? { adminClubId: input.adminClubId } : {}),
      ...(requestedRole ? { requestedRole } : {}),
      ...(accessStatus ? { accessStatus } : {}),
    };
    const request = requestedRole && !isInitialOwner ? {
      id: makeId('access'), profileId: id, usn, username, email, requestedRole,
      ...(input.requestedRole === 'Admin' && input.adminClubId ? { adminClubId: input.adminClubId } : {}),
      createdAt: Date.now(), status: 'PENDING' as const,
    } : null;
    await SecureStore.setItemAsync(passwordKey(id), input.password);
    try {
      await commit({ ...current, profiles: [...current.profiles, savedProfile], requests: request ? [...current.requests, request] : current.requests, activeProfileId: id });
      return savedProfile;
    } catch (saveError) {
      await SecureStore.deleteItemAsync(passwordKey(id));
      throw saveError;
    }
  }, [commit]);

  const signIn = useCallback(async (username: string, password: string) => {
    const found = databaseRef.current.profiles.find((item) => normalized(item.username) === normalized(username));
    if (!found) throw new Error('Username or password is incorrect.');
    const savedPassword = await SecureStore.getItemAsync(passwordKey(found.id));
    if (savedPassword !== password) throw new Error('Username or password is incorrect.');
    await commit({ ...databaseRef.current, activeProfileId: found.id });
  }, [commit]);

  const signOut = useCallback(async () => { await commit({ ...databaseRef.current, activeProfileId: null }); }, [commit]);

  const resetPassword = useCallback(async (username: string, email: string, password: string) => {
    const found = databaseRef.current.profiles.find((item) => normalized(item.username) === normalized(username) && normalized(item.email) === normalized(email));
    if (!found) throw new Error('We could not find an account with that username and email.');
    if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
    await SecureStore.setItemAsync(passwordKey(found.id), password);
  }, []);

  const decideAccess = useCallback(async (requestId: string, approved: boolean) => {
    const current = databaseRef.current;
    const request = current.requests.find((item) => item.id === requestId && item.status === 'PENDING');
    if (!request) return;
    const status: AccessStatus = approved ? 'APPROVED' : 'DENIED';
    const updatedRole: Role = approved ? request.requestedRole : 'Student';
    const requests = current.requests.map((item) => item.id === requestId ? { ...item, status } : item);
    const profiles = current.profiles.map((item) => item.id !== request.profileId ? item : {
      ...item,
      role: updatedRole,
      accessStatus: status,
      ...(approved && request.requestedRole === 'Admin' && request.adminClubId ? { adminClubId: request.adminClubId } : {}),
    });
    await commit({ ...current, requests, profiles });
  }, [commit]);

  const value = useMemo(() => ({ profile, profiles: database.profiles, requests: database.requests, ready, error, signUp, signIn, signOut, resetPassword, decideAccess }), [profile, database.profiles, database.requests, ready, error, signUp, signIn, signOut, resetPassword, decideAccess]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
