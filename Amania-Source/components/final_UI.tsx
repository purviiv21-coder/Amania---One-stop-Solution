import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { theme } from './final_theme';

export function PageTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: React.ReactNode }) {
  return <View style={styles.heading}><View>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.title}>{title}</Text></View>{right}</View>;
}

export function Button({ title, onPress, secondary = false, disabled = false, style }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; style?: ViewStyle }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[styles.button, secondary && styles.secondary, disabled && styles.disabled, style]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text></Pressable>;
}

export function Field({ label, value, onChangeText, placeholder, multiline = false, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean; keyboardType?: 'default' | 'numeric' }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9AA49C" style={[styles.input, multiline && styles.multiline]} multiline={multiline} keyboardType={keyboardType} /></View>;
}

export function Empty({ title, body }: { title: string; body: string }) {
  return <View style={styles.empty}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text></View>;
}

export function IconLabel({ label, onPress, style }: { label: string; onPress: () => void; style?: ViewStyle }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.icon, style]}><Text style={styles.iconText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  eyebrow: { color: theme.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.4, marginBottom: 5 },
  title: { color: theme.ink, fontSize: 27, fontWeight: '800', letterSpacing: -0.7 },
  button: { minHeight: 48, borderRadius: 15, backgroundColor: theme.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  secondary: { backgroundColor: theme.lime }, buttonText: { color: theme.white, fontSize: 13, fontWeight: '800' }, secondaryText: { color: theme.deepGreen }, disabled: { opacity: 0.5 },
  field: { marginBottom: 11 }, fieldLabel: { color: theme.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
  input: { minHeight: 43, borderWidth: 1, borderColor: theme.line, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 9, color: theme.ink, fontSize: 12, backgroundColor: '#FBFCF9' },
  multiline: { minHeight: 82, textAlignVertical: 'top' },
  empty: { paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center' }, emptyTitle: { color: theme.ink, fontSize: 14, fontWeight: '800', marginBottom: 6 }, emptyBody: { color: theme.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line }, iconText: { color: theme.green, fontWeight: '800', fontSize: 19 },
});
