import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, EMPTY_DATA } from './final_types';

const STORAGE_KEY = 'amania-local-data-v1';

export async function readAppData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DATA;
    const value = JSON.parse(raw) as Partial<AppData>;
    return {
      ...EMPTY_DATA,
      ...value,
      version: 1,
      events: Array.isArray(value.events) ? value.events : [],
      favorites: Array.isArray(value.favorites) ? value.favorites : [],
      notes: Array.isArray(value.notes) ? value.notes : [],
      notificationIds: value.notificationIds ?? {},
    };
  } catch {
    return EMPTY_DATA;
  }
}

export async function writeAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
