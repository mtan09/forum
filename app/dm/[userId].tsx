import AppTextInput from '@/components/app-text-input';
import ContentActions from '@/components/contentActions';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import UserAvatar from '@/components/user-avatar';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { tapMedium } from '@/lib/haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { userId } = useLocalSearchParams();
  const router = useRouter();
  const otherId = Array.isArray(userId) ? userId[0] : userId;
  const { user: me } = useAuth();
  const insets = useSafeAreaInsets();

  const [otherName, setOtherName] = useState('Chat');
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);
  const [otherIsDemo, setOtherIsDemo] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (!otherId) return;
    api<{ username: string; avatar_url?: string | null; is_demo?: boolean }>(`/users/${otherId}`)
      .then((u) => {
        setOtherName(u.username);
        setOtherAvatar(u.avatar_url ?? null);
        setOtherIsDemo(!!u.is_demo);
      })
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
      style={styles.keyboard}
      keyboardVerticalOffset={100}
    >
      {/* Keep the compact native navigation title usable. The fictional-account
          disclosure remains visible in the inbox row and on the user's profile. */}
      <Stack.Screen options={{ title: otherName }} />
      <ThemedView style={styles.screen}>
        <FlatList
          ref={listRef}
          data={messages}
          showsVerticalScrollIndicator={false}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const mine = item.sender_id === me?.id;
            return (
              <ThemedView style={[styles.messageRow, mine && styles.messageRowMine, item.pending && styles.pending]}>
                {!mine && otherId ? (
                  <UserAvatar
                    userId={otherId}
                    avatarUrl={otherAvatar}
                    isDemo={otherIsDemo}
                    size={30}
                    accessibilityLabel={`Open ${otherName} profile`}
                    containerStyle={styles.messageAvatar}
                  />
                ) : null}
                <ThemedView style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <ThemedText style={mine ? styles.mineText : styles.theirsText}>{item.content}</ThemedText>
                </ThemedView>
                {!mine && otherId ? (
                  <ThemedView style={styles.messageAction}>
                    <ContentActions
                      targetKind="message"
                      targetId={item.id}
                      authorId={otherId}
                      authorName={otherName}
                      color={c.muted}
                      onBlocked={() => router.back()}
                    />
                  </ThemedView>
                ) : null}
              </ThemedView>
            );
          }}
        />
        {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}
        <ThemedView style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <AppTextInput
            value={text}
            onChangeText={setText}
            placeholder={`Message ${otherName}…`}
            multiline
            editable={!sending}
            actionIcon="paperplane.fill"
            actionLabel="Send message"
            actionDisabled={sending || !text.trim()}
            onAction={send}
            containerStyle={styles.composer}
          />
        </ThemedView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  keyboard: {
    flex: 1,
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    padding: Platform.OS === 'web' ? 20 : 0,
    backgroundColor: Platform.OS === 'web' ? c.surface : c.background,
  },
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 760 : undefined,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: c.border,
    borderRadius: Platform.OS === 'web' ? 20 : 0,
    backgroundColor: c.background,
    overflow: 'hidden',
  },
  listContent: { padding: 16, gap: 8, flexGrow: 1, justifyContent: 'flex-end' },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: 'transparent',
  },
  messageRowMine: { justifyContent: 'flex-end' },
  messageAvatar: { alignSelf: 'flex-end', marginBottom: 2 },
  messageAction: { alignSelf: 'flex-end', marginBottom: 2, backgroundColor: 'transparent' },
  pending: { opacity: 0.6 },
  bubble: {
    maxWidth: Platform.OS === 'web' ? '72%' : '66%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  mine: {
    backgroundColor: c.primary,
    borderBottomRightRadius: 4,
  },
  theirs: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderBottomLeftRadius: 4,
  },
  mineText: { color: c.onPrimary, fontSize: 15, lineHeight: 20 },
  theirsText: { fontSize: 15, lineHeight: 20 },
  error: { color: c.danger, textAlign: 'center', paddingBottom: 4, fontSize: 13 },
  composerWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: c.background,
  },
  composer: { width: '100%' },
});
