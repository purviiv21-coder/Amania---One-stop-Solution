import React, { useMemo, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { isEnded, useEvents } from '../data/final_EventProvider';
import { CampusEvent, CalendarMode } from '../data/final_types';
import { EventCard } from '../components/final_EventCard';
import { IconLabel, PageTitle } from '../components/final_UI';
import { theme } from '../components/final_theme';

const iso = (date: Date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
const asDate = (value: string) => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (value: string, n: number) => { const date = asDate(value); date.setDate(date.getDate() + n); return iso(date); };
const monthText = (date: Date) => date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const mondayStart = (date: Date) => { const d = new Date(date); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };

export function CalendarScreen({ selectedDay, setSelectedDay, onOpen, onBrowseEvents }: { selectedDay: string; setSelectedDay: (day: string) => void; onOpen: (event: CampusEvent) => void; onBrowseEvents?: () => void }) {
  const { data, refresh, toggleFavorite } = useEvents();
  const [mode, setMode] = useState<CalendarMode>('Month');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const selectedDate = asDate(selectedDay);
  const month = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const activeEvents = useMemo(() => data.events.filter((event) => !isEnded(event)).sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)), [data.events]);
  const dayEvents = activeEvents.filter((event) => event.date === selectedDay);
  const shiftMonth = (delta: number) => {
    const next = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + delta, 1);
    setSelectedDay(iso(next));
  };
  const shiftSelected = (delta: number) => setSelectedDay(addDays(selectedDay, delta));
  const monthGrid = useMemo(() => {
    const selected = asDate(selectedDay);
    const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const total = new Date(selected.getFullYear(), selected.getMonth() + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => index - offset + 1).map((day) => day > 0 && day <= total ? iso(new Date(selected.getFullYear(), selected.getMonth(), day)) : '');
  }, [selectedDay]);
  const weekDays = Array.from({ length: 7 }, (_, index) => { const date = mondayStart(selectedDate); date.setDate(date.getDate() + index); return iso(date); });
  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  return <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={theme.green} />}>
    <PageTitle eyebrow="MAKE SPACE FOR IT" title="Calendar" />
    <View style={styles.modes}>{(['Month', 'Week', 'Day'] as const).map((item) => <Pressable key={item} onPress={() => setMode(item)} style={[styles.mode, mode === item && styles.modeActive]}><Text style={[styles.modeText, mode === item && styles.modeTextActive]}>{item}</Text></Pressable>)}</View>

    {mode === 'Month' ? <View style={styles.calendarBox}>
      <View style={styles.monthHeader}><IconLabel label="‹" onPress={() => shiftMonth(-1)} /><Pressable onPress={() => setPickerOpen(true)}><Text style={styles.monthName}>{monthText(month)}  ⌄</Text></Pressable><IconLabel label="›" onPress={() => shiftMonth(1)} /></View>
      <View style={styles.grid}>{['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => <Text key={d} style={styles.weekday}>{d}</Text>)}</View>
      <View style={styles.grid}>{monthGrid.map((key, index) => { const count = activeEvents.filter((event) => event.date === key).length; const active = key === selectedDay; return <Pressable key={`${key}-${index}`} disabled={!key} onPress={() => setSelectedDay(key)} style={[styles.dayCell, active && styles.dayActive]}><Text style={[styles.dayNumber, active && styles.dayNumberActive]}>{key ? asDate(key).getDate() : ''}</Text>{count > 0 ? <View style={[styles.dot, active && styles.dotActive]} /> : null}</Pressable>; })}</View>
    </View> : null}

    {mode === 'Week' ? <View style={styles.weekBlock}><View style={styles.stepper}><IconLabel label="‹" onPress={() => shiftSelected(-7)} /><Pressable onPress={() => setPickerOpen(true)}><Text style={styles.stepLabel}>{monthText(selectedDate).toUpperCase()}  ⌄</Text></Pressable><IconLabel label="›" onPress={() => shiftSelected(7)} /></View><View style={styles.weekStrip}>{weekDays.map((day) => { const date = asDate(day); const active = day === selectedDay; const count = activeEvents.some((event) => event.date === day); return <Pressable key={day} onPress={() => setSelectedDay(day)} style={[styles.weekDay, active && styles.weekDayActive]}><Text style={[styles.weekName, active && styles.weekNameActive]}>{date.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}</Text><Text style={[styles.weekNumber, active && styles.weekNumberActive]}>{date.getDate()}</Text><View style={[styles.dot, active && styles.dotActive, !count && styles.dotHidden]} /></Pressable>; })}</View></View> : null}

    {mode === 'Day' ? <View style={styles.dayFocus}><Pressable onPress={() => setPickerOpen(true)}><Text style={styles.dayMonth}>{monthText(selectedDate).toUpperCase()}  ⌄</Text></Pressable><Text style={styles.dayNumberBig}>{selectedDate.getDate()}</Text><Text style={styles.dayName}>{selectedDate.toLocaleDateString('en-IN', { weekday: 'long' })}</Text><View style={styles.dayFooter}><Pressable accessibilityRole="button" accessibilityLabel="Previous day" onPress={() => shiftSelected(-1)}><Text style={styles.dayArrow}>‹</Text></Pressable><Text style={styles.selectedDayLabel}>SELECTED DAY</Text><Pressable accessibilityRole="button" accessibilityLabel="Next day" onPress={() => shiftSelected(1)}><Text style={styles.dayArrow}>›</Text></Pressable></View></View> : null}

    <View style={styles.listHead}><Text style={styles.listTitle}>{selectedDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</Text></View>
    {dayEvents.length ? dayEvents.map((event) => <EventCard key={event.id} event={event} onPress={() => onOpen(event)} favorite={data.favorites.includes(event.id)} onFavorite={() => void toggleFavorite(event)} />) : <View style={styles.emptyDay}><Text style={styles.emptyMark}>☼</Text><Text style={styles.emptyTitle}>Room for something good.</Text><Text style={styles.emptyCopy}>Pick a day with a dot to see what’s on</Text><Pressable onPress={onBrowseEvents}><Text style={styles.browseLink}>Browse new events  ↗</Text></Pressable></View>}

    <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
      <View style={styles.backdrop}><View style={styles.picker}><View style={styles.pickerHead}><Text style={styles.pickerTitle}>{monthText(month)}</Text><IconLabel label="×" onPress={() => setPickerOpen(false)} /></View><Text style={styles.pickerLabel}>YEAR</Text><View style={styles.years}>{Array.from({ length: 11 }, (_, i) => 2020 + i).map((year) => <Pressable key={year} onPress={() => { const next = new Date(year, month.getMonth(), 1); setSelectedDay(iso(next)); }} style={[styles.year, month.getFullYear() === year && styles.choiceActive]}><Text style={[styles.choiceText, month.getFullYear() === year && styles.choiceTextActive]}>{year}</Text></Pressable>)}</View><Text style={styles.pickerLabel}>MONTH</Text><View style={styles.months}>{Array.from({ length: 12 }, (_, i) => new Date(2020, i, 1).toLocaleDateString('en-IN', { month: 'short' })).map((name, i) => <Pressable key={name} onPress={() => { setSelectedDay(iso(new Date(month.getFullYear(), i, 1))); setPickerOpen(false); }} style={[styles.month, month.getMonth() === i && styles.choiceActive]}><Text style={[styles.choiceText, month.getMonth() === i && styles.choiceTextActive]}>{name}</Text></Pressable>)}</View></View></View>
    </Modal>
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }, modes: { flexDirection: 'row', padding: 4, backgroundColor: '#E9ECE5', borderRadius: 14, marginBottom: 16 }, mode: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 11 }, modeActive: { backgroundColor: theme.green }, modeText: { color: theme.muted, fontSize: 11, fontWeight: '700' }, modeTextActive: { color: theme.white },
  calendarBox: { backgroundColor: theme.white, borderRadius: 20, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: theme.line }, monthHeader: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, monthName: { color: theme.ink, fontSize: 14, fontWeight: '800' }, grid: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { width: `${100 / 7}%`, textAlign: 'center', color: '#99A198', fontSize: 8, fontWeight: '800', paddingVertical: 8 }, dayCell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, dayActive: { backgroundColor: theme.green }, dayNumber: { color: theme.ink, fontSize: 12, fontWeight: '600' }, dayNumberActive: { color: theme.white }, dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.orange, position: 'absolute', bottom: 4 }, dotActive: { backgroundColor: theme.lime }, dotHidden: { opacity: 0 },
  weekBlock: { marginBottom: 20 }, stepper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }, stepLabel: { color: theme.green, fontSize: 10, fontWeight: '900', letterSpacing: 1 }, weekStrip: { backgroundColor: theme.green, borderRadius: 18, flexDirection: 'row', justifyContent: 'space-around', padding: 8 }, weekDay: { alignItems: 'center', minWidth: 38, borderRadius: 13, paddingVertical: 8 }, weekDayActive: { backgroundColor: 'rgba(255,255,255,0.15)' }, weekName: { color: '#B2C5B4', fontSize: 7, fontWeight: '800' }, weekNameActive: { color: '#D4E4D4' }, weekNumber: { color: theme.white, fontSize: 15, fontWeight: '700', marginTop: 6 }, weekNumberActive: { color: theme.lime },
  dayFocus: { backgroundColor: theme.green, borderRadius: 22, padding: 17, alignItems: 'center', marginBottom: 22 }, dayMonth: { color: '#C2D2C3', fontSize: 9, letterSpacing: 1.3, fontWeight: '800' }, dayNumberBig: { color: theme.white, fontSize: 63, lineHeight: 70, fontWeight: '800' }, dayName: { color: theme.lime, fontSize: 12, fontWeight: '700', marginBottom: 12 }, dayFooter: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)', paddingTop: 10, paddingHorizontal: 6 }, selectedDayLabel: { color: '#C2D2C3', fontSize: 8, letterSpacing: 1.2, fontWeight: '800' }, dayArrow: { color: '#0D392A', fontSize: 24, fontWeight: '900' }, listHead: { marginBottom: 11 }, listTitle: { color: theme.ink, fontSize: 15, fontWeight: '800' },
  emptyDay: { minHeight: 180, backgroundColor: '#F0F1EB', borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 18, marginBottom: 14 }, emptyMark: { color: theme.green, fontSize: 29, marginBottom: 9 }, emptyTitle: { color: theme.ink, fontSize: 14, fontWeight: '900', marginBottom: 6 }, emptyCopy: { color: theme.muted, fontSize: 11, textAlign: 'center', marginBottom: 14 }, browseLink: { color: theme.green, fontSize: 10, fontWeight: '900' },
  backdrop: { flex: 1, backgroundColor: 'rgba(16,28,21,0.4)', justifyContent: 'flex-end' }, picker: { backgroundColor: theme.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 44 }, pickerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, pickerTitle: { color: theme.ink, fontSize: 19, fontWeight: '800' }, pickerLabel: { color: theme.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.3, marginTop: 17, marginBottom: 9 }, years: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, year: { width: '17%', paddingVertical: 9, backgroundColor: theme.white, borderRadius: 9, alignItems: 'center' }, months: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, month: { width: '22%', alignItems: 'center', paddingVertical: 10, backgroundColor: theme.white, borderRadius: 10 }, choiceActive: { backgroundColor: theme.green }, choiceText: { color: theme.ink, fontSize: 10, fontWeight: '700' }, choiceTextActive: { color: theme.white },
});
