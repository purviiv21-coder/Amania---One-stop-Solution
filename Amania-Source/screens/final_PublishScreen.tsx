import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useEvents } from '../data/final_EventProvider';
import { CampusEvent, ExtractedEvent } from '../data/final_types';
import { generateWhyAttend, scanEventPoster } from '../data/final_api';
import { Button, Empty, Field, IconLabel } from '../components/final_UI';
import { dateLabel, timeLabel } from '../components/final_EventDetail';
import { theme } from '../components/final_theme';

type Step = 'upload' | 'details' | 'preview';
const blankDraft = (): ExtractedEvent => ({ title: '', category: 'EVENT', date: '', startTime: '', endTime: '', venue: '', organizer: '', description: '' });
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};
const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function PublishScreen({ onClose }: { onClose: () => void }) {
  const { data, role, publish, deleteEvent, refresh, currentUserId } = useEvents();
  const [step, setStep] = useState<Step>('upload');
  const [posterUri, setPosterUri] = useState('');
  const [draft, setDraft] = useState<ExtractedEvent>(blankDraft());
  const [scanning, setScanning] = useState(false);
  const [whyLoading, setWhyLoading] = useState(false);
  const [why, setWhy] = useState('');
  const [whyError, setWhyError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const mine = useMemo(() => data.events.filter((event) => role === 'Owner' || (role === 'Admin' && event.publishedBy === currentUserId)).sort((a, b) => b.createdAt - a.createdAt), [data.events, currentUserId, role]);
  const update = (key: keyof ExtractedEvent, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  const choosePoster = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Photo access needed', 'Allow photo access to choose an event poster.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;
    setPosterUri(result.assets[0].uri); setDraft(blankDraft()); setWhy(''); setWhyError(''); setStep('upload');
  };

  const scan = async () => {
    if (!posterUri || scanning) return;
    setScanning(true);
    try {
      const extracted = await scanEventPoster(posterUri);
      setDraft({ ...blankDraft(), ...extracted, category: extracted.category || 'EVENT' });
      setStep('details');
    } catch (error) {
      Alert.alert('Poster scan failed', error instanceof Error ? error.message : 'Please try again with a clearer poster image.');
    } finally { setScanning(false); }
  };

  const continueToPreview = async () => {
    if (!draft.title.trim() || !draft.date || !draft.startTime) { Alert.alert('Add the key details', 'Event name, date, and start time are required before continuing.'); return; }
    if (!validDate(draft.date)) { Alert.alert('Check the event date', 'Enter a real date in YYYY-MM-DD format.'); return; }
    if (!validTime(draft.startTime) || (draft.endTime && !validTime(draft.endTime))) { Alert.alert('Check the event time', 'Enter start and end times in 24-hour HH:MM format.'); return; }
    setStep('preview'); setWhy(''); setWhyError(''); setWhyLoading(true);
    try { setWhy(await generateWhyAttend(draft)); }
    catch (error) { setWhyError(error instanceof Error ? error.message : 'The event note could not be prepared.'); }
    finally { setWhyLoading(false); }
  };

  const clearDraft = () => { setStep('upload'); setPosterUri(''); setDraft(blankDraft()); setWhy(''); setWhyError(''); setScanning(false); setWhyLoading(false); setPublishing(false); };
  const publishNow = async () => {
    setPublishing(true);
    const added = await publish({ ...draft, title: draft.title.trim(), category: draft.category.trim().toUpperCase(), venue: draft.venue.trim() || 'Venue to be confirmed', organizer: draft.organizer.trim() || 'Campus organiser', description: draft.description.trim() || 'See the original poster for more information.', endTime: draft.endTime || '', posterUri });
    setPublishing(false);
    if (!added) { Alert.alert('Event has already been added!', 'Event has already been added!'); return; }
    Alert.alert('Event published', 'It is now on Explore and the campus calendar.');
    clearDraft();
  };

  const deletePublished = (event: CampusEvent) => Alert.alert('Delete this event?', 'It will be removed from Explore, the calendar, and favorites.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete event', style: 'destructive', onPress: () => void deleteEvent(event) },
  ]);
  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };
  const heading = step === 'preview' ? 'Preview event' : step === 'details' ? 'Confirm details' : 'Publish an event';

  return <View style={styles.safe}>
    <View style={styles.top}><IconLabel label="‹" onPress={() => { if (step === 'preview') setStep('details'); else if (step === 'details') setStep('upload'); else onClose(); }} /><View style={styles.topCopy}><Text style={styles.kicker}>CAMPUS PUBLISHING</Text><Text style={styles.title}>{heading}</Text></View><IconLabel label="×" onPress={onClose} /></View>
    <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={theme.green} />}>
      {step === 'upload' ? <>
        <Text style={styles.intro}>Upload the original poster. Check each detail before publishing.</Text>
        {posterUri ? <Pressable onPress={() => void choosePoster()}><Image source={{ uri: posterUri }} style={styles.posterPreview} resizeMode="contain" /><Text style={styles.changePoster}>Choose a different poster</Text></Pressable> : <View style={styles.uploadEmpty}><Text style={styles.uploadSymbol}>↑</Text><Text style={styles.uploadPrompt}>Choose an event poster</Text></View>}
        <Button title="↑  Upload poster" onPress={() => void choosePoster()} secondary={!posterUri} />
        {posterUri ? <Button title={scanning ? 'Reading poster…' : 'Scan poster'} onPress={() => void scan()} disabled={scanning} style={{ marginTop: 10 }} /> : null}
        {scanning ? <View style={styles.loading}><ActivityIndicator color={theme.green} /><Text style={styles.loadingText}>Sending poster to Gemini…</Text></View> : null}
        <View style={styles.info}><Text style={styles.infoText}>Amania sends the poster to the private scan server. Gemini reads the event details; you can review and edit every field.</Text></View>
      </> : null}

      {step === 'details' ? <>
        <View style={styles.sectionHead}><View><Text style={styles.kicker}>STEP 02 · REVIEW</Text><Text style={styles.sectionTitle}>Confirm details</Text></View><Text style={styles.editable}>EDITABLE</Text></View>
        <Field label="EVENT NAME" value={draft.title} onChangeText={(v) => update('title', v)} placeholder="What’s the event called?" />
        <Field label="CATEGORY" value={draft.category} onChangeText={(v) => update('category', v)} placeholder="WORKSHOP" />
        <Field label="DATE · YYYY-MM-DD" value={draft.date} onChangeText={(v) => update('date', v)} placeholder="2026-10-10" />
        <View style={styles.row}><View style={{ flex: 1 }}><Field label="START · HH:MM" value={draft.startTime} onChangeText={(v) => update('startTime', v)} placeholder="16:00" /></View><View style={{ width: 12 }} /><View style={{ flex: 1 }}><Field label="END · HH:MM" value={draft.endTime} onChangeText={(v) => update('endTime', v)} placeholder="18:00" /></View></View>
        <Field label="VENUE" value={draft.venue} onChangeText={(v) => update('venue', v)} placeholder="Building, room, or online" />
        <Field label="ORGANISER" value={draft.organizer} onChangeText={(v) => update('organizer', v)} placeholder="Club or faculty name" />
        <Field label="DESCRIPTION" value={draft.description} onChangeText={(v) => update('description', v)} placeholder="Description and useful details" multiline />
        {posterUri ? <Image source={{ uri: posterUri }} style={styles.posterSmall} resizeMode="cover" /> : null}
        <Button title="Review event ↗" onPress={() => void continueToPreview()} />
      </> : null}

      {step === 'preview' ? <>
        <View style={styles.summary}><Text style={styles.summaryCategory}>{draft.category.toUpperCase()}</Text><Text style={styles.summaryTitle}>{draft.title}</Text><Text style={styles.summaryLine}>{dateLabel(draft.date)}</Text><Text style={styles.summaryLine}>{timeLabel(draft.startTime)}{draft.endTime ? ` – ${timeLabel(draft.endTime)}` : ''}</Text><Text style={styles.summaryLine}>{draft.venue || 'Venue to be confirmed'}</Text></View>
        <Text style={styles.previewLabel}>ORIGINAL POSTER</Text>{posterUri ? <Image source={{ uri: posterUri }} style={styles.posterPreview} resizeMode="contain" /> : null}
        <View style={styles.noteCard}><View style={styles.noteHead}><Text style={styles.noteTitle}>Why you should attend</Text><Text style={styles.noteByline}>Gemma 4</Text></View>{whyLoading ? <View style={styles.loading}><ActivityIndicator color={theme.green} /><Text style={styles.loadingText}>Preparing a short note…</Text></View> : why ? <Text style={styles.whyText}>{why}</Text> : <Text style={styles.whyText}>{whyError || 'A note is unavailable right now.'}</Text>}</View>
        {whyError ? <Pressable onPress={() => void continueToPreview()}><Text style={styles.retry}>Try the note again</Text></Pressable> : null}
        <Button title={publishing ? 'Publishing…' : 'Publish event'} onPress={() => void publishNow()} disabled={publishing} />
      </> : null}

      {step === 'upload' ? <>
        <View style={styles.postsHead}><Text style={styles.sectionTitle}>Published by you</Text></View>
        {mine.length ? mine.map((event) => <View key={event.id} style={styles.postRow}><View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.postTitle}>{event.title}</Text><Text style={styles.postMeta}>{dateLabel(event.date)} · {timeLabel(event.startTime)}</Text></View><Pressable onPress={() => deletePublished(event)} style={styles.deleteButton}><Text style={styles.deleteText}>Delete</Text></Pressable></View>) : <Empty title="No published events" body="Events you publish will appear here." />}
      </> : null}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.paper, paddingTop: 8 }, top: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.line }, topCopy: { flex: 1, paddingHorizontal: 12 }, kicker: { color: theme.muted, fontSize: 8, letterSpacing: 1.3, fontWeight: '900', marginBottom: 3 }, title: { color: theme.ink, fontSize: 18, fontWeight: '800' }, page: { paddingHorizontal: 20, paddingTop: 19, paddingBottom: 35 }, intro: { color: theme.muted, fontSize: 12, lineHeight: 18, marginBottom: 16 },
  uploadEmpty: { height: 188, backgroundColor: '#EDEFE8', borderRadius: 19, borderWidth: 1, borderColor: '#DDE2D8', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, uploadSymbol: { width: 46, height: 46, borderRadius: 15, backgroundColor: theme.white, textAlign: 'center', textAlignVertical: 'center', color: theme.green, fontSize: 25, marginBottom: 9 }, uploadPrompt: { color: theme.ink, fontSize: 14, fontWeight: '800' }, posterPreview: { width: '100%', height: 250, backgroundColor: '#E9EEE5', borderRadius: 16, marginBottom: 12 }, changePoster: { color: theme.green, fontSize: 10, fontWeight: '800', marginTop: -4, marginBottom: 12 }, posterSmall: { width: '100%', height: 130, borderRadius: 13, marginBottom: 13 }, info: { padding: 13, backgroundColor: '#E9EEE5', borderRadius: 15, marginTop: 15 }, infoText: { color: theme.muted, fontSize: 10, lineHeight: 16 }, loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 12 }, loadingText: { color: theme.muted, fontSize: 10 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, sectionTitle: { color: theme.ink, fontSize: 18, fontWeight: '800' }, editable: { color: theme.green, backgroundColor: theme.pale, fontSize: 8, fontWeight: '900', padding: 7, borderRadius: 7 }, row: { flexDirection: 'row' },
  summary: { backgroundColor: theme.green, borderRadius: 20, padding: 19, marginBottom: 18 }, summaryCategory: { color: theme.lime, fontSize: 9, fontWeight: '900', letterSpacing: 1.3, marginBottom: 8 }, summaryTitle: { color: theme.white, fontSize: 22, lineHeight: 27, fontWeight: '800', marginBottom: 9 }, summaryLine: { color: '#D5E2D5', fontSize: 11, lineHeight: 18, fontWeight: '600' }, previewLabel: { color: theme.muted, fontSize: 8, letterSpacing: 1.1, fontWeight: '900', marginBottom: 8 }, noteCard: { backgroundColor: '#E9EEE5', borderRadius: 17, padding: 15, marginBottom: 15 }, noteHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }, noteTitle: { color: theme.deepGreen, fontSize: 13, fontWeight: '800' }, noteByline: { color: theme.muted, fontSize: 8, fontWeight: '800' }, whyText: { color: theme.ink, fontSize: 11, lineHeight: 17 }, retry: { color: theme.green, fontSize: 10, fontWeight: '800', marginTop: -6, marginBottom: 12, textAlign: 'right' },
  postsHead: { marginTop: 23, marginBottom: 10 }, postRow: { backgroundColor: theme.white, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: theme.line }, postTitle: { color: theme.ink, fontSize: 12, fontWeight: '800', marginBottom: 4 }, postMeta: { color: theme.muted, fontSize: 9 }, deleteButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F7E8E2', marginLeft: 8 }, deleteText: { color: '#8E3321', fontSize: 10, fontWeight: '800' },
});
