import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccessRequest, useAuth } from '../data/final_AuthProvider';
import { CLUBS_FOR_ADMIN } from '../data/final_authConfig';
import { theme } from '../components/final_theme';

export function AccessScreen({ onClose }: { onClose: () => void }) {
  const { requests, decideAccess } = useAuth();
  const pending = requests.filter((item) => item.status === 'PENDING').sort((a, b) => a.createdAt - b.createdAt);
  const clubName = (request: AccessRequest) => CLUBS_FOR_ADMIN.find((club) => club.id === request.adminClubId)?.name;

  const confirm = (request: AccessRequest, allow: boolean) => {
    const action = allow ? 'Allow request?' : 'Deny request?';
    const access = request.requestedRole === 'Admin' ? `${clubName(request) || 'Club'} admin` : 'app owner';
    Alert.alert(action, `${allow ? 'Grant' : 'Decline'} ${access} access for ${request.username} (${request.email})?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: allow ? 'Allow request' : 'Deny request', style: allow ? 'default' : 'destructive', onPress: () => void decideAccess(request.id, allow) },
    ]);
  };

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>AMANIA OWNER TOOLS</Text><Text style={styles.title}>Access requests</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close access requests" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View>
    <ScrollView contentContainerStyle={styles.list}>
      <Text style={styles.intro}>Review requests from students. Until approved, requested accounts continue with student access.</Text>
      {pending.length ? pending.map((request) => <View key={request.id} style={styles.card}>
        <View style={styles.requestHead}><View style={styles.rolePill}><Text style={styles.rolePillText}>{request.requestedRole === 'Admin' ? `${clubName(request) || 'Club'} admin` : 'App owner'}</Text></View><Text style={styles.date}>{new Date(request.createdAt).toLocaleDateString()}</Text></View>
        <Text style={styles.username}>{request.username}</Text><Text style={styles.email}>{request.email}</Text><Text style={styles.usn}>USN · {request.usn}</Text>
        <View style={styles.actions}><Pressable onPress={() => confirm(request, false)} style={styles.deny}><Text style={styles.denyText}>Deny</Text></Pressable><Pressable onPress={() => confirm(request, true)} style={styles.allow}><Text style={styles.allowText}>Allow request</Text></Pressable></View>
      </View>) : <View style={styles.empty}><Text style={styles.emptyTitle}>No requests to review</Text><Text style={styles.intro}>New owner and club admin requests will appear here.</Text></View>}
      {requests.some((item) => item.status !== 'PENDING') ? <><Text style={styles.historyTitle}>Recently reviewed</Text>{requests.filter((item) => item.status !== 'PENDING').slice(-10).reverse().map((request) => <View key={request.id} style={styles.historyRow}><View style={{ flex: 1 }}><Text style={styles.historyName}>{request.username} · {request.requestedRole === 'Admin' ? `${clubName(request) || 'Club'} admin` : 'App owner'}</Text><Text style={styles.email}>{request.email}</Text></View><Text style={[styles.status, request.status === 'APPROVED' ? styles.approved : styles.denied]}>{request.status}</Text></View>)}</> : null}
      <Text style={styles.disclaimer}>Requests are stored on this device in the hackathon demo. Shared approvals across phones require a hosted account service.</Text>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.paper }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: theme.line }, eyebrow: { color: theme.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginBottom: 4 }, title: { color: theme.ink, fontSize: 22, fontWeight: '900' }, close: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: theme.white }, closeText: { color: theme.ink, fontSize: 26 }, list: { padding: 18, paddingBottom: 30 }, intro: { color: theme.muted, fontSize: 10, lineHeight: 15, marginBottom: 13 }, card: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 17, padding: 14, marginBottom: 10 }, requestHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, rolePill: { backgroundColor: theme.pale, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 }, rolePillText: { color: theme.green, fontSize: 8, fontWeight: '900' }, date: { color: theme.muted, fontSize: 8 }, username: { color: theme.ink, fontSize: 15, fontWeight: '900' }, email: { color: theme.muted, fontSize: 10, marginTop: 4 }, usn: { color: theme.muted, fontSize: 8, marginTop: 7, letterSpacing: 0.5 }, actions: { flexDirection: 'row', gap: 8, marginTop: 14 }, deny: { flex: 1, minHeight: 42, backgroundColor: '#F8E8E2', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, denyText: { color: '#963B2D', fontSize: 10, fontWeight: '900' }, allow: { flex: 1.4, minHeight: 42, backgroundColor: theme.green, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, allowText: { color: theme.white, fontSize: 10, fontWeight: '900' }, empty: { minHeight: 145, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.pale, borderRadius: 18, padding: 20 }, emptyTitle: { color: theme.ink, fontSize: 15, fontWeight: '900', marginBottom: 8 }, historyTitle: { color: theme.ink, fontSize: 15, fontWeight: '900', marginTop: 20, marginBottom: 8 }, historyRow: { flexDirection: 'row', alignItems: 'center', padding: 11, backgroundColor: theme.white, borderBottomWidth: 1, borderBottomColor: theme.line }, historyName: { color: theme.ink, fontSize: 10, fontWeight: '800' }, status: { fontSize: 8, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, overflow: 'hidden' }, approved: { color: theme.green, backgroundColor: theme.pale }, denied: { color: '#963B2D', backgroundColor: '#F8E8E2' }, disclaimer: { color: theme.muted, fontSize: 8, lineHeight: 13, textAlign: 'center', marginTop: 20 },
});
