import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CampusEvent } from '../data/final_types';
import { dateLabel, timeLabel } from './final_EventDetail';
import { theme } from './final_theme';

export function EventCard({ event, onPress, favorite, onFavorite }: { event: CampusEvent; onPress: () => void; favorite: boolean; onFavorite: () => void }) {
  return <Pressable onPress={onPress} style={styles.card}>
    {event.posterUri ? <Image source={{ uri: event.posterUri }} style={styles.poster} resizeMode="cover" /> : <View style={[styles.poster, styles.posterEmpty]}><Text style={styles.posterMark}>✳</Text></View>}
    <View style={styles.body}><View style={styles.top}><Text numberOfLines={1} style={styles.category}>{event.category.toUpperCase()}</Text><Pressable accessibilityRole="button" accessibilityLabel={favorite ? 'Remove favorite' : 'Add favorite'} hitSlop={9} onPress={(e) => { e.stopPropagation(); onFavorite(); }}><Text style={styles.heart}>{favorite ? '♥' : '♡'}</Text></Pressable></View>
      <Text numberOfLines={2} style={styles.title}>{event.title}</Text><Text style={styles.meta}>{dateLabel(event.date)} · {timeLabel(event.startTime)}{event.endTime ? `–${timeLabel(event.endTime)}` : ''}</Text><Text numberOfLines={1} style={styles.venue}>⌖  {event.venue}</Text></View>
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.white, borderRadius: 18, borderWidth: 1, borderColor: '#EFF1EB', overflow: 'hidden', marginBottom: 11 },
  poster: { width: '100%', height: 150 }, posterEmpty: { backgroundColor: theme.green, alignItems: 'center', justifyContent: 'center' }, posterMark: { color: theme.lime, fontSize: 48 },
  body: { padding: 14 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }, category: { color: theme.green, fontSize: 8, fontWeight: '900', letterSpacing: 1.2, flex: 1 }, heart: { color: '#171717', fontSize: 21 }, title: { color: theme.ink, fontSize: 15, fontWeight: '800', marginBottom: 6 }, meta: { color: theme.muted, fontSize: 10, lineHeight: 15, marginBottom: 4 }, venue: { color: '#879188', fontSize: 10 },
});
