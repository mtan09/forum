import ScalableImage from '@/components/scalable-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { getArticleImageCachePolicy, getDisplayableArticleMedia } from '@/lib/article-media';
import { getPerspectiveToneForPosition } from '@/lib/perspective-colors';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import ArticleActions from './article-actions';
import ScorerReceipts from './scorerReceipts';

export type ArticleType = {
  id: string;
  url: string;
  title: string;
  source: string;
  description?: string | null;
  media: string | null;
  media_thumbnail_url?: string | null;
  media_large_url?: string | null;
  media_width?: number | null;
  media_height?: number | null;
  media_status?: 'none' | 'pending' | 'ready' | 'failed';
  text_mode?: 'headline_only' | 'feed_description' | 'full_text';
  image_mode?: 'none' | 'remote_no_cache' | 'managed_thumbnail' | 'licensed_cache';
  ai_mode?: 'metadata_only' | 'structured_evidence' | 'permitted_text' | 'denied';
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

export type UserType = {
  id: string;
  username: string;
  avatar?: string;
}

// Restore the outlet favicon treatment from the pre-conservative UI. It is a
// source identifier, not story art, and falls back cleanly to initials.
function logoUrl(articleUrl: string): string | null {
  try {
    const host = new URL(articleUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch {
    return null;
  }
}

type Props = {
  article: ArticleType;
  variant?: 'feed' | 'detail';
}

function Article({ article, variant = 'feed' }: Props) {

  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const contentWidth = measuredWidth || Math.max(1, Math.min(windowWidth - 32, 700));
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
  const detail = variant === 'detail';
  const preferredMedia = detail
    ? article.media_large_url ?? article.media
    : article.media_thumbnail_url ?? article.media;
  const media = getDisplayableArticleMedia(preferredMedia, article.url, article.image_mode);
  const imageCachePolicy = getArticleImageCachePolicy(article.image_mode);
  const receiptPosition = article.political_lean ?? article.source_lean ?? null;

  useEffect(() => {
    setMediaFailed(false);
  }, [media]);

  useEffect(() => {
    setLogoFailed(false);
  }, [logo]);

  return (
    <ThemedView style={[styles.post, detail && styles.postDetailWeb]}>
      <ThemedView style={[styles.postContent, detail && styles.postContentDetailWeb]}>
          <ThemedView
            style={styles.container}
            onLayout={(event) => {
              const next = Math.round(event.nativeEvent.layout.width);
              if (next > 0 && next !== measuredWidth) setMeasuredWidth(next);
            }}
          >
          <ThemedView style={styles.header}>
            {/* Outlet mark opens the source's detail page. */}
            <Pressable
              onPress={() => router.push(`/source/${encodeURIComponent(article.source)}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
            >
              {logo && !logoFailed ? (
                <Image
                  source={{ uri: logo }}
                  style={styles.logo}
                  onError={() => setLogoFailed(true)}
                  cachePolicy="memory-disk"
                  recyclingKey={logo}
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
            {media && !mediaFailed && Platform.OS === 'web' ? (
              <Image
                source={{ uri: media }}
                style={[styles.webMedia, { height: detail ? Math.min(contentWidth * 0.62, 420) : contentWidth * 9 / 16 }]}
                contentFit={detail ? 'contain' : 'cover'}
                cachePolicy={imageCachePolicy}
                onError={() => setMediaFailed(true)}
              />
            ) : media && !mediaFailed ? (
              <ScalableImage
                source={{uri: media}}
                type='width'
                dimension={contentWidth}
                style={styles.media}
                cachePolicy={imageCachePolicy}
                onError={() => setMediaFailed(true)}
              />
            ) : (
              <LinearGradient
                colors={[c.card, c.accentSoftBg]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.storyArt}
              >
                <ThemedView style={styles.storyArtMark}>
                  <IconSymbol name="newspaper.fill" size={22} color={c.primary} />
                </ThemedView>
                <ThemedView style={styles.storyArtCopy}>
                  <ThemedText style={styles.storyArtEyebrow}>NEWS LINK</ThemedText>
                  <ThemedText style={styles.storyArtSource} numberOfLines={1}>
                    {article.source}
                  </ThemedText>
                </ThemedView>
              </LinearGradient>
            )}
            {media && mediaFailed && (
              <ThemedView style={styles.mediaFallback}>
                <IconSymbol name="photo" size={24} color={c.muted} />
                <ThemedText style={styles.mediaFallbackText}>Image unavailable</ThemedText>
              </ThemedView>
            )}

          </ThemedView>
        </ThemedView>
        {receiptPosition != null && receiptsOpen && (
          <ScorerReceipts
            visible
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

export default memo(Article);

const makeStyles = (c: Palette) => StyleSheet.create({
  container: {
    gap: 8,
    flexDirection: 'column',
  },
  post: {
    paddingHorizontal: Platform.OS === 'web' ? 12 : 16,
  },
  postContent: {
    paddingVertical: 16,
    borderColor: c.border,
    borderBottomWidth: Platform.OS === 'web' ? 0 : 1,
    ...(Platform.OS === 'web' ? {
      borderWidth: 1,
      borderRadius: 18,
      backgroundColor: c.background,
      paddingHorizontal: 16,
      marginBottom: 12,
    } : {}),
  },
  postDetailWeb: {
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
  },
  postContentDetailWeb: {
    ...(Platform.OS === 'web'
      ? {
          borderWidth: 0,
          borderBottomWidth: 1,
          borderRadius: 0,
          paddingHorizontal: 20,
          marginBottom: 0,
        }
      : {}),
  },
  logoFallback: {
    width: 50,
    aspectRatio: 1,
    borderRadius: 25,
    backgroundColor: c.accentFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 50,
    aspectRatio: 1,
    borderRadius: 25,
  },
  logoInitial: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
    color: c.onAccentFaint,
  },
  content: {
    width: '100%',
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
  webMedia: {
    width: '100%',
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: c.surfaceMuted,
  },
  mediaFallback: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: c.inputBg,
    display: Platform.OS === 'web' ? 'none' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mediaFallbackText: {
    color: c.muted,
    fontSize: 12,
  },
  storyArt: {
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.cardBorder,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storyArtMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: c.surfaceRaised,
    borderWidth: 1,
    borderColor: c.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyArtCopy: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  storyArtEyebrow: {
    color: c.primary,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.1,
    fontWeight: '900',
  },
  storyArtSource: {
    color: c.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
});
