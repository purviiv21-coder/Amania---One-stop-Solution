import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, ImageBackground, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, Empty, Field } from '../components/final_UI';
import { ClubChatbot } from '../components/final_ClubChatbot';
import { theme } from '../components/final_theme';
import { draftClubDescription } from '../data/final_api';
import { useClubs } from '../data/final_ClubProvider';
import { ClubProfile, Role } from '../data/final_types';
import { AdminClubId } from '../data/final_authConfig';

type Props = {
  visible: boolean;
  role: Role;
  adminClubId?: AdminClubId;
  selectedClubId: ClubProfile['id'] | null;
  editing: boolean;
  whatsappUnavailable: boolean;
  onSelectClub: (id: ClubProfile['id'] | null) => void;
  onSetEditing: (editing: boolean) => void;
  onSetWhatsappUnavailable: (unavailable: boolean) => void;
};

const colors: Record<ClubProfile['id'], string> = { inara: '#763C55', coderit: '#244E63', debsoc: '#76563A' };

export function ClubsScreen({ visible, role, adminClubId, selectedClubId, editing, whatsappUnavailable, onSelectClub, onSetEditing, onSetWhatsappUnavailable }: Props) {
  const { clubs, ready, refresh, updateClub } = useClubs();
  const [draft, setDraft] = useState<ClubProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const selectedClub = clubs.find((club) => club.id === selectedClubId) ?? null;
  const canEdit = role === 'Owner' || (role === 'Admin' && selectedClubId !== null && adminClubId === selectedClubId);

  const openEdit = () => { if (!selectedClub) return; setDraft({ ...selectedClub }); onSetEditing(true); };
  const cancelEdit = () => { setDraft(null); onSetEditing(false); };
  const saveEdit = async () => {
    if (!draft) return;
    setSaving(true);
    try { await updateClub(draft); setDraft(null); onSetEditing(false); }
    catch { Alert.alert('Could not save club details', 'Check the phone storage and try again.'); }
    finally { setSaving(false); }
  };
  const chooseBanner = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
    if (!result.canceled && result.assets[0]?.uri) setDraft((current) => current ? { ...current, bannerUri: result.assets[0].uri } : current);
  };
  const generateDraft = async () => {
    if (!draft) return;
    setDrafting(true);
    try {
      const [about, whyJoin] = await draftClubDescription(draft);
      setDraft((current) => current ? { ...current, about, whyJoin } : current);
    } catch (error) { Alert.alert('Description draft unavailable', error instanceof Error ? error.message : 'Connect the scan server and try again.'); }
    finally { setDrafting(false); }
  };
  const openExternal = async (url: string, label: string) => {
    try { await Linking.openURL(url); }
    catch { Alert.alert(`${label} unavailable`, 'This link could not be opened on this phone.'); }
  };
  const joinWhatsApp = (club: ClubProfile) => {
    if (!club.whatsappUrl.trim()) {
      onSetWhatsappUnavailable(true);
      return;
    }
    void openExternal(club.whatsappUrl, 'WhatsApp');
  };
  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  if (!visible) return <View style={{ flex: 1, display: 'none' }}><ClubChatbot clubs={clubs} /></View>;
  if (!ready) return <View style={styles.loading}><ActivityIndicator color={theme.green} /></View>;

  if (whatsappUnavailable && selectedClub) return <ScrollView contentContainerStyle={styles.page}><View style={styles.missingCard}><View style={styles.missingIcon}><Text style={styles.missingIconText}>↗</Text></View><Text style={styles.missingTitle}>WhatsApp link not available yet. Sorry!</Text><Button title="Return" onPress={() => onSetWhatsappUnavailable(false)} /></View></ScrollView>;

  if (editing && selectedClub && draft) return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
    <View style={styles.detailTop}><Pressable onPress={cancelEdit}><Text style={styles.back}>‹  {selectedClub.name}</Text></Pressable><Text style={styles.pageTitle}>Edit club page</Text><Text style={styles.intro}>Changes save on this device. Shared editing needs authentication and a shared backend.</Text></View>
    <Field label="ONE-LINE HOOK" value={draft.tagline} onChangeText={(tagline) => setDraft({ ...draft, tagline })} multiline />
    <Field label="WHAT THE CLUB IS" value={draft.about} onChangeText={(about) => setDraft({ ...draft, about })} multiline />
    <Field label="WHY A STUDENT SHOULD JOIN" value={draft.whyJoin} onChangeText={(whyJoin) => setDraft({ ...draft, whyJoin })} multiline />
    <Field label="HOW TO JOIN" value={draft.joiningInfo} onChangeText={(joiningInfo) => setDraft({ ...draft, joiningInfo })} multiline />
    <Field label="ACHIEVEMENTS · ONE PER LINE" value={draft.achievements.join('\n')} onChangeText={(value) => setDraft({ ...draft, achievements: value.split('\n').map((item) => item.trim()).filter(Boolean) })} multiline />
    <Field label="PRESIDENT" value={draft.president} onChangeText={(president) => setDraft({ ...draft, president })} />
    <Field label="CONTACT EMAIL" value={draft.email} onChangeText={(email) => setDraft({ ...draft, email })} keyboardType="default" />
    <Field label="INSTAGRAM URL" value={draft.instagramUrl} onChangeText={(instagramUrl) => setDraft({ ...draft, instagramUrl })} />
    <Field label="WHATSAPP INVITE URL" value={draft.whatsappUrl} onChangeText={(whatsappUrl) => setDraft({ ...draft, whatsappUrl })} />
    <View style={styles.bannerEdit}><Text style={styles.sectionLabel}>BANNER IMAGE</Text>{draft.bannerUri ? <Image source={{ uri: draft.bannerUri }} style={styles.bannerPreview} resizeMode="cover" /> : <ClubBanner club={draft} compact />}</View>
    <Button title="Choose banner image" onPress={() => void chooseBanner()} secondary />
    <Pressable disabled={drafting} onPress={() => void generateDraft()} style={[styles.aiButton, drafting && styles.disabled]}>{drafting ? <ActivityIndicator color={theme.green} /> : <Text style={styles.aiButtonText}>✳  AI draft description · Gemma 4</Text>}</Pressable>
    <View style={styles.actions}><Button title="Cancel" onPress={cancelEdit} secondary style={{ flex: 1 }} /><Button title={saving ? 'Saving…' : 'Save changes'} onPress={() => void saveEdit()} disabled={saving} style={{ flex: 1 }} /></View>
  </ScrollView>;

  if (selectedClub) return <ScrollView contentContainerStyle={styles.page}>
    <View style={styles.detailTop}><Pressable onPress={() => { onSetWhatsappUnavailable(false); onSetEditing(false); onSelectClub(null); }}><Text style={styles.back}>‹  All clubs</Text></Pressable><View style={styles.detailTitleRow}><View style={{ flex: 1 }}><Text style={styles.kicker}>{selectedClub.category}</Text><Text style={styles.pageTitle}>{selectedClub.name}</Text></View>{canEdit ? <Button title="Edit page" onPress={openEdit} secondary style={styles.editButton} /> : null}</View></View>
    <ClubBanner club={selectedClub} caption={selectedClub.tagline} />
    <View style={styles.detailCopyHead}><Text style={styles.detailCopyTitle}>{selectedClub.name}</Text></View>
    <Text style={styles.paragraph}>{selectedClub.about}</Text><Text style={[styles.paragraph, styles.paragraphSecond]}>{selectedClub.whyJoin}</Text>
    <View style={styles.section}><Text style={styles.sectionTitle}>Achievements</Text>{selectedClub.achievements.length ? selectedClub.achievements.map((item, index) => <View key={`${index}-${item}`} style={styles.achievement}><Text style={styles.achievementMark}>✦</Text><Text style={styles.achievementText}>{item}</Text></View>) : <Empty title="Achievements coming soon" body="The club can add achievements from Edit page." />}</View>
    <View style={styles.actions}><Button title="Join WhatsApp group  ↗" onPress={() => joinWhatsApp(selectedClub)} style={{ flex: 1, minHeight: 48 }} /></View>
    {selectedClub.instagramUrl ? <Pressable onPress={() => void openExternal(selectedClub.instagramUrl, 'Instagram')} style={styles.socialLink}><Text style={styles.socialLinkText}>Visit Instagram  ↗</Text></Pressable> : <View style={styles.socialLink}><Text style={styles.mutedLink}>Instagram link not set</Text></View>}
    <View style={styles.contact}><Text style={styles.sectionLabel}>CLUB PRESIDENT</Text><Text style={styles.contactName}>{selectedClub.president || 'Jane Doe'}</Text><Pressable onPress={() => void openExternal(`mailto:${selectedClub.email || 'janedoe@example.com'}`, 'Email')}><Text style={styles.email}>{selectedClub.email || 'janedoe@example.com'}  ↗</Text></Pressable></View>
    <Text style={styles.disclaimer}>Club page changes and the Admin role switch are local demo preview only. Real club admin permissions and updates shared across phones need authentication and a shared backend.</Text>
  </ScrollView>;

  return <ScrollView keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={theme.green} />} contentContainerStyle={styles.page}>
    <View style={styles.heading}><Text style={styles.kicker}>FIND YOUR PEOPLE</Text><Text style={styles.pageTitle}>Clubs</Text><Text style={styles.intro}>There’s more to campus than class. Find a crew, try something new, and see where it takes you.</Text></View>
    {clubs.map((club) => <Pressable accessibilityRole="button" key={club.id} onPress={() => { onSetWhatsappUnavailable(false); onSelectClub(club.id); }} style={styles.clubCard}>
      <ClubBanner club={club} caption={club.tagline} showName />
      <Text style={styles.cardAction}>Find out more  ↗</Text>
    </Pressable>)}
    <View style={styles.quoteCard}><Text style={styles.quoteText}>“Not all those who wander are lost.”</Text><Text style={styles.quoteCredit}>— J.R.R. Tolkien, The Fellowship of the Ring</Text></View>
    <ClubChatbot clubs={clubs} />
    <Text style={styles.demoNote}>Role switching is a demo. Club edits stay on this phone until authentication and a shared backend are added.</Text>
  </ScrollView>;
}

