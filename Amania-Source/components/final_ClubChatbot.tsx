import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { askClubGuide } from '../data/final_api';
import { ClubProfile } from '../data/final_types';
import { theme } from './final_theme';

type Message = { id: string; role: 'user' | 'assistant'; text: string; error?: boolean };

export function ClubChatbot({ clubs }: { clubs: ClubProfile[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const question = draft.trim();
    if (!question || loading) return;
    const history = messages.filter((message) => !message.error).slice(-8).map(({ role, text }) => ({ role, text }));
    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: question };
    setMessages((current) => [...current, userMessage].slice(-16));
    setDraft('');
    setLoading(true);
    try {
      const answer = await askClubGuide(question, clubs, history);
      const reply: Message = { id: `guide-${Date.now()}`, role: 'assistant', text: answer };
      setMessages((current) => [...current, reply].slice(-16));
    } catch (error) {
      const reply: Message = { id: `error-${Date.now()}`, role: 'assistant', error: true, text: error instanceof Error ? error.message : 'The club guide is unavailable. Please try again.' };
      setMessages((current) => [...current, reply].slice(-16));
    } finally { setLoading(false); }
  };

  return <View style={styles.card}>
    <View style={styles.header}><View style={styles.badge}><Text style={styles.badgeText}>✳</Text></View><View style={{ flex: 1 }}><Text style={styles.title}>Ask about clubs</Text><Text style={styles.subtitle}>A campus guide, powered by Gemma 4</Text></View></View>
    <Text style={styles.hint}>Wondering where you might fit in? Ask about activities, achievements, how to join, or club contacts.</Text>
    {messages.map((message) => <View key={message.id} style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.guideBubble, message.error && styles.errorBubble]}><Text style={[styles.message, message.role === 'user' && styles.userMessage, message.error && styles.errorMessage]}>{message.text}</Text></View>)}
    {loading ? <View style={styles.loading}><ActivityIndicator size="small" color={theme.green} /><Text style={styles.hint}>Checking the club guide…</Text></View> : null}
    <View style={styles.inputRow}><TextInput value={draft} onChangeText={setDraft} placeholder="Ask something about the clubs…" placeholderTextColor="#879187" style={styles.input} returnKeyType="send" onSubmitEditing={() => void send()} accessibilityLabel="Ask the club guide" /><Pressable accessibilityRole="button" accessibilityLabel="Send club question" onPress={() => void send()} disabled={!draft.trim() || loading} style={[styles.send, (!draft.trim() || loading) && styles.disabled]}><Text style={styles.sendText}>Ask</Text></Pressable></View>
    <Text style={styles.footnote}>Answers use the club information in Amania. If a detail isn’t listed, the guide will say so.</Text>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 21, padding: 16, marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 }, badge: { width: 37, height: 37, borderRadius: 13, backgroundColor: theme.green, alignItems: 'center', justifyContent: 'center' }, badgeText: { color: theme.lime, fontSize: 19 }, title: { color: theme.ink, fontSize: 14, fontWeight: '900' }, subtitle: { color: theme.muted, fontSize: 9, marginTop: 3 },
  hint: { color: theme.muted, fontSize: 10, lineHeight: 15, marginTop: 11 }, bubble: { maxWidth: '92%', borderRadius: 13, padding: 11, marginTop: 9 }, userBubble: { alignSelf: 'flex-end', backgroundColor: theme.green }, guideBubble: { alignSelf: 'flex-start', backgroundColor: theme.pale }, errorBubble: { backgroundColor: '#FFF1EA' }, message: { color: theme.ink, fontSize: 10, lineHeight: 15 }, userMessage: { color: theme.white }, errorMessage: { color: '#873C21' }, loading: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13 }, input: { flex: 1, minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.paper, paddingHorizontal: 12, color: theme.ink, fontSize: 11 }, send: { minHeight: 42, minWidth: 58, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.green, paddingHorizontal: 14 }, sendText: { color: theme.white, fontSize: 11, fontWeight: '900' }, disabled: { opacity: 0.45 }, footnote: { color: theme.muted, fontSize: 8, lineHeight: 12, marginTop: 10 },
});
