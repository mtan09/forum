import AvatarVisual from '@/components/avatar-visual';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { notifySuccess, tapLight, tapMedium } from '@/lib/haptics';
import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ShareRecipient = {
  id: string;
  username: string;
  avatar_url?: string | null;
  is_demo?: boolean;
  can_message?: boolean;
};

type Conversation = {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  is_demo?: boolean;
  can_message?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  kind: 'post' | 'article';
  contentId: string;
  url: string;
  message: string;
  title: string;
};

const nativeClipboard = NativeModules.Clipboard as
  | { setString: (value: string) => void }
  | undefined;

function mergeRecipients(
  conversations: Conversation[],
  following: ShareRecipient[]
): ShareRecipient[] {
  const recipients = new Map<string, ShareRecipient>();
  conversations.forEach((row) => {
    recipients.set(row.user_id, {
      id: row.user_id,
      username: row.username,
      avatar_url: row.avatar_url,
      is_demo: row.is_demo,
      can_message: row.can_message,
    });
  });
  following.forEach((row) => {
    if (!recipients.has(row.id)) recipients.set(row.id, row);
  });
  return Array.from(recipients.values())
    .filter((recipient) => recipient.can_message !== false)
    .slice(0, 16);
}

export default function ContentShareSheet({
  visible,
  onClose,
  kind,
  contentId,
  url,
  message,
  title,
}: Props) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [recipients, setRecipients] = useState<ShareRecipient[] | null>(null);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  // Keeping the URL on its own final line lets Messages recognize it as a
  // shareable link instead of treating the entire payload as one text blob.
  const shareText = `${message.trim()}\n\n${url}`;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setRecipients(null);
    setSendingIds(new Set());
    setSentIds(new Set());
    setCopied(false);

    const load = async () => {
      const requests: [Promise<Conversation[]>, Promise<ShareRecipient[]>] = [
        api<Conversation[]>('/messages'),
        user?.id
          ? api<ShareRecipient[]>(`/users/${user.id}/following`)
          : Promise.resolve([]),
      ];
      const [conversationsResult, followingResult] = await Promise.allSettled(requests);
      if (cancelled) return;
      const conversations = conversationsResult.status === 'fulfilled' ? conversationsResult.value : [];
      const following = followingResult.status === 'fulfilled' ? followingResult.value : [];
      setRecipients(mergeRecipients(conversations, following));
    };

    load().catch((error) => {
      console.error('[share] Could not load recipients', error);
      if (!cancelled) setRecipients([]);
    });
    return () => { cancelled = true; };
  }, [user?.id, visible]);

  const copyLink = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        if (!nativeClipboard) throw new Error('Clipboard is unavailable');
        nativeClipboard.setString(url);
      }
      setCopied(true);
      notifySuccess();
      AccessibilityInfo.announceForAccessibility('Link copied');
    } catch (error) {
      console.error('[share] Could not copy link', error);
      Alert.alert('Could not copy link', 'Please try again.');
    }
  };

  const sendInsideForum = async (recipient: ShareRecipient) => {
    if (sendingIds.has(recipient.id) || sentIds.has(recipient.id)) return;
    tapMedium();
    setSendingIds((current) => new Set(current).add(recipient.id));
    try {
      await api(`/messages/with/${recipient.id}`, {
        body: { shared_kind: kind, shared_id: contentId },
      });
      setSentIds((current) => new Set(current).add(recipient.id));
      AccessibilityInfo.announceForAccessibility(`Sent to ${recipient.username}`);
    } catch (error: any) {
      Alert.alert('Could not send', error?.message ?? `The ${kind} was not sent.`);
    } finally {
      setSendingIds((current) => {
        const next = new Set(current);
        next.delete(recipient.id);
        return next;
      });
    }
  };

  const openMessages = async () => {
    try {
      // Load the native module only when requested. This lets an older local
      // development binary keep running until it is rebuilt with ExpoSMS.
      const SMS = await import('expo-sms');
      const available = await SMS.isAvailableAsync();
      if (!available) {
        Alert.alert(
          'Messages is unavailable',
          Platform.OS === 'ios'
            ? 'The native Messages composer is not available in the iOS Simulator. Try it on an iPhone or choose More.'
            : 'Choose More to share with another app.'
        );
        return;
      }

      // Dismiss forum's sheet before presenting Apple's composer. A brief
      // transition avoids asking iOS to present two modal controllers at once.
      onClose();
      setTimeout(() => {
        void SMS.sendSMSAsync([], shareText).catch((error) => {
          console.error('[share] Could not open Messages composer', error);
          Alert.alert('Could not open Messages', 'Choose More to share with another app.');
        });
      }, 250);
    } catch (error) {
      console.error('[share] Could not check Messages availability', error);
      Alert.alert('Could not open Messages', 'Choose More to share with another app.');
    }
  };

  const openWhatsApp = async () => {
    const destination = `whatsapp://send?text=${encodeURIComponent(shareText)}`;
    try {
      if (!(await Linking.canOpenURL(destination))) {
        Alert.alert('WhatsApp is not installed', 'Choose More to share with another app.');
        return;
      }
      onClose();
      await Linking.openURL(destination);
    } catch (error) {
      console.error('[share] Could not open WhatsApp', error);
      Alert.alert('Could not open app', 'Choose More to share with another app.');
    }
  };

  const openMore = () => {
    onClose();
    requestAnimationFrame(() => {
      notifySuccess();
      Share.share({ message, url, title }).catch((error) => {
        console.error('[share] Could not open native share sheet', error);
      });
    });
  };

  const actions = [
    {
      key: 'messages',
      label: 'Messages',
      icon: 'message.fill' as const,
      onPress: () => { tapLight(); void openMessages(); },
    },
    {
      key: 'copy',
      label: copied ? 'Copied' : 'Copy Link',
      icon: copied ? 'checkmark.circle.fill' as const : 'link' as const,
      onPress: () => { tapLight(); void copyLink(); },
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: 'phone.fill' as const,
      onPress: () => { tapLight(); void openWhatsApp(); },
    },
    {
      key: 'more',
      label: 'More',
      icon: 'ellipsis' as const,
      onPress: () => { tapLight(); openMore(); },
    },
  ].filter((action) => kind !== 'article' || action.key !== 'whatsapp');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
          onPress={(event) => event.stopPropagation()}
        >
          <ThemedView style={styles.handle} />
          <View style={styles.header}>
            <ThemedText style={styles.title}>Share {kind}</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close share options"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <IconSymbol name="xmark" size={18} color={c.text} />
            </Pressable>
          </View>

          <ThemedText style={styles.sectionLabel}>Send on forum</ThemedText>
          {recipients === null ? (
            <View style={styles.loadingRecipients}>
              <ActivityIndicator color={c.primary} />
            </View>
          ) : recipients.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recipients}
            >
              {recipients.map((recipient) => {
                const sending = sendingIds.has(recipient.id);
                const sent = sentIds.has(recipient.id);
                return (
                  <Pressable
                    key={recipient.id}
                    accessibilityRole="button"
                    accessibilityLabel={sent ? `Sent to ${recipient.username}` : `Send to ${recipient.username}`}
                    disabled={sending || sent}
                    onPress={() => { void sendInsideForum(recipient); }}
                    style={({ pressed }) => [styles.recipient, pressed && styles.pressed]}
                  >
                    <View>
                      <AvatarVisual
                        userId={recipient.id}
                        avatarUrl={recipient.avatar_url}
                        isDemo={recipient.is_demo}
                        size={58}
                      />
                      {(sending || sent) && (
                        <View style={styles.recipientStatus}>
                          {sending
                            ? <ActivityIndicator size="small" color={c.onPrimary} />
                            : <IconSymbol name="checkmark.circle.fill" size={19} color={c.onPrimary} />}
                        </View>
                      )}
                    </View>
                    <ThemedText style={[styles.recipientName, sent && styles.sentText]} numberOfLines={1}>
                      {sent ? 'Sent' : recipient.username}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <ThemedText style={styles.emptyRecipients}>
              Recent conversations and people you follow will appear here.
            </ThemedText>
          )}

          <View style={styles.divider} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actions}
          >
            {actions.map((action) => (
              <Pressable
                key={action.key}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={action.onPress}
                style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              >
                <View
                  style={[
                    styles.actionIcon,
                    action.key === 'messages' && styles.messagesIcon,
                    action.key === 'whatsapp' && styles.whatsappIcon,
                  ]}
                >
                  <IconSymbol
                    name={action.icon}
                    size={24}
                    color={
                      action.key === 'messages' || action.key === 'whatsapp'
                        ? c.onPrimary
                        : c.primary
                    }
                  />
                </View>
                <ThemedText style={styles.actionLabel} numberOfLines={1}>{action.label}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    padding: Platform.OS === 'web' ? 24 : 0,
    backgroundColor: c.scrim,
  },
  sheet: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 560 : undefined,
    maxHeight: '72%',
    paddingTop: 10,
    paddingHorizontal: 18,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderRadius: Platform.OS === 'web' ? 26 : 0,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: c.cardBorder,
    backgroundColor: c.overlayCard,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginBottom: 10,
    borderRadius: 2,
    backgroundColor: c.faint,
  },
  header: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '900' },
  close: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: c.surfaceMuted,
  },
  sectionLabel: {
    marginTop: 12,
    marginBottom: 10,
    color: c.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  loadingRecipients: { height: 88, alignItems: 'center', justifyContent: 'center' },
  recipients: { gap: 14, paddingRight: 8 },
  recipient: { width: 64, alignItems: 'center', gap: 6 },
  recipientName: { width: 68, color: c.subtle, fontSize: 11, lineHeight: 14, textAlign: 'center' },
  sentText: { color: c.primary, fontWeight: '800' },
  recipientStatus: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.overlayCard,
    backgroundColor: c.primary,
  },
  emptyRecipients: { minHeight: 74, color: c.muted, fontSize: 13, lineHeight: 18, paddingTop: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 18, marginBottom: 16, backgroundColor: c.border },
  actions: { flexGrow: 1, justifyContent: 'space-between', gap: 14 },
  action: { minWidth: 68, alignItems: 'center', gap: 7 },
  actionIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
    backgroundColor: c.accentSoftBg,
  },
  messagesIcon: { backgroundColor: '#34C759' },
  whatsappIcon: { backgroundColor: '#25D366' },
  actionLabel: { maxWidth: 78, color: c.subtle, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  pressed: { opacity: 0.55 },
});
