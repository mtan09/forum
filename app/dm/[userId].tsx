import AppTextInput from '@/components/app-text-input';
import AvatarVisual from '@/components/avatar-visual';
import ContentActions from '@/components/contentActions';
import DisplayName from '@/components/display-name';
import MessageContentPreview, { type SharedContentPreview } from '@/components/message-content-preview';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import UserAvatar from '@/components/user-avatar';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { tapLight, tapMedium } from '@/lib/haptics';
import { openExternalUrl } from '@/lib/open-external';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  shared_kind?: 'post' | 'article' | null;
  shared_id?: string | null;
  shared?: SharedContentPreview | null;
  pending?: boolean;
};

type TimelineItem =
  | { kind: 'separator'; id: string; label: string }
  | { kind: 'message'; id: string; message: Message };

const POLL_MS = 5000;
const GROUP_GAP_MS = 15 * 60 * 1000;
const TIMESTAMP_RAIL_WIDTH = 64;
const MESSAGE_URL_PATTERN = /(https?:\/\/[^\s]+)/g;

function sameCalendarDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function dayDifference(date: Date, now: Date): number {
  const then = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((today - then) / 86_400_000);
}

function exactTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function groupLabel(date: Date, now: Date): string {
  const time = exactTime(date);
  const daysAgo = dayDifference(date, now);
  if (daysAgo === 0) return time;
  if (daysAgo === 1) return `Yesterday at ${time}`;
  if (daysAgo > 1 && daysAgo < 7) {
    const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
    return `${weekday} at ${time}`;
  }
  const monthDay = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);
  return `${monthDay} at ${time}`;
}

function buildTimeline(messages: Message[], now = new Date()): TimelineItem[] {
  const timeline: TimelineItem[] = [];
  let previous: Date | null = null;
  messages.forEach((message) => {
    const created = new Date(message.created_at);
    const startsGroup = !previous
      || !sameCalendarDay(created, previous)
      || created.getTime() - previous.getTime() >= GROUP_GAP_MS;
    if (startsGroup) {
      timeline.push({
        kind: 'separator',
        id: `separator-${message.id}`,
        label: groupLabel(created, now),
      });
    }
    timeline.push({ kind: 'message', id: message.id, message });
    previous = created;
  });
  return timeline;
}

type MessageRowProps = {
  message: Message;
  mine: boolean;
  otherId?: string;
  otherName: string;
  otherAvatar: string | null;
  otherIsDemo: boolean;
  revealProgress: SharedValue<number>;
  openMessageUrl: (url: string) => void;
  onBlocked: () => void;
  styles: ReturnType<typeof makeStyles>;
  mutedColor: string;
};

