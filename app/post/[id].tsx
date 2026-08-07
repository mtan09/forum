import CommentList from '@/components/commentComponent';
import AppTextInput from '@/components/app-text-input';
import Post from '@/components/postComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import WebPageFrame from '@/components/web-page-frame';
import { type Palette } from '@/constants/theme';
import { useInteractionController } from '@/context/interactionContext';
import { usePosts } from '@/context/postContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { tapMedium } from '@/lib/haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

export default function PostScreen() {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams();
  const { posts, refresh, ensurePost } = usePosts();
  const interactions = useInteractionController();

  const post = posts.find(p => p.id === id);

  // With a paged feed, posts opened from search/profile/deep links may not
  // be loaded yet — pull this one in on demand.
  useEffect(() => {
    if (!post && typeof id === 'string') ensurePost(id);
  }, [post, id, ensurePost]);

  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!post) return null;

  const handleSubmitComment = async () => {
    const content = commentText.trim();
    if (!content || submitting) return;
    setCommentError(null);
    try {
      tapMedium();
      setSubmitting(true);
      await api('/comments', { body: { post_id: post.id, content } });
      interactions.update('post', post.id, (current) => ({
        commentCount: (current.commentCount ?? post.commentCount ?? 0) + 1,
      }), { commentCount: post.commentCount ?? 0 });
      setCommentText('');
      Keyboard.dismiss();
      setRefreshKey((k) => k + 1); // reload the comment list
      void refresh(); // reconcile the optimistic count with the server
    } catch (e: any) {
      setCommentError(e?.message ?? 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <WebPageFrame>
          <Post
            post={post}
            variant="detail"
            onDeleted={() => router.back()}
          />
          <ThemedView style={styles.container}>
          {/* Hand this post to forumAI as the chat subject */}
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(tabs)/ai',
                params: {
                  subjectKind: 'post',
                  subjectId: post.id,
                  subjectTitle: (post.text ?? '').slice(0, 80) || 'Post',
                  subjectTs: String(Date.now()),
                },
              })
            }
            style={({ pressed }) => [styles.aiButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <IconSymbol name="sparkles" size={18} color={c.onPrimary} />
            <ThemedText style={styles.aiButtonText}>Ask forumAI about this post</ThemedText>
          </Pressable>

          {/* Comments */}
          <ThemedView style={{ marginTop: 8 }}>
            <ThemedText type="defaultSemiBold" style={{ fontWeight: '800', marginBottom: 8 }}>Comments</ThemedText>

            {/* Composer */}
            <AppTextInput
              placeholder="Add a comment…"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={1}
              editable={!submitting}
              actionIcon="paperplane.fill"
              actionLabel="Post comment"
              actionDisabled={submitting || !commentText.trim()}
              onAction={handleSubmitComment}
              containerStyle={styles.composer}
            />
            {!!commentError && (
              <ThemedText style={styles.composerError}>{commentError}</ThemedText>
            )}

            <CommentList postId={post.id} refreshKey={refreshKey} />
          </ThemedView>
          </ThemedView>
        </WebPageFrame>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  scroll: {
    // The shell paints one background for the whole page; c.surface here showed
    // as a second colour below the comments once the content ran short.
    backgroundColor: c.background,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'web' ? 32 : 0,
  },
  container: {
    padding: Platform.OS === 'web' ? 20 : 16,
    gap: 12,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: c.primary,
  },
  aiButtonText: {
    fontWeight: '700',
    color: c.onPrimary,
  },
  composer: {
    marginBottom: 12,
  },
  composerError: {
    color: c.danger,
    marginBottom: 8,
  },
});
