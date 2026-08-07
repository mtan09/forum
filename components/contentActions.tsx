import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import type { RecommendationContext } from '@/lib/feed-events';
import { useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { notifyWarning, tapLight } from '@/lib/haptics';

// A small "•••" overflow menu for user-generated content. Report works on
// any target; Block appears only when an author is known and it isn't the
// caller. Both are the launch-blocking moderation primitives every UGC app
// needs — backed by POST /reports and POST/DELETE /users/:id/block.
export type ReportKind = 'post' | 'article' | 'comment' | 'user' | 'message';

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
  onNotInterested?: () => void;
  onDeleted?: (result: DeleteResult) => void;
  onDismiss?: () => void;
  recommendationContext?: RecommendationContext;
  displayMode?: 'menu' | 'inline';
};

export type DeleteResult = {
  deleted: true;
  id: string;
  removed_comment_count?: number;
  post_id?: string | null;
  article_id?: string | null;
  debate_id?: string | null;
  parent_comment_id?: string | null;
};

export default function ContentActions({
  targetKind,
  targetId,
  authorId,
  authorName,
  color,
  onBlocked,
  onNotInterested,
  onDeleted,
  onDismiss,
  recommendationContext,
  displayMode = 'menu',
}: Props) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canBlock = !!authorId && authorId !== user?.id;
  const canHideRecommendation = targetKind === 'post' || targetKind === 'article';
  const canDelete = !!authorId && authorId === user?.id
    && (targetKind === 'post' || targetKind === 'comment');

  const dismissMenu = () => {
    setMenuOpen(false);
    if (displayMode === 'inline') onDismiss?.();
  };

  const markNotInterested = async () => {
    setMenuOpen(false);
    try {
      await api('/feed/not-interested', {
        body: {
          item_type: targetKind,
          item_id: targetId,
          session_id: recommendationContext?.sessionId,
          feed_mode: recommendationContext?.feedMode,
        },
      });
      onNotInterested?.();
      onDismiss?.();
    } catch (err: any) {
      Alert.alert('Could not update your feed', err?.message ?? 'Please try again.');
    }
  };

  const submitReport = async (reason: ReportReason) => {
    setReasonOpen(false);
    try {
      await api('/reports', { body: { target_kind: targetKind, target_id: targetId, reason } });
      Alert.alert('Thanks for the report', 'Our team will review this shortly.');
      onDismiss?.();
    } catch (err: any) {
      Alert.alert('Could not send report', err?.message ?? 'Please try again.');
    }
  };

  const confirmBlock = () => {
    setMenuOpen(false);
    Alert.alert(
      `Block ${authorName ?? 'this user'}?`,
      `You won't see or receive content from ${authorName ?? 'them'} anywhere on forum.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await api(`/users/${authorId}/block`, { body: {} });
              onBlocked?.();
              onDismiss?.();
            } catch (err: any) {
              Alert.alert('Could not block', err?.message ?? 'Please try again.');
            }
          },
        },
      ]
    );
  };

  const confirmDelete = () => {
    setMenuOpen(false);
    const isPost = targetKind === 'post';
    Alert.alert(
      `Delete ${isPost ? 'post' : 'comment'}?`,
      isPost
        ? 'This permanently deletes the post and all of its comments.'
        : 'This permanently deletes the comment and any replies to it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (deleting) return;
            setDeleting(true);
            try {
              const result = await api<DeleteResult>(`/${targetKind}s/${targetId}`, {
                method: 'DELETE',
              });
              onDeleted?.(result);
              onDismiss?.();
            } catch (err: any) {
              Alert.alert(
                `Could not delete ${isPost ? 'post' : 'comment'}`,
                err?.message ?? 'Please try again.',
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const actionRows = (
    <>
      {canHideRecommendation && (
        <Pressable
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          onPress={() => { tapLight(); markNotInterested(); }}
        >
          <IconSymbol name="eye.slash" size={20} color={c.text} />
          <ThemedText style={styles.actionText}>Not interested</ThemedText>
        </Pressable>
      )}
      <Pressable
        style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        onPress={() => { notifyWarning(); setMenuOpen(false); setReasonOpen(true); }}
      >
        <IconSymbol name="flag" size={20} color={c.red} />
        <ThemedText style={styles.actionText}>Report</ThemedText>
      </Pressable>
      {canBlock && (
        <Pressable
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          onPress={() => { notifyWarning(); confirmBlock(); }}
        >
          <IconSymbol name="hand.raised" size={20} color={c.red} />
          <ThemedText style={styles.actionText}>Block {authorName ?? 'user'}</ThemedText>
        </Pressable>
      )}
      {canDelete && (
        <Pressable
          disabled={deleting}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          onPress={() => { notifyWarning(); confirmDelete(); }}
        >
          <IconSymbol name="trash" size={20} color={c.danger} />
          <ThemedText style={[styles.actionText, { color: c.danger }]}>Delete</ThemedText>
        </Pressable>
      )}
    </>
  );

  return (
    <>
      {displayMode === 'inline' ? (
        <View style={styles.inlinePanel}>{actionRows}</View>
      ) : (
        <Pressable
          onPress={() => { tapLight(); setMenuOpen(true); }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="More options"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <IconSymbol name="ellipsis" size={20} color={color ?? c.muted} />
        </Pressable>
      )}

      {/* Overflow sheet */}
      {menuOpen && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <ThemedView style={styles.handle} />
              {actionRows}
              <Pressable
                style={({ pressed }) => [styles.action, styles.cancel, pressed && styles.actionPressed]}
                onPress={() => { tapLight(); dismissMenu(); }}
              >
                <ThemedText style={styles.cancelText}>Cancel</ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Reason picker */}
      {reasonOpen && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setReasonOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setReasonOpen(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <ThemedView style={styles.handle} />
              <ThemedText type="defaultSemiBold" style={styles.reasonTitle}>Why are you reporting this?</ThemedText>
              {REASONS.map((r) => (
                <Pressable
                  key={r.key}
                  style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
                  onPress={() => { notifyWarning(); submitReport(r.key); }}
                >
                  <ThemedText style={styles.actionText}>{r.label}</ThemedText>
                </Pressable>
              ))}
              <Pressable
                style={({ pressed }) => [styles.action, styles.cancel, pressed && styles.actionPressed]}
                onPress={() => { tapLight(); setReasonOpen(false); }}
              >
                <ThemedText style={styles.cancelText}>Cancel</ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: c.scrim,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    padding: Platform.OS === 'web' ? 24 : 0,
  },
  sheet: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
    backgroundColor: c.overlayCard,
    borderRadius: Platform.OS === 'web' ? 22 : 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: c.cardBorder,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  inlinePanel: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.cardBorder,
    paddingHorizontal: 16,
    backgroundColor: c.overlayCard,
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
