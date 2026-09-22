import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppShell, Heading, Loading, PremiumGate, QueryError } from '../src/components/security-ui';
import { Notice } from '../src/components/ui';
import { useSubscription } from '../src/billing/context';
import { useSecurityQuery } from '../src/security/hooks';
import { ChatMessage } from '../src/security/types';
import { streamApi } from '../src/auth/api';
import { useAuth } from '../src/auth/context';
import { fonts, makeStyles, useTheme } from '../src/theme';

export default function Assistant() {
  const s = useStyles(); const { colors } = useTheme(); const { user } = useAuth(); const { isSubscribed } = useSubscription(); const client = useQueryClient();
  const history = useSecurityQuery<ChatMessage[]>('assistant/messages', isSubscribed);
  const [input, setInput] = useState(''); const [live, setLive] = useState(''); const [question, setQuestion] = useState('');
  const controller = useRef<AbortController | null>(null); const scroll = useRef<ScrollView>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const send = useMutation({ mutationFn: async (text: string) => {
    if (!isSubscribed) throw new Error('Pro membership is required.');
    const request = new AbortController(); controller.current = request;
    await streamApi('/assistant/chat', { message: text }, (kind, data) => {
      if (kind === 'token') setLive(value => value + data.text);
    }, request);
  }, onMutate: text => { setQuestion(text); setLive(''); setInput(''); },
  onSettled: async () => { await client.invalidateQueries({ queryKey: ['security', user?.id, 'assistant/messages'] }); setQuestion(''); setLive(''); controller.current = null; } });
  function submit(text = input) { if (!send.isPending && text.trim()) send.mutate(text.trim()); }
  const composer = isSubscribed ? <View style={s.composer}><TextInput testID="assistant-message-input" accessibilityLabel="Ask your security assistant" value={input} onChangeText={setInput} multiline maxLength={4000} placeholder="Ask about your security…" placeholderTextColor={colors.muted} style={s.input} editable={!send.isPending} /><Pressable testID="assistant-send-button" accessibilityRole="button" accessibilityLabel="Send question" disabled={!input.trim() || send.isPending} onPress={() => submit()} style={[s.send, (!input.trim() || send.isPending) && { opacity: 0.5 }]}>{send.isPending ? <ActivityIndicator color={colors.onBrand} /> : <Ionicons name="arrow-up" size={22} color={colors.onBrand} />}</Pressable></View> : undefined;
  return <AppShell testID="assistant-screen" active="Assistant" footer={composer} scrollRef={scroll} onContentSizeChange={() => { if (send.isPending) scroll.current?.scrollToEnd({ animated: true }); }}>
    <Heading title="YOUR AI ANALYST" eyebrow="GPT-5.4 / PRO" /><PremiumGate>
      <Text testID="assistant-scope-notice" style={s.notice}>Guidance based on your recorded workspace controls. No automatic scanning or actions. Don’t share passwords, secrets, or classified data.</Text>
      {history.isLoading && <Loading text="Loading your conversation…" />}{history.error && <QueryError error={history.error} retry={() => void history.refetch()} />}
      {!history.isLoading && !history.data?.length && !send.isPending && <View style={s.start}><View style={s.emblem}><Ionicons name="sparkles-outline" size={34} color={colors.brand} /></View><Text style={s.startTitle}>What should we look at?</Text><Text style={s.startText}>Start with your workspace or ask a defensive security question.</Text>
        {['Review my workspace risks', 'How should I prioritize my findings?', 'Build a zero-trust checklist for my sector'].map((text, index) => <Pressable key={text} testID={`assistant-suggestion-${index}`} onPress={() => submit(text)} style={s.suggestion}><Text style={s.suggestionText}>{text}</Text><Ionicons name="arrow-forward" color={colors.brand} size={16} /></Pressable>)}
      </View>}
      {(history.data || []).map(m => <Message key={m.id} message={m} />)}
      {question && <Message message={{ id: 'pending-question', role: 'user', text: question, created_at: '' }} />}
      {send.isPending && <View testID="assistant-streaming-response" style={s.aiBubble}><Text style={s.role}>ZEROTRUST AI · GPT-5.4</Text>{live ? <Text selectable style={s.messageText}>{live}</Text> : <View style={s.thinking}><ActivityIndicator color={colors.brand} /><Text style={s.notice}>Reviewing your context…</Text></View>}</View>}
      {send.error && <Notice testID="assistant-error-message" text={send.error.message} error />}
      <Text style={s.footer}>AI guidance can be wrong. Validate recommendations before making changes.</Text>
    </PremiumGate>
  </AppShell>;
}
function Message({ message }: { message: ChatMessage }) { const s = useStyles(); return <View testID={`chat-message-${message.id}`} style={message.role === 'assistant' ? s.aiBubble : s.userBubble}><Text style={s.role}>{message.role === 'assistant' ? 'ZEROTRUST AI · GPT-5.4' : 'YOU'}</Text><Text testID={`chat-text-${message.id}`} selectable style={s.messageText}>{message.text}</Text></View>; }
const useStyles = makeStyles(c => ({
  notice: { fontFamily: fonts.body, fontSize: 11, lineHeight: 18, color: c.muted, marginBottom: 16 }, start: { marginTop: 18, marginBottom: 16 }, emblem: { height: 64, width: 64, backgroundColor: c.brandWash, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.brandTertiary, marginBottom: 22 }, startTitle: { fontFamily: fonts.display, fontSize: 28, color: c.onSurface }, startText: { fontFamily: fonts.body, color: c.muted, fontSize: 14, lineHeight: 22, marginTop: 8, marginBottom: 24 }, suggestion: { borderWidth: 1, borderColor: c.borderStrong, padding: 16, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, borderRadius: 4 }, suggestionText: { color: c.onSurfaceTertiary, fontFamily: fonts.body, fontSize: 13, flex: 1 }, aiBubble: { backgroundColor: c.surfaceSecondary, borderLeftWidth: 2, borderLeftColor: c.brand, padding: 16, marginBottom: 16 }, userBubble: { backgroundColor: c.surfaceTertiary, padding: 16, marginLeft: 20, marginBottom: 16, borderRadius: 4 }, role: { color: c.muted, fontFamily: fonts.medium, fontSize: 9, letterSpacing: 1, marginBottom: 10 }, messageText: { color: c.onSurfaceTertiary, fontFamily: fonts.body, fontSize: 14, lineHeight: 23 }, thinking: { flexDirection: 'row', alignItems: 'center', gap: 12 }, composer: { backgroundColor: c.surfaceSecondary, flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 14, borderTopWidth: 1, borderColor: c.border }, input: { flex: 1, minHeight: 46, maxHeight: 120, color: c.onSurface, fontFamily: fonts.body, fontSize: 14, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderStrong, borderRadius: 4 }, send: { width: 46, height: 46, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', borderRadius: 4 }, footer: { fontFamily: fonts.body, color: c.muted, fontSize: 10, lineHeight: 17, marginTop: 12 },
}));