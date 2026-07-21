import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet } from 'react-native';

// A small "•••" overflow menu for user-generated content. Report works on
// any target; Block appears only when an author is known and it isn't the
// caller. Both are the launch-blocking moderation primitives every UGC app
// needs — backed by POST /reports and POST/DELETE /users/:id/block.
export type ReportKind = 'post' | 'article' | 'comment' | 'user';

type ReportReason = 'spam' | 'harassment' | 'misinformation' | 'hate' | 'other';

const REASONS: { key: ReportReason; label: string }[] = [
  { key: 'spam', label: 'Spam or misleading' },
  { key: 'harassment', label: 'Harassment or bullying' },
  { key: 'misinformation', label: 'False information' },
  { key: 'hate', label: 'Hate speech' },
  { key: 'other', label: 'Something else' },
];

type Props = {
  targetKind: ReportKind;
  targetId: string;
  authorId?: string;
  authorName?: string;
  color?: string;
  onBlocked?: () => void;
};

export default function ContentActions({
  targetKind,
  targetId,
  authorId,
  authorName,
  color,
  onBlocked,
}: Props) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const canBlock = !!authorId && authorId !== user?.id;

  const submitReport = async (reason: ReportReason) => {
    setReasonOpen(false);
    try {
      await api('/reports', { body: { target_kind: targetKind, target_id: targetId, reason } });
      Alert.alert('Thanks for the report', 'Our team will review this shortly.');
    } catch (err: any) {
      Alert.alert('Could not send report', err?.message ?? 'Please try again.');
    }
  };

  const confirmBlock = () => {
    setMenuOpen(false);
    Alert.alert(
      `Block ${authorName ?? 'this user'}?`,
      `You won't see posts or comments from ${authorName ?? 'them'} anywhere on the forum.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await api(`/users/${authorId}/block`, { body: {} });
              onBlocked?.();
            } catch (err: any) {
              Alert.alert('Could not block', err?.message ?? 'Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Pressable
        onPress={() => setMenuOpen(true)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="More options"
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
      >
        <IconSymbol name="ellipsis" size={20} color={color ?? c.muted} />
      </Pressable>

      {/* Overflow sheet */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <ThemedView style={styles.handle} />
            <Pressable
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
              onPress={() => { setMenuOpen(false); setReasonOpen(true); }}
            >
              <IconSymbol name="flag" size={20} color={c.red} />
              <ThemedText style={styles.actionText}>Report</ThemedText>
            </Pressable>
            {canBlock && (
              <Pressable
                style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
                onPress={confirmBlock}
              >
                <IconSymbol name="hand.raised" size={20} color={c.red} />
                <ThemedText style={styles.actionText}>Block {authorName ?? 'user'}</ThemedText>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.action, styles.cancel, pressed && styles.actionPressed]}
              onPress={() => setMenuOpen(false)}
            >
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Reason picker */}
      <Modal visible={reasonOpen} transparent animationType="slide" onRequestClose={() => setReasonOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setReasonOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <ThemedView style={styles.handle} />
            <ThemedText type="defaultSemiBold" style={styles.reasonTitle}>Why are you reporting this?</ThemedText>
            {REASONS.map((r) => (
              <Pressable
                key={r.key}
                style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
                onPress={() => submitReport(r.key)}
              >
                <ThemedText style={styles.actionText}>{r.label}</ThemedText>
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [styles.action, styles.cancel, pressed && styles.actionPressed]}
              onPress={() => setReasonOpen(false)}
            >
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: c.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.overlayCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.faint,
    marginBottom: 12,
  },
  reasonTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  actionPressed: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancel: {
    borderBottomWidth: 0,
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '800',
    color: c.muted,
  },
});
