import ScalableImage from '@/components/scalable-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { getDisplayableArticleMedia } from '@/lib/article-media';
import { getPerspectiveToneForPosition } from '@/lib/perspective-colors';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet } from 'react-native';
import ArticleActions from './article-actions';
import ScorerReceipts from './scorerReceipts';

const screenWidth = Dimensions.get('window').width;

export type ArticleType = {
  id: string;
  url: string;
  title: string;
  source: string;
  content: string;
  media: string;
  political_lean: number | null;
  content_type?: 'news_report' | 'opinion' | 'analysis' | 'factual_report' | null;
  lean_confidence?: number | null;
  lean_signals?: string[];
  scorer_version?: string;
  source_lean?: number | null;
  general_topic_id: string;
  published_at: string;
  upvotes?: number;
  downvotes?: number;
  commentcount?: number;
  my_vote?: 'up' | 'down' | null;
  my_bookmark?: boolean;
}

// Outlet logo from the article's own domain, so it covers every source
// without storing logo URLs anywhere.
function logoUrl(articleUrl: string): string | null {
  try {
    const host = new URL(articleUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch {
    return null;
  }
}


export type UserType = {
  id: string;
  username: string;
  avatar?: string;
}

type Props = {
  article: ArticleType;
}

export default function Article({ article }: Props) {

  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const contentWidth = screenWidth - 32;
  const timeAgo = useRelativeTime(article.published_at);

  // Articles are identified by their OUTLET's published lean (a small
  // Left/Center/Right tag by the source name), not per-article spectrums.
  const sourceLean = article.source_lean ?? article.political_lean;
  const leanTag = getPerspectiveToneForPosition(sourceLean, c);

  const router = useRouter();
  const [logoFailed, setLogoFailed] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const logo = logoUrl(article.url);
  const media = getDisplayableArticleMedia(article.media, article.url);
  const receiptPosition = article.political_lean ?? article.source_lean ?? null;

  useEffect(() => {
    setMediaFailed(false);
  }, [media]);

  return (
    <ThemedView style={styles.post}>
      <ThemedView style={styles.postContent}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            {/* Outlet logo opens the source's detail page */}
            <Pressable
              onPress={() => router.push(`/source/${encodeURIComponent(article.source)}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
            >
              {logo && !logoFailed ? (
                <Image
                  source={{ uri: logo }}
                  style={styles.logo}
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <ThemedView style={styles.logoFallback}>
                  <ThemedText style={styles.logoInitial}>
                    {(article.source ?? '?').charAt(0).toUpperCase()}
                  </ThemedText>
                </ThemedView>
              )}
            </Pressable>
            <ThemedView style={{flex: 1}}>
              <ThemedView style={styles.sourceRow}>
                <ThemedText type="defaultSemiBold" style={{fontWeight: 800, fontSize: 18}}>{article.source}</ThemedText>
                {leanTag && (
                  <Pressable
                    onPress={() => receiptPosition != null && setReceiptsOpen(true)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <ThemedView style={[styles.leanTag, { backgroundColor: leanTag.background }]}>
                      <ThemedText style={[styles.leanTagText, { color: leanTag.color }]}>{leanTag.label}</ThemedText>
                    </ThemedView>
                  </Pressable>
                )}
              </ThemedView>
              <ThemedText style={{color: c.muted, fontSize: 14}}>{timeAgo}</ThemedText>
            </ThemedView>
          </ThemedView>
          
          <ThemedView style={styles.content}>

            {/* Post text */}
            <ThemedText style={styles.text}>{article.title}</ThemedText>

            {/* Post media (if any) */}
            {media && !mediaFailed && (
              // <ThemedView style={styles.mediaContainer}>
                <ScalableImage
                  source={{uri: media}}
                  type='width'
                  dimension={contentWidth}
                  style={styles.media}
                  onError={() => setMediaFailed(true)}
                />
              // </ThemedView>
            )}
            {media && mediaFailed && (
              <ThemedView style={styles.mediaFallback}>
                <IconSymbol name="photo" size={24} color={c.muted} />
                <ThemedText style={styles.mediaFallbackText}>Image unavailable</ThemedText>
              </ThemedView>
            )}

          </ThemedView>
        </ThemedView>
        {receiptPosition != null && (
          <ScorerReceipts
            visible={receiptsOpen}
            onClose={() => setReceiptsOpen(false)}
            position={receiptPosition}
            signals={article.lean_signals ?? []}
            kind="article"
          />
        )}

        {/* Interactions — same treatment as posts */}
        <ArticleActions article={article} />
            
        {/* Interactions (likes, comments, etc.) */}
        {/* <PostActions post={post} user={user} /> */}
      </ThemedView>
    </ThemedView>
    
  )
}

const makeStyles = (c: Palette) => StyleSheet.create({
  container: {
    gap: 8,
    flexDirection: 'column',
  },
  post: {
    paddingHorizontal: 16,
    
  },
  postContent: {
    paddingVertical: 16,
    borderColor: c.border,
    borderBottomWidth: 1,
  },
  logo: {
    width: 50,
    aspectRatio: 1,
    borderRadius: 25,
    backgroundColor: c.mediaSurface,
    borderWidth: 1,
    borderColor: c.border,
  },
  logoFallback: {
    width: 50,
    aspectRatio: 1,
    borderRadius: 25,
    backgroundColor: c.accentFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInitial: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
    color: c.onAccentFaint,
  },
  content: {
    width: screenWidth - 32,
  },
  text: {
    flexShrink: 1,
    flexWrap: 'wrap',
    marginBottom: 8,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leanTag: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  leanTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  media: {
    borderRadius: 16,
    marginBottom: 8,
  },
  mediaFallback: {
    width: screenWidth - 32,
    aspectRatio: 16 / 9,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: c.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mediaFallbackText: {
    color: c.muted,
    fontSize: 12,
  },
});
