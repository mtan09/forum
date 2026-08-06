import { ArticleType } from '@/components/articleComponent';
import ContentLongPress from '@/components/content-long-press';
import ImageCarousel, { type CarouselImage } from '@/components/imageCarousel';
import Spectrum from '@/components/spectrum';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { getArticleImageCachePolicy, getDisplayableArticleMedia } from '@/lib/article-media';
import { getPerspectiveTone, type PerspectiveName } from '@/lib/perspective-colors';
import { PerspectiveTag } from '@/components/perspectiveTag';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

const MAX_IMAGES = 6;
const MAX_ARTICLES = 12;
const MAX_PERSPECTIVE_CHARS = 180;
// Keep the computed field and Spectrum implementation available, but do not
// present it as public opinion until the product has a representative sample.
const SHOW_PUBLIC_OPINION = false;

type Summary = {
  id: string;
  title: string;
  long_summary: string;
  keywords: string[];
  volume: number;
  public_position: number | null;
}

// The generated long_summary contains one attributed publisher headline per
// perspective. Publisher article bodies are never stored or rendered here.
type Perspective = { lean: 'left' | 'center' | 'right'; source: string; coverage: string };

function readableExcerpt(text: string): string {
  const clean = text.trim();
  if (clean.length <= MAX_PERSPECTIVE_CHARS) return clean;
  const slice = clean.slice(0, MAX_PERSPECTIVE_CHARS - 1).trimEnd();
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace >= MAX_PERSPECTIVE_CHARS * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}

function comparableHeadline(text: string): string {
  return text
    .replace(/…$/, '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parsePerspectives(text: string): Perspective[] | null {
  const matches = [...text.matchAll(/From the (left|center|right) \(([^)]+)\):\s*/gi)];
  if (matches.length === 0) return null;
  return matches.map((m, i) => {
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? text.length : text.length;
    return {
      lean: m[1].toLowerCase() as Perspective['lean'],
      source: m[2],
      coverage: readableExcerpt(text.slice(start, end)),
    };
  });
}

