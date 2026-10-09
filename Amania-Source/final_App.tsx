import React, { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Modal, Platform, Pressable, StyleSheet, Text, ToastAndroid, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { EventProvider, useEvents } from './data/final_EventProvider';
import { AuthProvider, useAuth } from './data/final_AuthProvider';
import { CampusEvent, Role, Tab } from './data/final_types';
import { CalendarScreen } from './screens/final_CalendarScreen';
import { ExploreScreen, todayISO } from './screens/final_ExploreScreen';
import { MySpaceScreen } from './screens/final_MySpaceScreen';
import { PublishScreen } from './screens/final_PublishScreen';
import { TradeScreen } from './screens/final_TradeScreen';
import { ClubsScreen } from './screens/final_ClubsScreen';
import { ClubProvider } from './data/final_ClubProvider';
import { TradeRepositoryProvider } from './services/TradeRepositoryProvider';
import { AccessScreen } from './screens/final_AccessScreen';
import { AuthScreen } from './screens/final_AuthScreen';
import { EventDetail } from './components/final_EventDetail';
import { IconLabel } from './components/final_UI';
import { theme } from './components/final_theme';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });

function CampusApp() {
  const auth = useAuth();
  const { data, role, setRole, ready, toggleFavorite, deleteEvent, updateEvent, canPublish, currentUserId } = useEvents();
  const [activeTab, setActiveTab] = useState<Tab>('explore');
  const [selectedDay, setSelectedDay] = useState(todayISO());
  const [publishOpen, setPublishOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CampusEvent | null>(null);
  const [calendarFrom, setCalendarFrom] = useState<Tab | null>(null);
  const [selectedClubId, setSelectedClubId] = useState<'inara' | 'coderit' | 'debsoc' | null>(null);
  const [clubEditing, setClubEditing] = useState(false);
  const [clubWhatsappUnavailable, setClubWhatsappUnavailable] = useState(false);
  const history = useRef<Tab[]>([]);
  const lastBack = useRef(0);

  const navigate = (tab: Tab) => {
    if (tab === activeTab) return;
    if (tab === 'explore') history.current = [];
    else history.current = [...history.current, activeTab];
    setActiveTab(tab);
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (roleOpen) { setRoleOpen(false); return true; }
      if (selectedEvent) { setSelectedEvent(null); return true; }
      if (publishOpen) { setPublishOpen(false); return true; }
      if (accessOpen) { setAccessOpen(false); return true; }
      if (calendarFrom) { setCalendarFrom(null); return true; }
      if (activeTab === 'clubs') {
        if (clubWhatsappUnavailable) { setClubWhatsappUnavailable(false); return true; }
        if (clubEditing) { setClubEditing(false); return true; }
        if (selectedClubId) { setSelectedClubId(null); return true; }
      }
      const previous = history.current.pop();
      if (previous) { setActiveTab(previous); return true; }
      if (activeTab !== 'explore') { setActiveTab('explore'); history.current = []; return true; }
      const now = Date.now();
      if (now - lastBack.current < 2000) { BackHandler.exitApp(); return true; }
      lastBack.current = now;
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      return true;
    });
    return () => subscription.remove();
  }, [accessOpen, activeTab, calendarFrom, clubEditing, clubWhatsappUnavailable, publishOpen, roleOpen, selectedClubId, selectedEvent]);

  if (!auth.ready || !ready) return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><ExpoStatusBar style="dark" /><View style={styles.loading}><Text style={styles.wordmark}>Amania</Text></View></SafeAreaView>;
  if (!auth.profile) return <><ExpoStatusBar style="dark" /><AuthScreen hasProfiles={auth.profiles.length > 0} onSignUp={auth.signUp} onSignIn={auth.signIn} onResetPassword={auth.resetPassword} /></>;
  const openEvent = (event: CampusEvent) => setSelectedEvent(event);

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <ExpoStatusBar style="dark" />
    <View style={styles.header}>
      <Pressable style={styles.brand} onPress={() => navigate('explore')}><View style={styles.brandIcon}><Text style={styles.brandGlyph}>✳</Text></View><Text style={styles.wordmark}>Amania</Text></Pressable>
      <View style={styles.headerRight}>
        {canPublish ? <Pressable onPress={() => setPublishOpen(true)} style={styles.publishButton}><Text style={styles.publishButtonText}>＋ Publish</Text></Pressable> : null}
        {auth.profile.role === 'Owner' ? <Pressable onPress={() => setAccessOpen(true)} style={styles.accessButton}><Text style={styles.accessButtonText}>Access</Text>{auth.requests.some((item) => item.status === 'PENDING') ? <View style={styles.accessDot} /> : null}</Pressable> : null}
        {auth.profile.role === 'Owner' ? <Pressable onPress={() => setRoleOpen(true)} style={styles.roleChip}><View style={styles.headerRoleDot} /><Text style={styles.roleText}>{role}</Text><Text style={styles.chevron}>⌄</Text></Pressable> : <Pressable accessibilityRole="button" accessibilityLabel={`Sign out ${auth.profile.username}`} onPress={() => Alert.alert('Sign out?', `Sign out of @${auth.profile?.username}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: () => void auth.signOut() }])} style={styles.roleStatic}><View style={styles.headerRoleDot} /><Text numberOfLines={1} style={styles.roleText}>{auth.profile.username}</Text></Pressable>}
      </View>
    </View>

    <View style={styles.body}>
      {calendarFrom ? <CalendarScreen selectedDay={selectedDay} setSelectedDay={setSelectedDay} onOpen={openEvent} onBrowseEvents={() => { setCalendarFrom(null); setActiveTab('explore'); history.current = []; }} /> : activeTab === 'explore' ? <ExploreScreen onOpen={openEvent} onOpenCalendar={() => setCalendarFrom('explore')} /> : null}
      {!calendarFrom && activeTab === 'space' ? <MySpaceScreen selectedDay={selectedDay} onViewCalendar={(day) => { setSelectedDay(day); setCalendarFrom('space'); }} onOpen={openEvent} onBrowseEvents={() => navigate('explore')} /> : null}
      {!calendarFrom && activeTab === 'trade' ? <TradeScreen /> : null}
      {!calendarFrom ? <View style={[styles.clubsSlot, activeTab !== 'clubs' && styles.hidden]}><ClubsScreen visible={activeTab === 'clubs'} role={role} adminClubId={auth.profile.adminClubId} selectedClubId={selectedClubId} editing={clubEditing} whatsappUnavailable={clubWhatsappUnavailable} onSelectClub={setSelectedClubId} onSetEditing={setClubEditing} onSetWhatsappUnavailable={setClubWhatsappUnavailable} /></View> : null}
    </View>

    {!calendarFrom ? <View style={styles.bottomBar}>
      {([{ key: 'space', glyph: '◌', label: 'My Space' }, { key: 'explore', glyph: '⌂', label: 'Explore' }, { key: 'trade', glyph: '⇄', label: 'Trade' }, { key: 'clubs', glyph: '✳', label: 'Clubs' }] as const).map((item) => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: activeTab === item.key }} onPress={() => navigate(item.key)} style={styles.tab}><View style={[styles.tabIconWrap, activeTab === item.key && styles.tabIconActive]}><Text style={[styles.tabGlyph, activeTab === item.key && styles.tabActive]}>{item.glyph}</Text></View><Text style={[styles.tabLabel, activeTab === item.key && styles.tabLabelActive]}>{item.label}</Text></Pressable>)}
    </View> : null}

    <Modal visible={roleOpen} transparent animationType="fade" onRequestClose={() => setRoleOpen(false)}>
      <Pressable style={styles.roleBackdrop} onPress={() => setRoleOpen(false)}><Pressable style={styles.roleModal} onPress={(event) => event.stopPropagation()}><View style={styles.roleHead}><View><Text style={styles.roleEyebrow}>DEMO PREVIEW</Text><Text style={styles.roleTitle}>Switch role</Text></View><IconLabel label="×" onPress={() => setRoleOpen(false)} /></View>
        {(['Owner', 'Admin', 'Student'] as Role[]).map((item) => <Pressable key={item} onPress={() => { setRole(item); setRoleOpen(false); }} style={[styles.roleOption, role === item && styles.roleOptionActive]}><View style={[styles.roleDot, role === item && styles.roleDotActive]} /><View style={{ flex: 1 }}><Text style={styles.roleOptionTitle}>{item}</Text><Text style={styles.roleOptionDescription}>{item === 'Owner' ? 'Manage and edit any event' : item === 'Admin' ? 'Publish and manage your events' : 'Browse, favorite, and take notes'}</Text></View><Text style={styles.check}>{role === item ? '✓' : ''}</Text></Pressable>)}
        <Text style={styles.roleFoot}>Role preview is available only to the app owner on this device.</Text>
        <Pressable onPress={() => Alert.alert('Sign out?', `Sign out of @${auth.profile?.username}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: () => { setRoleOpen(false); void auth.signOut(); } }])} style={styles.signOutButton}><Text style={styles.signOutText}>Sign out</Text></Pressable>
      </Pressable></Pressable>
    </Modal>

    <PublishOverlay visible={publishOpen} onClose={() => setPublishOpen(false)} />
    {accessOpen ? <View style={StyleSheet.absoluteFill}><AccessScreen onClose={() => setAccessOpen(false)} /></View> : null}
    <EventDetail key={selectedEvent?.id ?? 'none'} event={selectedEvent} visible={!!selectedEvent} onClose={() => setSelectedEvent(null)} role={role} currentUserId={currentUserId} favorite={!!selectedEvent && data.favorites.includes(selectedEvent.id)} onToggleFavorite={() => { if (selectedEvent) void toggleFavorite(selectedEvent); }} onDelete={async () => { if (selectedEvent) await deleteEvent(selectedEvent); }} onUpdate={async (event) => { await updateEvent(event); setSelectedEvent(event); }} />
  </SafeAreaView>;
}

function PublishOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  if (!visible) return null;
  return <View style={StyleSheet.absoluteFill}><PublishScreen onClose={onClose} /></View>;
}

export default function App() {
  return <SafeAreaProvider><AuthProvider><EventProvider><ClubProvider><TradeRepositoryProvider><CampusApp /></TradeRepositoryProvider></ClubProvider></EventProvider></AuthProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.paper }, body: { flex: 1 }, clubsSlot: { flex: 1 }, hidden: { display: 'none' },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.line, backgroundColor: theme.paper }, brand: { flexDirection: 'row', alignItems: 'center' }, brandIcon: { height: 30, width: 30, borderRadius: 10, backgroundColor: theme.green, alignItems: 'center', justifyContent: 'center', marginRight: 8 }, brandGlyph: { color: theme.lime, fontSize: 17 }, wordmark: { color: theme.ink, fontSize: 18, fontWeight: '900', letterSpacing: -0.6 }, headerRight: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  publishButton: { backgroundColor: theme.green, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9 }, publishButtonText: { color: theme.white, fontSize: 10, fontWeight: '900' }, accessButton: { borderRadius: 12, backgroundColor: theme.pale, paddingHorizontal: 10, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 5 }, accessButtonText: { color: theme.green, fontSize: 10, fontWeight: '900' }, accessDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.orange }, roleChip: { borderRadius: 18, backgroundColor: theme.white, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: theme.line, flexDirection: 'row', alignItems: 'center', gap: 6 }, roleStatic: { borderRadius: 18, backgroundColor: theme.white, paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, borderColor: theme.line, flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 105 }, headerRoleDot: { height: 6, width: 6, borderRadius: 3, backgroundColor: theme.orange }, roleText: { color: theme.ink, fontSize: 10, fontWeight: '800' }, chevron: { color: theme.muted, fontSize: 13 },
  bottomBar: { minHeight: 68, marginHorizontal: 13, marginBottom: 8, paddingBottom: 5, paddingTop: 5, flexDirection: 'row', backgroundColor: theme.white, borderRadius: 22, borderWidth: 1, borderColor: '#EDF0EA', shadowColor: '#102118', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.13, shadowRadius: 12, elevation: 8 }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1 }, tabIconWrap: { width: 31, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 3 }, tabIconActive: { backgroundColor: theme.pale }, tabGlyph: { color: '#929B92', fontSize: 19, lineHeight: 23 }, tabActive: { color: theme.green }, tabLabel: { color: '#929B92', fontSize: 9, fontWeight: '700' }, tabLabelActive: { color: theme.green, fontWeight: '900' },
  roleBackdrop: { flex: 1, backgroundColor: 'rgba(16,28,21,0.4)', justifyContent: 'flex-end' }, roleModal: { backgroundColor: theme.paper, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 44 }, roleHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }, roleEyebrow: { color: theme.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.3, marginBottom: 4 }, roleTitle: { color: theme.ink, fontSize: 21, fontWeight: '800' }, roleOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.white, borderColor: theme.line, borderWidth: 1, borderRadius: 15, padding: 13, marginBottom: 8, gap: 10 }, roleOptionActive: { borderColor: theme.green, backgroundColor: '#F0F5EB' }, roleDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: '#AAB4AA' }, roleDotActive: { backgroundColor: theme.green, borderColor: theme.green }, roleOptionTitle: { color: theme.ink, fontSize: 12, fontWeight: '800', marginBottom: 3 }, roleOptionDescription: { color: theme.muted, fontSize: 9 }, check: { color: theme.green, fontSize: 15, fontWeight: '900', width: 16 }, roleFoot: { color: theme.muted, fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 5 }, signOutButton: { alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 10, marginTop: 5 }, signOutText: { color: '#963B2D', fontSize: 10, fontWeight: '900' }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
