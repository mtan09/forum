import CommentList from '@/components/commentComponent';
import Post from '@/components/postComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import WebPageFrame from '@/components/web-page-frame';
import { type Palette } from '@/constants/theme';
import { usePosts } from '@/context/postContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { tapMedium } from '@/lib/haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

export default function PostScreen() {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams();
  const { posts, refresh, ensurePost } = usePosts();

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
      setCommentText('');
      Keyboard.dismiss();
      setRefreshKey((k) => k + 1); // reload the comment list
      refresh(); // pick up the new comment count on the post
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
        <WebPageFrame maxWidth={760}>
          <Post
            post={post}
            variant="detail"
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
            <ThemedView style={styles.composer}>
              <TextInput
                placeholder="Add a comment..."
                placeholderTextColor={c.muted}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                numberOfLines={1}
                style={styles.composerInput}
                editable={!submitting}
              />
              <Pressable
                onPress={handleSubmitComment}
                disabled={submitting || !commentText.trim()}
              >
                <IconSymbol
                  name="arrow.up.circle.fill"
                  size={28}
                  color={commentText.trim() && !submitting ? c.primary : c.primaryDisabled}
                />
              </Pressable>
            </ThemedView>
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
    backgroundColor: Platform.OS === 'web' ? c.surface : c.background,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderColor: c.accentFaint,
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  composerInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    minHeight: 28,
    maxHeight: 96,
    paddingTop: 4,
    paddingBottom: 4,
    textAlignVertical: 'center',
    color: c.text,
  },
  composerError: {
    color: c.danger,
    marginBottom: 8,
  },
});
