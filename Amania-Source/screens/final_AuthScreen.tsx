import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminClubId, CLUBS_FOR_ADMIN } from '../data/final_authConfig';
import { CampusProfile } from '../data/final_AuthProvider';
import { theme } from '../components/final_theme';

type RoleChoice = 'Student' | 'Owner' | 'Admin';
type Page = 'profile' | 'role' | 'login' | 'forgot';
type SignupInput = { usn: string; username: string; email: string; password: string; requestedRole: RoleChoice; adminClubId?: AdminClubId };
type Props = {
  hasProfiles: boolean;
  onSignUp: (input: SignupInput) => Promise<CampusProfile>;
  onSignIn: (username: string, password: string) => Promise<void>;
  onResetPassword: (username: string, email: string, password: string) => Promise<void>;
  profile?: CampusProfile | null;
};

export function AuthScreen({ hasProfiles, onSignUp, onSignIn, onResetPassword, profile }: Props) {
  const [page, setPage] = useState<Page>(hasProfiles ? 'login' : 'profile');
  const [usn, setUsn] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState<RoleChoice>('Student');
  const [clubId, setClubId] = useState<AdminClubId>('inara');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(''); setMessage('');
    try { await action(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not complete this step. Please try again.'); }
    finally { setBusy(false); }
  };

  const submitProfile = () => {
    if (!usn.trim() || !username.trim() || !email.trim() || !password) { setError('Fill in your USN, username, password, and email to continue.'); return; }
    if (password.length < 8) { setError('Use a password with at least 8 characters.'); return; }
    setError(''); setPage('role');
  };

  const finishSignup = () => void run(async () => {
    const created = await onSignUp({ usn, username, email, password, requestedRole, ...(requestedRole === 'Admin' ? { adminClubId: clubId } : {}) });
    if (created.role === 'Owner') Alert.alert('Owner access ready', 'This USN is configured as an initial Amania owner.');
    else if (created.accessStatus === 'PENDING') Alert.alert('Request submitted', 'Your profile is active with student access while an app owner reviews your request.');
    else Alert.alert('Profile created', 'Your Amania student profile is ready.');
  });

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.brand}><View style={styles.brandIcon}><Text style={styles.brandGlyph}>✳</Text></View><Text style={styles.brandName}>amania</Text><Text style={styles.beta}>CAMPUS</Text></View>
      <Text style={styles.eyebrow}>{page === 'role' ? 'ONE LAST STEP' : page === 'login' ? 'WELCOME BACK' : page === 'forgot' ? 'ACCOUNT RECOVERY' : 'YOUR CAMPUS, YOUR SPACE'}</Text>
      <Text style={styles.title}>{page === 'role' ? 'Select your role' : page === 'login' ? 'Sign in to Amania' : page === 'forgot' ? 'Reset your password' : 'Create your profile'}</Text>
      <Text style={styles.subtitle}>{page === 'role' ? 'Students can join right away. Owner and admin access is reviewed by an existing owner.' : page === 'login' ? 'Use your private username and password to continue.' : page === 'forgot' ? 'For this on-device demo, your saved email identifies the account. Email verification delivery is not connected yet.' : 'Your USN identifies your student account. Your username is what other students see.'}</Text>

      {page === 'profile' ? <>
        <Text style={styles.label}>STUDENT USN</Text><TextInput value={usn} onChangeText={setUsn} autoCapitalize="characters" placeholder="e.g. 1MS26IS160" placeholderTextColor={theme.muted} style={styles.input} />
        <Text style={styles.label}>UNIQUE USERNAME</Text><TextInput value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder="Choose a name shown in Amania" placeholderTextColor={theme.muted} style={styles.input} />
        <Text style={styles.label}>PASSWORD</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" placeholder="At least 8 characters" placeholderTextColor={theme.muted} style={styles.input} />
        <Text style={styles.label}>EMAIL FOR PASSWORD RECOVERY</Text><TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="you@example.com" placeholderTextColor={theme.muted} style={styles.input} />
        <Action title="Continue" onPress={submitProfile} />
      </> : null}

      {page === 'role' ? <>
        {(['Student', 'Owner', 'Admin'] as RoleChoice[]).map((choice) => <Pressable key={choice} onPress={() => setRequestedRole(choice)} style={[styles.roleCard, requestedRole === choice && styles.roleCardActive]}><View style={[styles.radio, requestedRole === choice && styles.radioActive]} /> <View style={{ flex: 1 }}><Text style={styles.roleTitle}>{choice === 'Owner' ? 'App owner' : choice}</Text><Text style={styles.roleDescription}>{choice === 'Student' ? 'Browse events, clubs, and trade.' : choice === 'Owner' ? 'Manage access requests and campus publishing.' : 'Request admin access for a club.'}</Text></View><Text style={styles.roleCheck}>{requestedRole === choice ? '✓' : ''}</Text></Pressable>)}
        {requestedRole === 'Admin' ? <><Text style={styles.label}>WHICH CLUB DO YOU ADMINISTER?</Text><View style={styles.clubChoices}>{CLUBS_FOR_ADMIN.map((club) => <Pressable key={club.id} onPress={() => setClubId(club.id)} style={[styles.clubChoice, clubId === club.id && styles.clubChoiceActive]}><Text style={[styles.clubChoiceText, clubId === club.id && styles.clubChoiceTextActive]}>{club.name}</Text></Pressable>)}</View></> : null}
        <Text style={styles.demoNote}>Owner and club admin requests start with student access. An owner can approve or deny each request from the Access button.</Text>
        <Action title={busy ? 'Creating profile…' : 'Create profile'} onPress={finishSignup} disabled={busy} />
        <Action title="Back" onPress={() => { setError(''); setPage('profile'); }} secondary />
      </> : null}

      {page === 'login' ? <>
        <Text style={styles.label}>USERNAME</Text><TextInput value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder="Your Amania username" placeholderTextColor={theme.muted} style={styles.input} />
        <Text style={styles.label}>PASSWORD</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" placeholder="Your password" placeholderTextColor={theme.muted} style={styles.input} />
        <Pressable onPress={() => { setError(''); setPage('forgot'); }} style={styles.textLink}><Text style={styles.linkText}>Forgot password?</Text></Pressable>
        <Action title={busy ? 'Signing in…' : 'Sign in'} onPress={() => void run(() => onSignIn(username, password))} disabled={busy} />
        <Action title="Create a profile" onPress={() => { setError(''); setPage('profile'); }} secondary />
      </> : null}

      {page === 'forgot' ? <>
        <Text style={styles.label}>USERNAME</Text><TextInput value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="Your Amania username" placeholderTextColor={theme.muted} style={styles.input} />
        <Text style={styles.label}>SAVED EMAIL</Text><TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" placeholderTextColor={theme.muted} style={styles.input} />
        <Text style={styles.label}>NEW PASSWORD</Text><TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="At least 8 characters" placeholderTextColor={theme.muted} style={styles.input} />
        <Action title={busy ? 'Updating…' : 'Reset password'} onPress={() => void run(async () => { await onResetPassword(username, email, newPassword); setMessage('Password updated on this device. Sign in with your new password.'); setPage('login'); })} disabled={busy} />
        <Action title="Back to sign in" onPress={() => { setError(''); setPage('login'); }} secondary />
      </> : null}

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {profile?.accessStatus === 'PENDING' ? <Text style={styles.pending}>Your {profile.requestedRole} request is pending. Amania is using student access for now.</Text> : null}
      {busy ? <ActivityIndicator color={theme.green} style={{ marginTop: 9 }} /> : null}
      {page === 'login' ? <Text style={styles.foot}>Profile data and credentials are stored on this device in this hackathon demo. A production sign-in needs a shared auth server.</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}

function Action({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[styles.action, secondary && styles.actionSecondary, disabled && styles.disabled]}><Text style={[styles.actionText, secondary && styles.actionSecondaryText]}>{title}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.paper }, page: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 30 }, brand: { flexDirection: 'row', alignItems: 'center', marginBottom: 35 }, brandIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: theme.green, alignItems: 'center', justifyContent: 'center', marginRight: 10 }, brandGlyph: { color: theme.lime, fontSize: 22 }, brandName: { color: theme.ink, fontSize: 23, fontWeight: '900', letterSpacing: -1 }, beta: { marginLeft: 9, backgroundColor: theme.pale, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, color: theme.green, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  eyebrow: { color: theme.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 7 }, title: { color: theme.ink, fontSize: 27, fontWeight: '900', letterSpacing: -0.7 }, subtitle: { color: theme.muted, fontSize: 12, lineHeight: 18, marginTop: 7, marginBottom: 22 }, label: { color: theme.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 12, marginBottom: 6 }, input: { minHeight: 49, borderWidth: 1, borderColor: theme.line, borderRadius: 14, backgroundColor: theme.white, paddingHorizontal: 13, color: theme.ink, fontSize: 13 },
  action: { minHeight: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.green, marginTop: 14 }, actionText: { color: theme.white, fontSize: 13, fontWeight: '900' }, actionSecondary: { backgroundColor: theme.pale }, actionSecondaryText: { color: theme.green }, disabled: { opacity: 0.55 }, textLink: { alignSelf: 'flex-end', paddingVertical: 12 }, linkText: { color: theme.green, fontSize: 11, fontWeight: '800' },
  roleCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.white, borderRadius: 16, marginBottom: 9 }, roleCardActive: { borderColor: theme.green, backgroundColor: '#F0F5EB' }, radio: { width: 17, height: 17, borderRadius: 9, borderWidth: 1.5, borderColor: '#AAB4AA' }, radioActive: { borderWidth: 5, borderColor: theme.green }, roleTitle: { color: theme.ink, fontSize: 13, fontWeight: '900' }, roleDescription: { color: theme.muted, fontSize: 9, marginTop: 4, lineHeight: 13 }, roleCheck: { color: theme.green, fontSize: 16, fontWeight: '900', width: 18 }, clubChoices: { flexDirection: 'row', gap: 7 }, clubChoice: { flex: 1, minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.white, alignItems: 'center', justifyContent: 'center' }, clubChoiceActive: { backgroundColor: theme.green, borderColor: theme.green }, clubChoiceText: { color: theme.muted, fontSize: 9, fontWeight: '800' }, clubChoiceTextActive: { color: theme.white },
  demoNote: { color: theme.muted, fontSize: 9, lineHeight: 14, backgroundColor: theme.pale, borderRadius: 13, padding: 11, marginTop: 8 }, error: { color: '#9B3C2B', backgroundColor: '#F8E8E2', borderRadius: 11, padding: 11, fontSize: 10, lineHeight: 15, marginTop: 12 }, success: { color: theme.green, backgroundColor: theme.pale, borderRadius: 11, padding: 11, fontSize: 10, lineHeight: 15, marginTop: 12 }, pending: { color: '#6E5737', backgroundColor: '#F6EEDC', borderRadius: 11, padding: 11, fontSize: 10, lineHeight: 15, marginTop: 12 }, foot: { color: theme.muted, fontSize: 8, lineHeight: 13, textAlign: 'center', marginTop: 21 },
});
