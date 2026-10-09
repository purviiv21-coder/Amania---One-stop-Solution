import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { isEnded, useEvents } from '../data/final_EventProvider';
import { CampusEvent } from '../data/final_types';
import { dateLabel, timeLabel } from '../components/final_EventDetail';
import { Button, Empty, IconLabel } from '../components/final_UI';
import { AvatarPicker } from '../components/final_AvatarPicker';
import { theme } from '../components/final_theme';

const iso = (d: Date) => `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
const mondayStart = (date: Date) => { const d = new Date(date); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };

export function MySpaceScreen({ selectedDay, onViewCalendar, onOpen, onBrowseEvents }: { selectedDay: string; onViewCalendar: (day: string) => void; onOpen: (event: CampusEvent) => void; onBrowseEvents: () => void }) {
  const { data, refresh, setAvatar, addNote, deleteNote, toggleFavorite } = useEvents();
  const [note, setNote] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const favorites = data.events.filter((event) => data.favorites.includes(event.id));
  const active = favorites.filter((event) => !isEnded(event)).sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  const past = favorites.filter((event) => isEnded(event)).sort((a, b) => `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`));
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = mondayStart(new Date()); d.setDate(d.getDate() + i); return iso(d); }), []);
  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };
  const removeFavorite = (event: CampusEvent) => Alert.alert('Remove favorite?', 'This will cancel its reminders and remove it from My Space.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void toggleFavorite(event) },
  ]);

  return <>
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={theme.green} />}>
      <View style={styles.spaceTitle}><Text style={styles.spaceTitleText}>My space <Text style={styles.spaceHeart}>♥︎</Text></Text><Pressable accessibilityRole="button" accessibilityLabel="Choose avatar" onPress={() => setAvatarOpen(true)} style={styles.avatarLarge}><Text style={styles.avatarText}>{data.avatar}</Text></Pressable></View>

      <View style={styles.personalCalendar}><View style={styles.personalCalendarHead}><View><Text style={styles.calendarKicker}>A WEEK AT A GLANCE</Text><Text style={styles.calendarTitle}>{new Date(`${selectedDay}T12:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}  ⌄</Text></View><Pressable onPress={() => onViewCalendar(selectedDay)}><Text style={styles.openCalendar}>↗</Text></Pressable></View><View style={styles.week}>{week.map((day) => { const date = new Date(`${day}T12:00:00`); const favoriteDay = active.some((event) => event.date === day); const selected = day === selectedDay; return <Pressable key={day} onPress={() => onViewCalendar(day)} style={[styles.weekDay, selected && styles.weekDayActive]}><Text style={[styles.weekName, selected && styles.weekNameActive]}>{date.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}</Text><Text style={[styles.weekNum, selected && styles.weekNumActive]}>{date.getDate()}</Text><View style={[styles.dayDot, favoriteDay && styles.dayDotOn]} /></Pressable>; })}</View></View>

      <View style={styles.sectionHead}><View><Text style={styles.sectionKicker}>KEEP THESE CLOSE</Text><Text style={styles.sectionTitle}>Your events</Text></View></View>
      {active.length ? active.map((event) => <Pressable key={event.id} onPress={() => onOpen(event)} style={styles.savedRow}><View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.savedTitle}>{event.title}</Text><Text style={styles.savedMeta}>{dateLabel(event.date)} · {timeLabel(event.startTime)}{event.endTime ? `–${timeLabel(event.endTime)}` : ''}</Text></View><Text style={styles.savedArrow}>›</Text></Pressable>) : <View style={styles.emptyFavorites}><Text style={styles.emptyHeart}>♡</Text><Text style={styles.emptyTitle}>Your shortlist starts here</Text><Text style={styles.emptyCopy}>Tap the heart on any event and it’ll be waiting</Text><Pressable onPress={onBrowseEvents}><Text style={styles.findEvent}>Find an event  ↗</Text></Pressable></View>}

      <View style={styles.notesHead}><Text style={styles.sectionKicker}>A LITTLE SPACE FOR YOU</Text><Text style={styles.sectionTitle}>Notes  ✎</Text></View>
      <View style={styles.noteComposer}><TextInput value={note} onChangeText={setNote} placeholder="Write a note to yourself…" placeholderTextColor="#929B92" multiline style={styles.noteInput} /><Button title="Save note" onPress={() => { void addNote(note); setNote(''); }} disabled={!note.trim()} /></View>
      {data.notes.map((item, index) => <View key={`${index}-${item.slice(0, 14)}`} style={styles.noteRow}><Text style={styles.noteText}>{item}</Text><IconLabel label="×" onPress={() => Alert.alert('Delete this note?', 'This note will be removed from My Space.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void deleteNote(index) }])} /></View>)}
      <View style={styles.pastAction}><Button title="View past favorited events" onPress={() => setPastOpen(true)} secondary /></View>
      <View style={styles.quoteCard}><Text style={styles.quoteText}>“Why, sometimes I’ve believed as many as six impossible things before breakfast.”</Text><Text style={styles.quoteCredit}>— Lewis Carroll, Through the Looking-Glass</Text></View>
    </ScrollView>

    <Modal visible={pastOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPastOpen(false)}>
      <View style={styles.modalSafe}><View style={styles.modalHead}><View><Text style={styles.calendarKicker}>YOUR HISTORY</Text><Text style={styles.sectionTitle}>Past favorites</Text></View><IconLabel label="×" onPress={() => setPastOpen(false)} /></View><ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={theme.green} />} contentContainerStyle={styles.pastList}>
        {past.length ? past.map((event) => <Pressable key={event.id} onPress={() => onOpen(event)} style={styles.savedRow}><View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.savedTitle}>{event.title}</Text><Text style={styles.savedMeta}>{dateLabel(event.date)} · {timeLabel(event.startTime)}{event.endTime ? `–${timeLabel(event.endTime)}` : ''}</Text></View><Pressable hitSlop={8} onPress={() => removeFavorite(event)}><Text style={styles.removeFavorite}>♥</Text></Pressable></Pressable>) : <Empty title="No past favorites" body="Favorited events move here after they end." />}
      </ScrollView></View>
    </Modal>
    <AvatarPicker visible={avatarOpen} avatar={data.avatar} onSelect={(avatar) => void setAvatar(avatar)} onClose={() => setAvatarOpen(false)} />
  </>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28 }, spaceTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }, spaceTitleText: { color: theme.ink, fontSize: 27, fontWeight: '900', letterSpacing: -0.7 }, spaceHeart: { color: '#151515', fontSize: 23 }, avatarLarge: { height: 48, width: 48, borderRadius: 19, backgroundColor: theme.lime, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: 29 },
  personalCalendar: { backgroundColor: theme.green, padding: 17, borderRadius: 20, marginBottom: 21 }, personalCalendarHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }, calendarKicker: { color: '#B7C9B5', fontSize: 8, letterSpacing: 1.1, fontWeight: '800' }, calendarTitle: { color: theme.white, fontSize: 15, fontWeight: '700', marginTop: 4 }, openCalendar: { color: theme.lime, fontSize: 20 }, week: { flexDirection: 'row', justifyContent: 'space-between' }, weekDay: { minWidth: 37, alignItems: 'center', paddingVertical: 8, borderRadius: 12 }, weekDayActive: { backgroundColor: 'rgba(255,255,255,0.15)' }, weekName: { color: '#AFC3B3', fontSize: 7, fontWeight: '800' }, weekNameActive: { color: '#D4E4D4' }, weekNum: { color: theme.white, fontSize: 13, fontWeight: '700', marginTop: 5 }, weekNumActive: { color: theme.lime }, dayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 }, dayDotOn: { backgroundColor: theme.orange },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 }, sectionKicker: { color: theme.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.3, marginBottom: 5 }, sectionTitle: { color: theme.ink, fontSize: 18, fontWeight: '800' }, savedRow: { backgroundColor: theme.white, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: theme.line }, savedTitle: { color: theme.ink, fontSize: 12, fontWeight: '800', marginBottom: 4 }, savedMeta: { color: theme.muted, fontSize: 9 }, savedArrow: { color: theme.green, fontSize: 23, paddingHorizontal: 5 },
  notesHead: { marginTop: 24, marginBottom: 10 }, pastAction: { marginTop: 15, marginBottom: 12 }, noteComposer: { backgroundColor: '#F3F5EF', borderWidth: 1, borderColor: '#E1E7DE', borderRadius: 18, padding: 13, marginBottom: 10 }, noteInput: { minHeight: 62, color: theme.ink, fontSize: 12, textAlignVertical: 'top', marginBottom: 8 }, noteRow: { backgroundColor: '#F0F4EC', borderRadius: 14, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, noteText: { flex: 1, color: theme.ink, fontSize: 12, lineHeight: 18 },
  emptyFavorites: { minHeight: 158, backgroundColor: '#F0F1EB', borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 18, marginBottom: 15 }, emptyHeart: { color: theme.orange, fontSize: 35, marginBottom: 10 }, emptyTitle: { color: theme.ink, fontSize: 13, fontWeight: '900', marginBottom: 6 }, emptyCopy: { color: theme.muted, fontSize: 10, fontWeight: '600', marginBottom: 12, textAlign: 'center' }, findEvent: { color: theme.green, fontSize: 10, fontWeight: '900' },
  modalSafe: { flex: 1, backgroundColor: theme.paper, paddingTop: 22, paddingBottom: 44 }, modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: theme.line }, pastList: { paddingHorizontal: 20, paddingVertical: 14 }, removeFavorite: { color: '#181818', fontSize: 20, paddingHorizontal: 5 },
  quoteCard: { backgroundColor: '#E9EEE5', borderRadius: 17, padding: 15, marginTop: 12, marginBottom: 4 }, quoteText: { color: theme.deepGreen, fontSize: 12, lineHeight: 18, fontStyle: 'italic', fontWeight: '600' }, quoteCredit: { color: theme.muted, fontSize: 9, marginTop: 8, textAlign: 'right' },
});
