import Article, { ArticleType } from '@/components/articleComponent';
import CommentList from '@/components/commentComponent';
import AppTextInput from '@/components/app-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import WebPageFrame from '@/components/web-page-frame';
import { type Palette } from '@/constants/theme';
import { useInteractionController } from '@/context/interactionContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { queueFeedEvent, type FeedMode } from '@/lib/feed-events';
import { tapMedium } from '@/lib/haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

export default function ArticleScreen() {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id, feed_session, feed_algorithm, feed_mode, feed_position } = useLocalSearchParams();
  const articleId = useMemo(() => (Array.isArray(id) ? id[0] : id) as string | undefined, [id]);
  const interactions = useInteractionController();

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
      interactions.update('article', articleId, (current) => ({
        commentCount: (current.commentCount ?? article?.commentcount ?? 0) + 1,
      }), { commentCount: article?.commentcount ?? 0 });
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
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <WebPageFrame maxWidth={760}>
          <Article
            article={article}
            variant="detail"
          />

          {/* Read the original at the source */}
          <ThemedView style={styles.container}>
          {/* Publisher-policy eligibility is enforced again by the API. */}
          {article.ai_context_allowed && (
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
          )}

          <Pressable
            onPress={async () => {
              const sessionId = Array.isArray(feed_session) ? feed_session[0] : feed_session;
              const algorithmVersion = Array.isArray(feed_algorithm) ? feed_algorithm[0] : feed_algorithm;
              const mode = Array.isArray(feed_mode) ? feed_mode[0] : feed_mode;
              if (
                sessionId && algorithmVersion &&
                (mode === 'for_you' || mode === 'random' || mode === 'against')
              ) {
                queueFeedEvent({
                  sessionId,
                  algorithmVersion,
                  feedMode: mode as FeedMode,
                  position: Number(Array.isArray(feed_position) ? feed_position[0] : feed_position) || 0,
                  itemType: 'article',
                  itemId: article.id,
                  eventType: 'outbound_open',
                });
              }
              try { await WebBrowser.openBrowserAsync(article.url); } catch {}
            }}
            style={({ pressed }) => [styles.readButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <ThemedText
              style={styles.readButtonText}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.86}
            >
              Read on {article.source}
            </ThemedText>
            <IconSymbol name="square.and.arrow.up" size={18} color={c.primary} />
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

            <CommentList articleId={articleId} refreshKey={refreshKey} />
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
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: c.accentFaint,
    backgroundColor: c.card,
  },
  readButtonText: {
    flexShrink: 1,
    textAlign: 'center',
    lineHeight: 19,
    fontWeight: '700',
    color: c.primary,
  },
  composer: {
    marginBottom: 12,
  },
  composerError: {
    color: c.danger,
    marginBottom: 8,
  },
});