function MessageRow({
  message,
  mine,
  otherId,
  otherName,
  otherAvatar,
  otherIsDemo,
  revealProgress,
  openMessageUrl,
  onBlocked,
  styles,
  mutedColor,
}: MessageRowProps) {
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -TIMESTAMP_RAIL_WIDTH * revealProgress.value }],
  }));
  const timestampStyle = useAnimatedStyle(() => ({ opacity: revealProgress.value }));

  return (
    <View style={styles.messageLane}>
      <Animated.View style={[styles.timestampRail, timestampStyle]} pointerEvents="none">
        <ThemedText style={styles.exactTimestamp}>{exactTime(new Date(message.created_at))}</ThemedText>
      </Animated.View>
      <Animated.View
        style={[
          styles.messageRow,
          mine && styles.messageRowMine,
          message.pending && styles.pending,
          slideStyle,
        ]}
      >
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
        {message.shared ? (
          <View style={styles.sharedWrap}>
            <MessageContentPreview shared={message.shared} />
          </View>
        ) : message.shared_kind ? (
          <ThemedView style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
            <ThemedText style={mine ? styles.mineText : styles.theirsText}>
              This shared {message.shared_kind} is no longer available.
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
            <ThemedText style={mine ? styles.mineText : styles.theirsText}>
              {message.content.split(MESSAGE_URL_PATTERN).map((part, index) => (
                /^https?:\/\//i.test(part) ? (
                  <ThemedText
                    key={`${message.id}-url-${index}`}
                    accessibilityRole="link"
                    onPress={() => { tapLight(); openMessageUrl(part); }}
                    style={[mine ? styles.mineText : styles.theirsText, styles.messageLink]}
                  >
                    {part}
                  </ThemedText>
                ) : part
              ))}
            </ThemedText>
          </ThemedView>
        )}
        {!mine && otherId ? (
          <ThemedView style={styles.messageAction}>
            <ContentActions
              targetKind="message"
              targetId={message.id}
              authorId={otherId}
              authorName={otherName}
              color={mutedColor}
              onBlocked={onBlocked}
            />
          </ThemedView>
        ) : null}
      </Animated.View>
    </View>
  );
}

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
  const [canMessage, setCanMessage] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<TimelineItem>>(null);
  const revealProgress = useSharedValue(0);
  const timeline = useMemo(() => buildTimeline(messages), [messages]);

  const timestampGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-14, 14])
    .onUpdate((event) => {
      const linearProgress = Math.max(
        0,
        Math.min(1, -event.translationX / TIMESTAMP_RAIL_WIDTH),
      );
      // Resist the start of the pull, then smoothly catch up as the rail opens.
      revealProgress.value = Math.pow(linearProgress, 1.45);
    })
    .onFinalize(() => {
      revealProgress.value = withTiming(0, {
        duration: 230,
        easing: Easing.out(Easing.cubic),
      });
    });

  useEffect(() => {
    if (!otherId) return;
    setCanMessage(null);
    api<{ username: string; avatar_url?: string | null; is_demo?: boolean; can_message?: boolean }>(`/users/${otherId}`)
      .then((u) => {
        setOtherName(u.username);
        setOtherAvatar(u.avatar_url ?? null);
        setOtherIsDemo(!!u.is_demo);
        setCanMessage(u.can_message !== false);
      })
      .catch(() => setCanMessage(false));
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
    if (!content || sending || !otherId || canMessage !== true) return;
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
      if (err?.code === 'PRIVATE_DM_RESTRICTED') setCanMessage(false);
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

  const openMessageUrl = (url: string) => {
    const forumPost = url.match(/^https:\/\/(?:www\.)?forumeveryside\.com\/post\/([^/?#]+)/i);
    if (forumPost) {
      router.push(`/post/${decodeURIComponent(forumPost[1])}` as never);
      return;
    }
    const forumArticle = url.match(/^https:\/\/(?:www\.)?forumeveryside\.com\/article\/([^/?#]+)/i);
    if (forumArticle) {
      router.push(`/article/${decodeURIComponent(forumArticle[1])}` as never);
      return;
    }
    void openExternalUrl(url).catch((err) => {
      console.log('Error opening shared link:', err?.message);
    });
  };

  const openProfile = useCallback(() => {
    if (otherId) router.push(`/user/${otherId}` as never);
  }, [otherId, router]);

  const nativeHeaderTitle = useCallback(() => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${otherName} profile`}
      onPress={() => { tapLight(); openProfile(); }}
      style={({ pressed }) => [styles.headerIdentity, pressed && styles.headerIdentityPressed]}
    >
      {otherId ? (
        <AvatarVisual
          userId={otherId}
          avatarUrl={otherAvatar}
          isDemo={otherIsDemo}
          size={31}
        />
      ) : null}
      <ThemedText style={styles.headerName} numberOfLines={1}>{otherName}</ThemedText>
    </Pressable>
  ), [openProfile, otherAvatar, otherId, otherIsDemo, otherName, styles]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboard}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen
        options={{
          headerTitle: nativeHeaderTitle,
          headerTitleAlign: 'center',
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={12}
              onPress={() => { tapLight(); router.back(); }}
              style={({ pressed }) => [styles.headerBack, pressed && styles.headerIdentityPressed]}
            >
              <IconSymbol name="chevron.left" size={24} color={c.primary} />
            </Pressable>
          ),
        }}
      />
      <ThemedView style={styles.screen}>
        {Platform.OS === 'web' && otherId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${otherName} profile`}
            onPress={() => { tapLight(); openProfile(); }}
            style={({ pressed }) => [styles.webIdentity, pressed && styles.headerIdentityPressed]}
          >
            <AvatarVisual
              userId={otherId}
              avatarUrl={otherAvatar}
              isDemo={otherIsDemo}
              size={38}
            />
            <DisplayName
              username={otherName}
              isDemo={otherIsDemo}
              nameStyle={styles.webIdentityName}
              numberOfLines={1}
            />
          </Pressable>
        ) : null}
        <GestureDetector gesture={timestampGesture}>
          <View style={styles.listFrame}>
            <FlatList
              ref={listRef}
              data={timeline}
              showsVerticalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => item.kind === 'separator' ? (
                <View style={styles.groupHeader}>
                  <ThemedText style={styles.groupHeaderText}>{item.label}</ThemedText>
                </View>
              ) : (
                <MessageRow
                  message={item.message}
                  mine={item.message.sender_id === me?.id}
                  otherId={otherId}
                  otherName={otherName}
                  otherAvatar={otherAvatar}
                  otherIsDemo={otherIsDemo}
                  revealProgress={revealProgress}
                  openMessageUrl={openMessageUrl}
                  onBlocked={() => router.back()}
                  styles={styles}
                  mutedColor={c.muted}
                />
              )}
            />
          </View>
        </GestureDetector>
        {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}
        <ThemedView style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {canMessage === false ? (
            <ThemedView style={styles.privateNotice}>
              <IconSymbol name="lock.fill" size={17} color={c.primary} />
              <ThemedText style={styles.privateNoticeText}>
                This private account must follow you before you can message them.
              </ThemedText>
            </ThemedView>
          ) : (
            <AppTextInput
              value={text}
              onChangeText={setText}
              placeholder={canMessage === null ? 'Checking messaging access…' : `Message ${otherName}…`}
              multiline
              editable={!sending && canMessage === true}
              actionIcon="paperplane.fill"
              actionLabel="Send message"
              actionDisabled={sending || canMessage !== true || !text.trim()}
              onAction={send}
              containerStyle={styles.composer}
            />
          )}
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
  headerIdentity: {
    maxWidth: 230,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 7,
    borderRadius: 18,
  },
  headerIdentityPressed: { opacity: 0.58, backgroundColor: c.surfaceMuted },
  headerBack: {
    width: 38,
    height: 38,
    marginLeft: -5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
  headerName: { maxWidth: 184, color: c.text, fontSize: 16, lineHeight: 20, fontWeight: '800' },
  webIdentity: {
    minHeight: 60,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.background,
  },
  webIdentityName: { color: c.text, fontSize: 16, lineHeight: 20, fontWeight: '800' },
  listFrame: { flex: 1, overflow: 'hidden' },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  groupHeader: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  groupHeaderText: {
    color: c.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  messageLane: {
    width: '100%',
    minHeight: 40,
    marginVertical: 3,
    justifyContent: 'center',
  },
  timestampRail: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: TIMESTAMP_RAIL_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  exactTimestamp: {
    color: c.muted,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  messageRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: 'transparent',
  },
  messageRowMine: { justifyContent: 'flex-end' },
  messageAvatar: { alignSelf: 'flex-end', marginBottom: 2 },
  messageAction: { alignSelf: 'flex-end', marginBottom: 2, backgroundColor: 'transparent' },
  pending: { opacity: 0.6 },
  sharedWrap: {
    width: 270,
    maxWidth: '76%',
    backgroundColor: 'transparent',
  },
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
  messageLink: { textDecorationLine: 'underline', fontWeight: '700' },
  error: { color: c.danger, textAlign: 'center', paddingBottom: 4, fontSize: 13 },
  composerWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: c.background,
  },
  composer: { width: '100%' },
  privateNotice: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    paddingHorizontal: 14,
  },
  privateNoticeText: { flex: 1, color: c.subtle, fontSize: 13, lineHeight: 18, fontWeight: '600' },
});
