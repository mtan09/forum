import Article, { ArticleType } from '@/components/articleComponent';
import CommentList from '@/components/commentComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { tapMedium } from '@/lib/haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

export default function ArticleScreen() {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams();
  const articleId = useMemo(() => (Array.isArray(id) ? id[0] : id) as string | undefined, [id]);

  const [article, setArticle] = useState<ArticleType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!articleId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<ArticleType>(`/articles/${articleId}`);
        setArticle(data);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load article');
        setArticle(null);
      }
      setLoading(false);
    };
    load();
  }, [articleId]);

  const handleSubmitComment = async () => {
    const content = commentText.trim();
    if (!content || submitting || !articleId) return;
    setCommentError(null);
    try {
      tapMedium();
      setSubmitting(true);
      await api('/comments', { body: { article_id: articleId, content } });
      setCommentText('');
      Keyboard.dismiss();
      setRefreshKey((k) => k + 1); // reload the comment list
    } catch (e: any) {
      setCommentError(e?.message ?? 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!articleId) {
    return (
      <ThemedView style={{ padding: 16 }}>
        <ThemedText>Missing article id.</ThemedText>
      </ThemedView>
    );
  }

  if (loading) {
    return (
      <ThemedView style={{ padding: 16 }}>
        <ThemedText>Loading article…</ThemedText>
      </ThemedView>
    );
  }

  if (error || !article) {
    return (
      <ThemedView style={{ padding: 16 }}>
        <ThemedText>Error: {error ?? 'Article not found.'}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={100}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <Article
          article={article}
        />

        {/* Read the original at the source */}
        <ThemedView style={styles.container}>
          {/* Hand this article to forumAI as the chat subject */}
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(tabs)/ai',
                params: {
                  subjectKind: 'article',
                  subjectId: article.id,
                  subjectTitle: article.title?.slice(0, 80) ?? 'Article',
                  subjectTs: String(Date.now()),
                },
              })
            }
            style={({ pressed }) => [styles.aiButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <IconSymbol name="sparkles" size={18} color={c.onPrimary} />
            <ThemedText style={styles.aiButtonText}>Ask forumAI about this article</ThemedText>
          </Pressable>

          <Pressable
            onPress={async () => {
              try { await WebBrowser.openBrowserAsync(article.url); } catch {}
            }}
            style={({ pressed }) => [styles.readButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <ThemedText style={styles.readButtonText}>Read full article at {article.source}</ThemedText>
            <IconSymbol name="square.and.arrow.up" size={18} color={c.primary} />
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

            <CommentList articleId={articleId} refreshKey={refreshKey} />
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  container: {
    padding: 16,
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
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: c.accentFaint,
    backgroundColor: c.card,
  },
  readButtonText: {
    fontWeight: '700',
    color: c.primary,
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
    maxHeight: 96,
    paddingTop: 0,
    paddingBottom: 0,
    color: c.text,
  },
  composerError: {
    color: c.danger,
    marginBottom: 8,
  },
});
