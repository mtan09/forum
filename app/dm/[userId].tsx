import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { tapMedium } from '@/lib/haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput } from 'react-native';

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  pending?: boolean;
};

const POLL_MS = 5000;

// One thread, addressed by the OTHER user's id. Polls while open — no
// socket infra needed at this stage; push notifications cover the
// backgrounded case.
export default function DmThread() {
  const { c, scheme } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { userId } = useLocalSearchParams();
  const otherId = Array.isArray(userId) ? userId[0] : userId;
  const { user: me } = useAuth();

  const [otherName, setOtherName] = useState('Chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (!otherId) return;
    api<{ username: string }>(`/users/${otherId}`)
      .then((u) => setOtherName(u.username))
      .catch(() => {});
  }, [otherId]);

  const load = useCallback(async () => {
    if (!otherId) return;
    try {
      const data = await api<{ messages: Message[] }>(`/messages/with/${otherId}`);
      // Keep optimistic (pending) messages the server hasn't confirmed yet
      setMessages((prev) => {
        const confirmed = data.messages;
        const ids = new Set(confirmed.map((m) => m.id));
        const stillPending = prev.filter((m) => m.pending && !ids.has(m.id));
        return [...confirmed, ...stillPending];
      });
    } catch (err: any) {
      console.log('Error loading thread:', err?.message);
    }
  }, [otherId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const send = async () => {
    const content = text.trim();
    if (!content || sending || !otherId) return;
    setError(null);
    setSending(true);
    tapMedium();
    const optimistic: Message = {
      id: `pending-${Date.now()}`,
      sender_id: me?.id ?? '',
      content,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    try {
      const res = await api<{ message: Message }>(`/messages/with/${otherId}`, {
        body: { content },
      });
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? res.message : m)));
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setText(content);
      setError(err?.message ?? 'Could not send.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    // New content (mine or theirs) pins the view to the newest message
    const frame = requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [messages.length]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen options={{ title: otherName }} />
      <ThemedView style={styles.screen}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const mine = item.sender_id === me?.id;
            return (
              <ThemedView style={[styles.bubble, mine ? styles.mine : styles.theirs, item.pending && { opacity: 0.6 }]}>
                <ThemedText style={mine ? styles.mineText : styles.theirsText}>{item.content}</ThemedText>
              </ThemedView>
            );
          }}
        />
        {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}
        <ThemedView style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`Message ${otherName}...`}
            placeholderTextColor={c.muted}
            multiline
            style={styles.input}
          />
          <Pressable onPress={send} disabled={sending || !text.trim()}>
            <IconSymbol
              name="arrow.up.circle.fill"
              size={30}
              color={text.trim() && !sending ? c.accent : scheme === 'dark' ? '#5C3E7D' : '#dfaeffff'}
            />
          </Pressable>
        </ThemedView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1 },
  listContent: { padding: 16, gap: 8, flexGrow: 1, justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: c.accent,
    borderBottomRightRadius: 4,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderBottomLeftRadius: 4,
  },
  mineText: { color: '#FFFFFF', fontSize: 15, lineHeight: 20 },
  theirsText: { fontSize: 15, lineHeight: 20 },
  error: { color: c.danger, textAlign: 'center', paddingBottom: 4, fontSize: 13 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: c.accentFaint,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 96,
    paddingTop: 0,
    paddingBottom: 0,
    color: c.text,
  },
});
