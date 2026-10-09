import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from './final_theme';

export const avatars = ['🐸', '🐻', '🐱', '🦊', '🐼'];

export function AvatarPicker({ visible, avatar, onSelect, onClose }: { visible: boolean; avatar: string; onSelect: (avatar: string) => void; onClose: () => void }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
        <View style={styles.heading}><View><Text style={styles.eyebrow}>YOUR PROFILE</Text><Text style={styles.title}>Choose an avatar</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close avatar picker" onPress={onClose}><Text style={styles.close}>×</Text></Pressable></View>
        <View style={styles.choices}>{avatars.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityLabel={`Choose ${item} avatar`} onPress={() => { onSelect(item); onClose(); }} style={[styles.choice, avatar === item && styles.selected]}><Text style={styles.emoji}>{item}</Text></Pressable>)}</View>
      </Pressable>
    </Pressable>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,28,21,0.35)' },
  sheet: { backgroundColor: theme.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 44 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  eyebrow: { color: theme.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.4, marginBottom: 5 },
  title: { color: theme.ink, fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  close: { color: theme.ink, fontSize: 30, fontWeight: '500', paddingHorizontal: 4 },
  choices: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  choice: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line },
  selected: { borderColor: theme.green, backgroundColor: '#F0F5EB', borderWidth: 1.5 }, emoji: { fontSize: 31 },
});
