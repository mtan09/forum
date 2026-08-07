import AppRefreshControl from '@/components/appRefreshControl';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import UserAvatar from '@/components/user-avatar';
import DisplayName from '@/components/display-name';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { api } from '@/lib/api';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { tapLight } from '@/lib/haptics';

type Conversation = {
  conversation_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_demo?: boolean;
  last_message_at: string;
  last_message: string | null;
  last_sender_id: string | null;
  unread: number;
};

function ConversationRow({ conv }: { conv: Conversation }) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const timeAgo = useRelativeTime(conv.last_message_at);
  return (
    <ThemedView style={styles.row}>
      <UserAvatar
        userId={conv.user_id}
        avatarUrl={conv.avatar_url}
        isDemo={conv.is_demo}
        size={50}
        accessibilityLabel={`Open ${conv.username} profile`}
      />
      <Pressable
        onPress={() => { tapLight(); router.push(`/dm/${conv.user_id}`); }}
        style={({ pressed }) => [styles.rowBody, pressed && styles.rowBodyPressed]}
      >
        <ThemedView style={styles.rowTop}>
          <DisplayName username={conv.username} isDemo={conv.is_demo} nameStyle={styles.name} numberOfLines={1} />
          <ThemedText style={styles.time}>{timeAgo}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.rowBottom}>
          <ThemedText
            style={[styles.preview, conv.unread > 0 && styles.previewUnread]}
            numberOfLines={1}
          >
            {conv.last_message ?? ''}
          </ThemedText>
          {conv.unread > 0 && (
            <ThemedView style={styles.unreadDot}>
              <ThemedText style={styles.unreadCount}>{conv.unread > 9 ? '9+' : conv.unread}</ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </Pressable>
    </ThemedView>
  );
}

export default function Messages() {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setConversations(await api<Conversation[]>('/messages'));
    } catch (err: any) {
      console.log('Error loading inbox:', err?.message);
      setConversations((prev) => prev ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (conversations === null) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={c.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.page}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === 'web' ? undefined : <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {conversations.length === 0 ? (
          <ThemedText style={styles.empty}>
            No messages yet. Open someone&apos;s profile and tap Message to start a conversation.
          </ThemedText>
        ) : (
          conversations.map((conv) => <ConversationRow key={conv.conversation_id} conv={conv} />)
        )}
      </ScrollView>
    </ThemedView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // The shell already supplies the centred column, background, and hairlines;
  // framing again here nested a rounded card inside it.
  page: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: c.background,
  },
  screen: {
    width: '100%',
    backgroundColor: c.background,
  },
  container: { paddingVertical: 8 },
  empty: {
    textAlign: 'center',
    color: c.muted,
    marginTop: 48,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    backgroundColor: c.background,
  },
  rowBody: { flex: 1, gap: 2 },
  rowBodyPressed: { opacity: 0.6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontWeight: '700', fontSize: 16, flexShrink: 1 },
  time: { color: c.muted, fontSize: 12 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { flex: 1, color: c.muted, fontSize: 14 },
  previewUnread: { color: c.text, fontWeight: '600' },
  unreadDot: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadCount: { color: c.onPrimary, fontSize: 11, fontWeight: '800', lineHeight: 14 },
});
