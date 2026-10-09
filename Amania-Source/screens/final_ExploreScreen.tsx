import React, { useMemo, useState } from 'react';
import { PanResponder, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { isEnded, useEvents } from '../data/final_EventProvider';
import { CampusEvent } from '../data/final_types';
import { EventCard } from '../components/final_EventCard';
import { timeLabel } from '../components/final_EventDetail';
import { AvatarPicker } from '../components/final_AvatarPicker';
import { theme } from '../components/final_theme';

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
};

export function ExploreScreen({ onOpen, onOpenCalendar }: { onOpen: (event: CampusEvent) => void; onOpenCalendar: () => void }) {
  const { data, refresh, toggleFavorite, setAvatar } = useEvents();
  const [refreshing, setRefreshing] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [todayIndex, setTodayIndex] = useState(0);
  const today = useMemo(() => data.events.filter((event) => event.date === todayISO() && !isEnded(event)).sort((a, b) => a.startTime.localeCompare(b.startTime)), [data.events]);
  const upcoming = useMemo(() => data.events.filter((event) => !isEnded(event)).sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)), [data.events]);
  const rotate = (delta: number) => setTodayIndex((index) => (index + delta + today.length) % today.length);
  const todayIndexSafe = today.length ? Math.min(todayIndex, today.length - 1) : 0;
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderRelease: (_event, gesture) => { if (today.length > 1 && Math.abs(gesture.dx) > 36) setTodayIndex((index) => (index + (gesture.dx < 0 ? 1 : -1) + today.length) % today.length); },
  }), [today.length]);
  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };
  const featured = today[todayIndexSafe];

  return <>
  <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={theme.green} />}>
    <View style={styles.titleRow}><View><Text style={styles.dateKicker}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</Text><Text style={styles.pageTitle}>What’s happening</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Choose avatar" onPress={() => setAvatarOpen(true)} style={styles.avatar}><Text style={styles.avatarEmoji}>{data.avatar}</Text></Pressable></View>
    <View style={styles.hero} {...(today.length > 1 ? pan.panHandlers : {})}>
      <Text style={styles.heroKicker}>●  YOUR CAMPUS, IN MOTION</Text>
      <Text style={styles.heroTitle}>A good week starts with a good plan.</Text>
      {featured ? <>
        <Text style={styles.heroMeta}>TODAY · {featured.title}</Text>
        <Text style={styles.heroMeta}>{timeLabel(featured.startTime)}{featured.endTime ? ` – ${timeLabel(featured.endTime)}` : ''}  ·  {featured.venue}</Text>
        <View style={styles.heroBottom}><Text onPress={() => onOpen(featured)} style={styles.heroOpen}>Event details ↗</Text>
          {today.length > 1 ? <View style={styles.arrows}><Text onPress={() => rotate(-1)} style={styles.arrow}>‹</Text><Text style={styles.count}>{todayIndexSafe + 1} / {today.length}</Text><Text onPress={() => rotate(1)} style={styles.arrow}>›</Text></View> : null}
        </View>
      </> : <Text style={styles.noToday}>No events for today</Text>}
      <Text style={styles.watermark}>✳</Text>
    </View>
    <Pressable style={styles.calendarLink} onPress={onOpenCalendar}><Text style={styles.calendarLinkText}>Open the campus calendar  ↗</Text></Pressable>
    <View style={styles.feedHead}><View><Text style={styles.kicker}>NEW EVENTS AROUND THE CAMPUS</Text><Text style={styles.feedTitle}>Find your next thing.</Text></View></View>
    {upcoming.length ? upcoming.map((event) => <EventCard key={event.id} event={event} onPress={() => onOpen(event)} favorite={data.favorites.includes(event.id)} onFavorite={() => void toggleFavorite(event)} />) : <View style={styles.empty}><Text style={styles.emptyTitle}>Nothing on the calendar yet</Text><Text style={styles.emptyBody}>When an admin publishes a poster, it will show up</Text></View>}
    <View style={styles.nudge}><Text style={styles.nudgeMark}>✳</Text><View style={{ flex: 1 }}><Text style={styles.nudgeTitle}>Small plans add up.</Text><Text style={styles.nudgeCopy}>Save events you like and we’ll help you remember them.</Text></View></View>
  </ScrollView>
  <AvatarPicker visible={avatarOpen} avatar={data.avatar} onSelect={(avatar) => void setAvatar(avatar)} onClose={() => setAvatarOpen(false)} />
  </>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingTop: 17, paddingBottom: 26 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }, dateKicker: { color: theme.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.3, marginBottom: 5 }, pageTitle: { color: theme.ink, fontSize: 26, fontWeight: '900', letterSpacing: -0.7 }, avatar: { height: 48, width: 48, borderRadius: 19, backgroundColor: theme.lime, alignItems: 'center', justifyContent: 'center' }, avatarEmoji: { fontSize: 29 },
  calendarLink: { alignSelf: 'flex-end', paddingVertical: 2, marginTop: 12, marginBottom: 29 }, calendarLinkText: { color: theme.green, fontSize: 10, fontWeight: '900' },
  hero: { minHeight: 218, backgroundColor: theme.green, borderRadius: 25, padding: 19, marginBottom: 5, overflow: 'hidden', justifyContent: 'center' },
  heroKicker: { color: '#D8E6D4', fontSize: 8, letterSpacing: 1.2, fontWeight: '900', marginBottom: 17, backgroundColor: 'rgba(255,255,255,0.09)', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 }, heroTitle: { color: theme.white, fontSize: 25, lineHeight: 29, fontWeight: '800', letterSpacing: -0.5, maxWidth: '88%', marginBottom: 13 }, heroMeta: { color: '#D6E1D6', fontSize: 10, lineHeight: 16, maxWidth: '90%' },
  noToday: { color: '#D6E1D6', fontSize: 11, paddingTop: 2 }, heroBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }, heroOpen: { color: theme.lime, fontSize: 10, fontWeight: '800' }, arrows: { flexDirection: 'row', alignItems: 'center', gap: 12 }, arrow: { color: theme.white, fontSize: 25, fontWeight: '400', paddingHorizontal: 4 }, count: { color: '#C8D7CA', fontSize: 9, fontWeight: '700' }, watermark: { position: 'absolute', right: -10, top: -24, color: 'rgba(255,255,255,0.06)', fontSize: 132 },
  feedHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }, kicker: { color: theme.muted, fontSize: 8, letterSpacing: 1.3, fontWeight: '900', marginBottom: 5 }, feedTitle: { color: theme.ink, fontSize: 19, fontWeight: '800' },
  empty: { minHeight: 116, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 22 }, emptyTitle: { color: theme.ink, fontSize: 14, fontWeight: '900', marginBottom: 6 }, emptyBody: { color: theme.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  nudge: { backgroundColor: theme.pale, borderRadius: 18, minHeight: 76, marginTop: 15, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 }, nudgeMark: { color: theme.green, fontSize: 25 }, nudgeTitle: { color: theme.deepGreen, fontSize: 12, fontWeight: '900', marginBottom: 3 }, nudgeCopy: { color: theme.muted, fontSize: 10, lineHeight: 15 },
});