export default function SummaryScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && windowWidth >= 900;
  const isPhoneWeb = isWeb && windowWidth < 700;
  const pageWidth = isWeb ? Math.min(windowWidth, 1120) : windowWidth;
  const pagePadding = isWeb ? (isPhoneWeb ? 16 : 32) : 16;
  const contentWidth = Math.max(1, pageWidth - pagePadding * 2);
  const articleCardWidth = isWeb ? 320 : pageWidth * 0.68;
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [ summary, setSummary ] = useState<Summary | null>(null);
  const [ articles, setArticles ] = useState<ArticleType[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Card images that fail to load fall back to the lettered placeholder
  const [failedMedia, setFailedMedia] = useState<Set<string>>(new Set());
  const coverageRef = useRef<ScrollView>(null);
  const coverageOffsetRef = useRef(0);

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      if (count / 1000000 >= 10) {
        return (count / 1000000).toFixed(0) + 'M';
      }
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      if (count / 1000 >= 10) {
        return (count / 1000).toFixed(0) + 'k';
      }
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  };


  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoadError(null);
        // subtopic detail comes back with its articles nested
        const data = await api<Summary & { articles: ArticleType[] }>(`/topics/subtopics/${id}`);
        if (!data.articles?.length) {
          setLoadError('This story is no longer active.');
          return;
        }
        setSummary(data);
        setArticles(data.articles ?? []);
        if (data.id && data.id !== id) {
          router.replace(`/summary/${data.id}`);
        }
      } catch (err: any) {
        console.log('Error fetching summary:', err?.message);
        setLoadError(err?.message ?? 'This story could not be loaded.');
      }
    };

    loadSummary();
  }, [id, router]);

  const perspectives = summary?.long_summary ? parsePerspectives(summary.long_summary) : null;
  const images = useMemo(() => {
    const seen = new Set<string>();
    return articles.flatMap((article): CarouselImage[] => {
      const preferred = article.media_large_url ?? article.media_thumbnail_url ?? article.media;
      const uri = getDisplayableArticleMedia(preferred, article.url, article.image_mode);
      if (!uri || seen.has(uri)) return [];
      seen.add(uri);
      return [{
        uri,
        source: article.source,
        articleId: article.id,
        title: article.title,
        position: article.source_lean ?? article.political_lean ?? null,
        articleUrl: article.url,
        cachePolicy: getArticleImageCachePolicy(article.image_mode),
      }];
    }).slice(0, MAX_IMAGES);
  }, [articles]);
  const outletCount = new Set(articles.map((a) => a.source)).size;
  const shownArticles = articles.slice(0, MAX_ARTICLES);

  if (loadError && !summary) {
    return (
      <ThemedView style={styles.unavailable}>
        <IconSymbol name="newspaper.fill" size={30} color={c.primary} />
        <ThemedText style={styles.unavailableTitle}>Story updated</ThemedText>
        <ThemedText style={styles.unavailableText}>{loadError}</ThemedText>
        <Pressable onPress={() => router.replace('/(tabs)/search')} style={styles.unavailableButton}>
          <ThemedText style={styles.unavailableButtonText}>Open Discover</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (

    <ScrollView showsVerticalScrollIndicator={false}>
      <ThemedView style={[styles.container, isPhoneWeb && styles.containerPhoneWeb]}>
        {isWeb && (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Back"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/');
            }}
            style={({ pressed }) => [styles.backButton, pressed && styles.controlPressed]}
          >
            <IconSymbol name="chevron.left" size={17} color={c.primary} />
            <ThemedText style={styles.backText}>Back</ThemedText>
          </Pressable>
        )}
        <ThemedView style={[styles.hero, isWideWeb && styles.heroWide]}>
          <ThemedView style={styles.heroCopy}>
            <ThemedText style={styles.eyebrow}>STORY SUMMARY</ThemedText>
            <ThemedText style={[styles.title, isWideWeb && styles.titleWide]}>
              {summary?.title}
            </ThemedText>
            <ThemedView style={styles.metaWrap}>
              <ThemedView style={styles.volumePill}>
                <ThemedText style={styles.volumeText}>
                  {formatCount(articles.length)} article{articles.length === 1 ? '' : 's'}
                </ThemedText>
              </ThemedView>
              {(summary?.keywords ?? []).slice(0, 6).map((keyword) => (
                <ThemedView key={keyword} style={styles.keywordPill}>
                  <ThemedText style={styles.keywordText}>#{keyword}</ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          </ThemedView>

          {images.length > 0 ? (
            <ThemedView style={[styles.heroMedia, isWideWeb && styles.heroMediaWide]}>
              <ImageCarousel images={images} height={isWideWeb ? 316 : 240} />
            </ThemedView>
          ) : (
            <LinearGradient
              colors={[c.card, c.accentSoftBg]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.heroPlaceholder, isWideWeb && styles.heroMediaWide]}
            >
              <ThemedView style={styles.heroPlaceholderIcon}>
                <IconSymbol name="newspaper.fill" size={30} color={c.primary} />
              </ThemedView>
              <ThemedText style={styles.heroPlaceholderLabel}>MULTI-SOURCE STORY</ThemedText>
              <ThemedText style={styles.heroPlaceholderMeta}>
                {outletCount} outlet{outletCount === 1 ? '' : 's'} compared
              </ThemedText>
            </LinearGradient>
          )}
        </ThemedView>

        {/* Coverage by perspective — a single grouped comparison surface keeps
            the data colors subordinate to forum's purple visual system. */}
        {perspectives ? (
          <ThemedView style={styles.section}>
            <ThemedView style={[styles.sectionHeading, !isWideWeb && styles.sectionHeadingStack]}>
              <ThemedText style={styles.sectionTitle}>Three perspectives</ThemedText>
              <ThemedText style={styles.sectionCaption}>How coverage frames the same story</ThemedText>
            </ThemedView>
            <ThemedView style={styles.perspectivePanel}>
              {perspectives.map((p, index) => {
                const label = `${p.lean.charAt(0).toUpperCase()}${p.lean.slice(1)}` as PerspectiveName;
                const tone = getPerspectiveTone(label, c);
                const sourceArticles = articles.filter(
                  (article) => article.source.trim().toLowerCase() === p.source.trim().toLowerCase()
                );
                const perspectiveHeadline = comparableHeadline(p.coverage);
                const perspectiveArticle = sourceArticles.find((article) => {
                  const articleHeadline = comparableHeadline(article.title);
                  return articleHeadline === perspectiveHeadline
                    || articleHeadline.startsWith(perspectiveHeadline)
                    || perspectiveHeadline.startsWith(articleHeadline);
                }) ?? sourceArticles[0];
                const row = (
                  <Pressable
                    accessibilityRole={perspectiveArticle ? 'link' : undefined}
                    accessibilityLabel={perspectiveArticle
                      ? `Open ${p.source} article: ${p.coverage}`
                      : undefined}
                    disabled={!perspectiveArticle}
                    onPress={() => {
                      if (perspectiveArticle) router.push(`/article/${perspectiveArticle.id}`);
                    }}
                    style={({ pressed }) => [
                        styles.perspectiveRow,
                        index < perspectives.length - 1 && styles.perspectiveDivider,
                        pressed && perspectiveArticle && styles.perspectivePressed,
                      ]}
                  >
                    <ThemedView
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      style={[styles.perspectiveMarker, { backgroundColor: tone.color }]}
                    />
                    <ThemedView style={styles.perspectiveContent}>
                      <ThemedView style={styles.perspectiveHeader}>
                        <PerspectiveTag label={tone.label} />
                        <ThemedText
                          type="defaultSemiBold"
                          style={styles.perspectiveSource}
                          numberOfLines={1}
                        >
                          {p.source}
                        </ThemedText>
                        {perspectiveArticle && (
                          <IconSymbol name="chevron.right" size={14} color={c.muted} />
                        )}
                      </ThemedView>
                      <ThemedText style={styles.perspectiveQuote}>{p.coverage}</ThemedText>
                    </ThemedView>
                  </Pressable>
                );
                if (!perspectiveArticle) return <ThemedView key={p.lean}>{row}</ThemedView>;
                const perspectiveMedia = getDisplayableArticleMedia(
                  perspectiveArticle.media_thumbnail_url ?? perspectiveArticle.media,
                  perspectiveArticle.url,
                  perspectiveArticle.image_mode,
                );
                return (
                  <ContentLongPress
                    key={p.lean}
                    preview={{
                      kind: 'article',
                      id: perspectiveArticle.id,
                      title: perspectiveArticle.title,
                      source: perspectiveArticle.source,
                      media: perspectiveMedia,
                      position: perspectiveArticle.source_lean ?? perspectiveArticle.political_lean ?? null,
                    }}
                  >
                    {row}
                  </ContentLongPress>
                );
              })}
            </ThemedView>
          </ThemedView>
        ) : summary?.long_summary ? (
          <ThemedView style={styles.summary}>
            <ThemedText type="defaultSemiBold" style={{fontWeight: "800"}}>
              {summary.long_summary}
            </ThemedText>
          </ThemedView>
        ) : null}

        {/* Public opinion = average scored position of matched posts;
            hidden until enough community posts exist for this story */}
        {SHOW_PUBLIC_OPINION && summary?.public_position != null && (
          <Spectrum width={contentWidth} height={20} topic="Public Opinion" position={summary.public_position} textStyle={{fontWeight: '800'}}/>
        )}

        {/* Coverage rail: peeking cards signal scrollability — no dots
            needed no matter how many articles the story gathers */}
        {shownArticles.length > 0 && (
          <ThemedView style={{ marginTop: 12 }}>
            <ThemedView style={styles.coverageHeader}>
              <ThemedView>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Latest coverage</ThemedText>
                <ThemedText style={styles.coverageCount}>
                  {articles.length} article{articles.length === 1 ? '' : 's'} · {outletCount} outlet{outletCount === 1 ? '' : 's'}
                </ThemedText>
              </ThemedView>
              {isWeb && shownArticles.length > 1 && (
                <ThemedView style={styles.coverageControls}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous coverage"
                    onPress={() => {
                      const next = Math.max(0, coverageOffsetRef.current - articleCardWidth - 12);
                      coverageOffsetRef.current = next;
                      coverageRef.current?.scrollTo({ x: next, animated: true });
                    }}
                    style={({ pressed }) => [styles.coverageControl, pressed && styles.controlPressed]}
                  >
                    <IconSymbol name="chevron.left" size={18} color={c.text} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next coverage"
                    onPress={() => {
                      const next = coverageOffsetRef.current + articleCardWidth + 12;
                      coverageOffsetRef.current = next;
                      coverageRef.current?.scrollTo({ x: next, animated: true });
                    }}
                    style={({ pressed }) => [styles.coverageControl, pressed && styles.controlPressed]}
                  >
                    <IconSymbol name="chevron.right" size={18} color={c.text} />
                  </Pressable>
                </ThemedView>
              )}
            </ThemedView>
            <ScrollView
              ref={coverageRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={articleCardWidth + 12}
              snapToAlignment="start"
              contentContainerStyle={{
                gap: 12,
                // The rail already sits inside the page gutter. Starting at
                // zero puts the first story at the left edge and preserves a
                // partial next-card peek on phones.
                paddingRight: isWeb ? 0 : 16,
              }}
              onScroll={(event) => {
                coverageOffsetRef.current = event.nativeEvent.contentOffset.x;
              }}
              scrollEventThrottle={16}
            >
              {shownArticles.map((item) => {
                const media = getDisplayableArticleMedia(
                  item.media_thumbnail_url ?? item.media,
                  item.url,
                  item.image_mode
                );
                return (
                <ContentLongPress
                  key={item.id}
                  preview={{
                    kind: 'article',
                    id: item.id,
                    title: item.title,
                    source: item.source,
                    media,
                    position: item.source_lean ?? item.political_lean ?? null,
                  }}
                >
                <Pressable
                  onPress={() => router.push(`/article/${item.id}`)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1.0 })}
                >
                  <ThemedView style={[styles.articleCard, { width: articleCardWidth }]}>
                    {/* Image frame always renders at the same size; a
                        lettered placeholder fills in when there's no media
                        (or the media URL turns out to be dead) */}
                    {media && !failedMedia.has(media) ? (
                      <Image
                        source={{ uri: media }}
                        style={styles.articleImage}
                        contentFit="cover"
                        cachePolicy={getArticleImageCachePolicy(item.image_mode)}
                        onError={() =>
                          setFailedMedia((prev) => new Set(prev).add(media))
                        }
                      />
                    ) : (
                      <LinearGradient
                        colors={[c.card, c.accentSoftBg]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.articleImage, styles.articleImagePlaceholder]}
                      >
                        <IconSymbol name="newspaper.fill" size={26} color={c.primary} />
                        <ThemedText style={styles.articleImageInitial}>
                          {(item.source ?? '?')
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((word) => word.charAt(0))
                            .join('')
                            .toUpperCase()}
                        </ThemedText>
                      </LinearGradient>
                    )}
                    <ThemedText style={styles.articleSource} numberOfLines={1}>{item.source}</ThemedText>
                    <ThemedText type="defaultSemiBold" style={styles.articleHeadline} numberOfLines={3}>
                      {item.title}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
                </ContentLongPress>
                );
              })}
            </ScrollView>
          </ThemedView>
        )}


      </ThemedView>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  unavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: c.background,
  },
  unavailableTitle: {
    marginTop: 12,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  unavailableText: {
    marginTop: 6,
    color: c.muted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  unavailableButton: {
    marginTop: 18,
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  unavailableButtonText: {
    color: c.onPrimary,
    fontWeight: '800',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 1120 : undefined,
    alignSelf: 'center',
    padding: Platform.OS === 'web' ? 32 : 16,
    gap: 22,
    marginBottom: 32,
  },
  containerPhoneWeb: {
    padding: 16,
  },
  hero: {
    gap: 18,
    backgroundColor: 'transparent',
  },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: c.surface,
  },
  backText: {
    color: c.primary,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },
  heroWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 28,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  heroMedia: {
    minWidth: 0,
    backgroundColor: 'transparent',
  },
  heroMediaWide: {
    flex: 1.12,
  },
  heroPlaceholder: {
    minHeight: 220,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: 24,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  heroPlaceholderIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: c.surfaceRaised,
    borderWidth: 1,
    borderColor: c.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  heroPlaceholderLabel: {
    color: c.primary,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
    fontWeight: '900',
  },
  heroPlaceholderMeta: {
    color: c.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  eyebrow: {
    color: c.primary,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
    fontWeight: '900',
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    color: c.primary,
  },
  titleWide: {
    fontSize: 38,
    lineHeight: 45,
    letterSpacing: -0.8,
  },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 18,
    backgroundColor: 'transparent',
  },
  volumePill: {
    borderRadius: 999,
    backgroundColor: c.primary,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  volumeText: {
    color: c.onPrimary,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  keywordPill: {
    borderRadius: 999,
    backgroundColor: c.accentSoftBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  keywordText: {
    color: c.accentDeep,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  summary: {
    backgroundColor: c.accentFaint,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  section: {
    gap: 10,
    backgroundColor: 'transparent',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  sectionHeadingStack: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 2,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  sectionCaption: {
    flexShrink: 1,
    color: c.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  perspectivePanel: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    marginBottom: 8,
  },
  perspectiveRow: {
    minWidth: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  perspectiveDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.cardBorder,
  },
  perspectivePressed: {
    backgroundColor: c.accentSoftBg,
  },
  perspectiveMarker: {
    width: 3,
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  perspectiveContent: {
    flex: 1,
    minWidth: 0,
    gap: 8,
    backgroundColor: 'transparent',
  },
  perspectiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  perspectiveSource: {
    flex: 1,
    minWidth: 0,
    color: c.subtle,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'right',
  },
  perspectiveQuote: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  coverageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  coverageCount: {
    color: c.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  coverageControls: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
  },
  coverageControl: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlPressed: {
    opacity: 0.6,
  },
  articleCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
  },
  articleImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    marginBottom: 8,
  },
  articleImagePlaceholder: {
    backgroundColor: c.accentFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  articleImageInitial: {
    fontSize: 44,
    lineHeight: 52,
    fontWeight: '800',
    color: c.onAccentFaint,
  },
  articleSource: {
    color: c.primary,
    marginBottom: 4,
    fontWeight: '700',
  },
  articleHeadline: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    height: 66, // always reserve 3 lines so every card is the same height
  },
});
