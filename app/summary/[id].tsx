import { ArticleType } from '@/components/articleComponent';
import ImageCarousel from '@/components/imageCarousel';
import Spectrum from '@/components/spectrum';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { getDisplayableArticleMedia } from '@/lib/article-media';
import { getPerspectiveTone, type PerspectiveName } from '@/lib/perspective-colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

const MAX_IMAGES = 6;
const MAX_ARTICLES = 12;
const MAX_PERSPECTIVE_CHARS = 280;

type Summary = {
  title: string;
  long_summary: string;
  keywords: string[];
  volume: number;
  public_position: number | null;
}

// The generated long_summary has a fixed shape — "From the left (Source):
// quote" paragraphs — so it parses cleanly into perspective cards.
type Perspective = { lean: 'left' | 'center' | 'right'; source: string; quote: string };

function readableExcerpt(text: string): string {
  const clean = text.trim();
  if (clean.length <= MAX_PERSPECTIVE_CHARS) return clean;
  const slice = clean.slice(0, MAX_PERSPECTIVE_CHARS - 1).trimEnd();
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace >= MAX_PERSPECTIVE_CHARS * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
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
      quote: readableExcerpt(text.slice(start, end)),
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

  const [ images, setImages ] = useState<string[]>([]);

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
        // subtopic detail comes back with its articles nested
        const data = await api<Summary & { articles: ArticleType[] }>(`/topics/subtopics/${id}`);

        setSummary(data);
        setArticles(data.articles ?? []);
        setImages(
          (data.articles ?? [])
            .map((a) => getDisplayableArticleMedia(a.media, a.url))
            .filter((u): u is string => Boolean(u))
            .slice(0, MAX_IMAGES)
        );
      } catch (err: any) {
        console.log('Error fetching summary:', err?.message);
      }
    };

    loadSummary();
  }, [id]);

  const perspectives = summary?.long_summary ? parsePerspectives(summary.long_summary) : null;
  const outletCount = new Set(articles.map((a) => a.source)).size;
  const shownArticles = articles.slice(0, MAX_ARTICLES);

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

          {images.length > 0 && (
            <ThemedView style={[styles.heroMedia, isWideWeb && styles.heroMediaWide]}>
              <ImageCarousel images={images} height={isWideWeb ? 316 : 240} />
            </ThemedView>
          )}
        </ThemedView>

        {/* Coverage by perspective — one voice per side of the spectrum */}
        {perspectives ? (
          <ThemedView style={styles.section}>
            <ThemedView style={styles.sectionHeading}>
              <ThemedText style={styles.sectionTitle}>Three perspectives</ThemedText>
              <ThemedText style={styles.sectionCaption}>How coverage frames the same story</ThemedText>
            </ThemedView>
            <ThemedView style={[styles.perspectives, !isWideWeb && styles.perspectivesStack]}>
              {perspectives.map((p) => {
                const label = `${p.lean.charAt(0).toUpperCase()}${p.lean.slice(1)}` as PerspectiveName;
                const tone = getPerspectiveTone(label, c);
                return (
                  <ThemedView
                    key={p.lean}
                    style={[
                      styles.perspectiveCard,
                      isWideWeb && styles.perspectiveCardWide,
                      { backgroundColor: tone.background, borderLeftColor: tone.color },
                    ]}
                  >
                    <ThemedView style={styles.perspectiveHeader}>
                      <ThemedView style={[styles.leanTag, { backgroundColor: tone.color }]}>
                        <ThemedText style={styles.leanTagText}>{tone.label}</ThemedText>
                      </ThemedView>
                      <ThemedText type="defaultSemiBold" style={styles.perspectiveSource}>{p.source}</ThemedText>
                    </ThemedView>
                    <ThemedText style={styles.perspectiveQuote}>{p.quote}</ThemedText>
                  </ThemedView>
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
        {summary?.public_position != null && (
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
              // Edge padding centers every snapped card on screen —
              // including the first and last
              contentContainerStyle={{
                gap: 12,
                paddingHorizontal: isWeb ? 0 : (pageWidth - articleCardWidth) / 2 - 16,
              }}
              onScroll={(event) => {
                coverageOffsetRef.current = event.nativeEvent.contentOffset.x;
              }}
              scrollEventThrottle={16}
            >
              {shownArticles.map((item) => {
                const media = getDisplayableArticleMedia(item.media, item.url);
                return (
                <Pressable
                  key={item.id}
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
                        resizeMode="cover"
                        onError={() =>
                          setFailedMedia((prev) => new Set(prev).add(media))
                        }
                      />
                    ) : (
                      <ThemedView style={[styles.articleImage, styles.articleImagePlaceholder]}>
                        <ThemedText style={styles.articleImageInitial}>
                          {(item.source ?? '?').charAt(0).toUpperCase()}
                        </ThemedText>
                      </ThemedView>
                    )}
                    <ThemedText style={styles.articleSource} numberOfLines={1}>{item.source}</ThemedText>
                    <ThemedText type="defaultSemiBold" style={styles.articleHeadline} numberOfLines={3}>
                      {item.title}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
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
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  sectionCaption: {
    color: c.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  perspectives: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  perspectivesStack: {
    flexDirection: 'column',
  },
  perspectiveCard: {
    minWidth: 0,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 12,
    gap: 6,
  },
  perspectiveCardWide: {
    flex: 1,
  },
  perspectiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  leanTag: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  leanTagText: {
    color: c.onPrimary,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  perspectiveSource: {
    fontSize: 14,
    fontWeight: '700',
  },
  perspectiveQuote: {
    fontSize: 15,
    lineHeight: 21,
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
