import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CampusEvent } from './final_types';

export async function requestReminderPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('event-reminders', {
      name: 'Event reminders', importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if ((current as unknown as { granted?: boolean }).granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return Boolean((requested as unknown as { granted?: boolean }).granted);
}

export async function scheduleEventReminders(event: CampusEvent): Promise<string[]> {
  if (!(await requestReminderPermission())) return [];
  const start = new Date(`${event.date}T${event.startTime}:00`).getTime();
  const now = Date.now();
  const ids: string[] = [];
  for (const [offset, label] of [[24 * 60 * 60 * 1000, 'tomorrow'], [60 * 60 * 1000, 'in one hour']] as const) {
    const triggerAt = start - offset;
    if (triggerAt <= now) continue;
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: 'Amania event reminder', body: `${event.title} starts ${label}.`, ...(Platform.OS === 'android' ? { channelId: 'event-reminders' } : {}) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(triggerAt) },
    });
    ids.push(id);
  }
  return ids;
}

export async function cancelEventReminders(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
}
