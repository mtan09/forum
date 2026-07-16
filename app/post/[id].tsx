import CommentList from '@/components/commentComponent';
import Post from '@/components/postComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePosts } from '@/context/postContext';
import { api } from '@/lib/api';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export default function PostScreen() {
  const { id } = useLocalSearchParams();
  const { posts, refresh } = usePosts();

  const post = posts.find(p => p.id === id);

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
      <ScrollView keyboardShouldPersistTaps="handled">
        <Post
          post={post}
        />
        <ThemedView style={styles.container}>
          {/* Comments */}
          <ThemedView style={{ marginTop: 8 }}>
            <ThemedText type="defaultSemiBold" style={{ fontWeight: '800', marginBottom: 8 }}>Comments</ThemedText>

            {/* Composer */}
            <ThemedView style={styles.composer}>
              <TextInput
                placeholder="Add a comment..."
                placeholderTextColor="#8f8f8f"
                value={commentText}
                onChangeText={setCommentText}
                multiline
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
                  color={commentText.trim() && !submitting ? '#B647FF' : '#dfaeffff'}
                />
              </Pressable>
            </ThemedView>
            {!!commentError && (
              <ThemedText style={styles.composerError}>{commentError}</ThemedText>
            )}

            <CommentList postId={post.id} refreshKey={refreshKey} />
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderColor: '#E9C8FF',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  composerInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 96,
  },
  composerError: {
    color: '#b91c1c',
    marginBottom: 8,
  },
});