function ClubBanner({ club, compact = false, caption, showName = false }: { club: ClubProfile; compact?: boolean; caption?: string; showName?: boolean }) {
  const [failed, setFailed] = useState(false);
  const copy = showName ? <View style={styles.bannerOverlay}><Text style={styles.bannerCategory}>{club.category}</Text><Text style={styles.bannerName}>{club.name}</Text>{caption ? <Text numberOfLines={3} style={styles.bannerCaption}>{caption}</Text> : null}<Text style={styles.bannerCta}>Explore club  ↗</Text></View> : <View style={styles.detailBannerContent}>{caption ? <View style={styles.detailCaptionTint}><Text numberOfLines={3} style={styles.bannerCaption}>{caption}</Text></View> : null}</View>;
  const frameStyle = [styles.bannerFrame, compact && styles.bannerCompact];
  if (club.bannerUri && !failed) return <View style={frameStyle}><ImageBackground source={{ uri: club.bannerUri }} onError={() => setFailed(true)} style={styles.bannerBackground} imageStyle={styles.bannerImage}>{showName ? <View style={styles.bannerPhotoTint}>{copy}</View> : copy}</ImageBackground></View>;
  return <View style={[frameStyle, styles.bannerFallback, { backgroundColor: colors[club.id] }]}><Text style={styles.bannerGlyph}>{club.id === 'inara' ? '✧' : club.id === 'coderit' ? '⌘' : '◈'}</Text><Text style={styles.bannerSpark}>✳</Text>{showName ? <View style={styles.bannerPhotoTint}>{copy}</View> : copy}</View>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' }, page: { paddingHorizontal: 19, paddingTop: 19, paddingBottom: 30 }, heading: { marginBottom: 17 }, kicker: { color: theme.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.3, marginBottom: 5 }, pageTitle: { color: theme.ink, fontSize: 25, fontWeight: '900', letterSpacing: -0.6 }, intro: { color: theme.muted, fontSize: 11, lineHeight: 17, marginTop: 7 },
  clubCard: { overflow: 'hidden', borderRadius: 21, marginBottom: 14, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line }, bannerFrame: { width: '100%', height: 184, borderRadius: 21, overflow: 'hidden', backgroundColor: theme.green }, bannerBackground: { width: '100%', height: '100%', backgroundColor: 'transparent' }, bannerCompact: { height: 110, borderRadius: 15 }, bannerImage: { borderRadius: 0 }, bannerFallback: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 21, overflow: 'hidden' }, bannerGlyph: { color: 'rgba(255,255,255,0.22)', fontSize: 100, fontWeight: '300', position: 'absolute', right: 4, top: 12 }, bannerPhotoTint: { flex: 1, backgroundColor: 'rgba(9,24,18,0.36)' }, bannerOverlay: { flex: 1, width: '100%', justifyContent: 'flex-end', paddingHorizontal: 14, paddingVertical: 13 }, detailBannerContent: { flex: 1, justifyContent: 'flex-end' }, detailCaptionTint: { width: '100%', backgroundColor: 'rgba(27,43,65,0.78)', paddingHorizontal: 14, paddingVertical: 13 }, bannerCategory: { color: 'rgba(255,255,255,0.86)', fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginBottom: 5 }, bannerName: { color: theme.white, fontSize: 27, fontWeight: '900', marginBottom: 6 }, bannerCaption: { color: theme.white, fontSize: 11, lineHeight: 16, fontWeight: '800' }, bannerCta: { color: theme.lime, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 10 }, bannerSpark: { color: 'rgba(255,255,255,0.30)', fontSize: 35, position: 'absolute', right: 17, top: 12 }, cardAction: { display: 'none' },
  quoteCard: { backgroundColor: '#E9EEE5', borderRadius: 17, padding: 15, marginTop: 1, marginBottom: 7 }, quoteText: { color: theme.deepGreen, fontSize: 13, lineHeight: 19, fontWeight: '700', fontStyle: 'italic' }, quoteCredit: { color: theme.muted, fontSize: 8, marginTop: 7, textAlign: 'right' }, demoNote: { color: theme.muted, fontSize: 8, lineHeight: 13, textAlign: 'center', marginTop: 13, paddingHorizontal: 14 },
  detailTop: { marginBottom: 13 }, back: { color: theme.green, fontSize: 11, fontWeight: '900', marginBottom: 12 }, detailTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, editButton: { minHeight: 40, paddingHorizontal: 12 }, detailCopyHead: { borderBottomWidth: 1, borderBottomColor: '#C9CEC8', paddingTop: 18, paddingBottom: 9, marginTop: 4 }, detailCopyTitle: { color: theme.ink, fontSize: 17, fontWeight: '900' }, paragraph: { color: '#57645C', fontSize: 11, lineHeight: 18, marginTop: 12, fontWeight: '600' }, paragraphSecond: { marginTop: 2 }, section: { marginTop: 24 }, sectionTitle: { color: theme.ink, fontSize: 16, fontWeight: '900', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#C9CEC8' }, achievement: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', paddingVertical: 8 }, achievementMark: { color: theme.green, fontSize: 13 }, achievementText: { color: theme.ink, fontSize: 10, lineHeight: 15, flex: 1, fontWeight: '700' }, actions: { flexDirection: 'row', gap: 9, marginTop: 20 }, socialLink: { minHeight: 47, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.green, marginTop: 9 }, socialLinkText: { color: theme.green, fontSize: 11, fontWeight: '900' }, mutedLink: { color: theme.muted, fontSize: 10, fontWeight: '700' }, contact: { backgroundColor: theme.pale, borderRadius: 16, padding: 14, marginTop: 17 }, sectionLabel: { color: theme.muted, fontSize: 8, letterSpacing: 1.1, fontWeight: '900', marginBottom: 5 }, contactName: { color: theme.ink, fontSize: 13, fontWeight: '900' }, email: { color: theme.green, fontSize: 10, fontWeight: '700', marginTop: 4 }, disclaimer: { color: theme.muted, fontSize: 8, lineHeight: 13, textAlign: 'center', marginTop: 14, paddingHorizontal: 7 },
  missingCard: { marginTop: 80, borderRadius: 20, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, padding: 20, alignItems: 'center' }, missingIcon: { width: 52, height: 52, borderRadius: 19, backgroundColor: theme.pale, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, missingIconText: { color: theme.green, fontSize: 24 }, missingTitle: { color: theme.ink, fontSize: 14, lineHeight: 20, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  bannerEdit: { marginTop: 3, marginBottom: 8 }, bannerPreview: { width: '100%', height: 110, borderRadius: 15 }, aiButton: { minHeight: 46, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.pale, borderRadius: 14, marginTop: 12 }, aiButtonText: { color: theme.green, fontSize: 11, fontWeight: '900' }, disabled: { opacity: 0.6 },
});
