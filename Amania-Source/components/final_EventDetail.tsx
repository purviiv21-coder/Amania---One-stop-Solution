import React, { useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CampusEvent, Role } from '../data/final_types';
import { Button, Field, IconLabel } from './final_UI';
import { theme } from './final_theme';

export function dateLabel(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function timeLabel(value: string): string {
  const [hour = 0, minute = 0] = value.split(':').map(Number);
  const date = new Date(); date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function EventDetail({ event, visible, onClose, role, favorite, onToggleFavorite, onDelete, onUpdate, currentUserId }: {
  event: CampusEvent | null; visible: boolean; onClose: () => void; role: Role; favorite: boolean;
  onToggleFavorite: () => void; onDelete: () => Promise<void>; onUpdate: (event: CampusEvent) => Promise<void>;
  currentUserId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CampusEvent | null>(event);
  if (!event || !draft) return null;
  const isOwner = role === 'Owner';
  const canDelete = isOwner || (role === 'Admin' && event.publishedBy === currentUserId);
  const change = (key: keyof CampusEvent, value: string) => setDraft((current) => current ? { ...current, [key]: value } : current);
  const askDelete = () => Alert.alert('Delete this event?', 'It will be removed from Explore and the calendar.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete event', style: 'destructive', onPress: () => { void onDelete(); onClose(); } },
  ]);
  const save = async () => { await onUpdate(draft); setEditing(false); };

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.top}><Text style={styles.topLabel}>EVENT DETAILS</Text><IconLabel label="×" onPress={onClose} /></View>
      <ScrollView contentContainerStyle={styles.content}>
        {event.posterUri ? <Image source={{ uri: event.posterUri }} style={styles.poster} resizeMode="contain" /> : null}
        {editing ? <>
          <Field label="EVENT NAME" value={draft.title} onChangeText={(v) => change('title', v)} />
          <Field label="CATEGORY" value={draft.category} onChangeText={(v) => change('category', v)} />
          <Field label="DATE · YYYY-MM-DD" value={draft.date} onChangeText={(v) => change('date', v)} />
          <View style={styles.timeRow}><View style={{ flex: 1 }}><Field label="START TIME" value={draft.startTime} onChangeText={(v) => change('startTime', v)} /></View><View style={{ width: 12 }} /><View style={{ flex: 1 }}><Field label="END TIME" value={draft.endTime} onChangeText={(v) => change('endTime', v)} /></View></View>
          <Field label="VENUE" value={draft.venue} onChangeText={(v) => change('venue', v)} />
          <Field label="ORGANISER" value={draft.organizer} onChangeText={(v) => change('organizer', v)} />
          <Field label="DESCRIPTION" value={draft.description} onChangeText={(v) => change('description', v)} multiline />
          <Button title="Save changes" onPress={() => void save()} />
        </> : <>
          <View style={styles.titleRow}><View style={{ flex: 1 }}><Text style={styles.category}>{event.category.toUpperCase()}</Text><Text style={styles.title}>{event.title}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'} onPress={onToggleFavorite} style={[styles.heart, favorite && styles.heartActive]}><Text style={styles.heartText}>{favorite ? '♥' : '♡'}</Text></Pressable></View>
          <Fact label="DATE" value={dateLabel(event.date)} />
          <Fact label="TIME" value={`${timeLabel(event.startTime)}${event.endTime ? ` – ${timeLabel(event.endTime)}` : ''}`} />
          <Fact label="VENUE" value={event.venue} />
          <Fact label="ORGANISER" value={event.organizer} />
          <Fact label="ABOUT THIS EVENT" value={event.description} />
          {isOwner ? <Button title="Edit event" onPress={() => setEditing(true)} secondary /> : null}
          {canDelete ? <Button title="Delete event" onPress={askDelete} style={{ backgroundColor: '#A8412B', marginTop: 9 }} /> : null}
        </>}
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <View style={styles.fact}><Text style={styles.factLabel}>{label}</Text><Text style={styles.factValue}>{value || 'Not listed'}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.paper, paddingTop: Platform.OS === 'android' ? 8 : 18 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.line },
  topLabel: { color: theme.muted, fontSize: 9, letterSpacing: 1.4, fontWeight: '900' }, content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 44 }, poster: { width: '100%', height: 240, backgroundColor: '#E9EEE5', borderRadius: 18, marginBottom: 18 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 }, category: { color: theme.green, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 6 }, title: { color: theme.ink, fontSize: 23, lineHeight: 28, fontWeight: '800', letterSpacing: -0.5 }, heart: { height: 48, width: 48, borderRadius: 16, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, justifyContent: 'center', alignItems: 'center', marginLeft: 12 }, heartActive: { backgroundColor: '#FCE9E4', borderColor: '#F1CDC0' }, heartText: { color: '#171717', fontSize: 25, lineHeight: 29 },
  fact: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.line }, factLabel: { color: theme.muted, fontSize: 8, letterSpacing: 1.1, fontWeight: '900', marginBottom: 6 }, factValue: { color: theme.ink, fontSize: 13, lineHeight: 19, fontWeight: '600' }, timeRow: { flexDirection: 'row' },
});
