import { ArticleType } from '@/components/articleComponent';
import ImageCarousel from '@/components/imageCarousel';
import Spectrum from '@/components/spectrum';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { getDisplayableArticleMedia } from '@/lib/article-media';
import { getPerspectiveTone, type PerspectiveName } from '@/lib/perspective-colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet } from 'react-native';

const screenWidth =  Dimensions.get('window').width;
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [ summary, setSummary ] = useState<Summary | null>(null);
  const [ articles, setArticles ] = useState<ArticleType[]>([]);

  const [ images, setImages ] = useState<string[]>([]);

  // Card images that fail to load fall back to the lettered placeholder
  const [failedMedia, setFailedMedia] = useState<Set<string>>(new Set());

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

  const text = '📊 ' + formatCount(summary?.volume ?? 0) + ' posts' + '   •   ' + summary?.keywords.join('   •   ');

  const perspectives = summary?.long_summary ? parsePerspectives(summary.long_summary) : null;
  const outletCount = new Set(articles.map((a) => a.source)).size;
  const shownArticles = articles.slice(0, MAX_ARTICLES);

  return (

    <ScrollView showsVerticalScrollIndicator={false}>
      <ThemedView style={ styles.container }>

        <ThemedText style={styles.title}>
          {summary?.title}
        </ThemedText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 24, marginBottom: 8 }}>
          <ThemedText numberOfLines={1} ellipsizeMode="clip" style={{ color: c.accentDeep }}>{text}   •   {text}</ThemedText>
        </ScrollView>

        {images && images.length > 0 && (
          <ImageCarousel images={images} height={240} />
        )}

        {/* Coverage by perspective — one voice per side of the spectrum */}
        {perspectives ? (
          <ThemedView style={styles.perspectives}>
            {perspectives.map((p) => {
              const label = `${p.lean.charAt(0).toUpperCase()}${p.lean.slice(1)}` as PerspectiveName;
              const tone = getPerspectiveTone(label, c);
              return (
                <ThemedView key={p.lean} style={[styles.perspectiveCard, { backgroundColor: tone.background, borderLeftColor: tone.color }]}>
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
          <Spectrum width={(screenWidth - 32)} height={20} topic="Public Opinion" position={summary.public_position} textStyle={{fontWeight: '800'}}/>
        )}

        {/* Coverage rail: peeking cards signal scrollability — no dots
            needed no matter how many articles the story gathers */}
        {shownArticles.length > 0 && (
          <ThemedView style={{ marginTop: 12 }}>
            <ThemedView style={styles.coverageHeader}>
              <ThemedText type="defaultSemiBold" style={{ fontWeight: '800' }}>
                Latest coverage
              </ThemedText>
              <ThemedText style={styles.coverageCount}>
                {articles.length} article{articles.length === 1 ? '' : 's'} · {outletCount} outlet{outletCount === 1 ? '' : 's'}
              </ThemedText>
            </ThemedView>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={screenWidth * 0.68 + 12}
              snapToAlignment="start"
              // Edge padding centers every snapped card on screen —
              // including the first and last
              contentContainerStyle={{
                gap: 12,
                paddingHorizontal: (screenWidth - screenWidth * 0.68) / 2 - 16,
              }}
            >
              {shownArticles.map((item) => {
                const media = getDisplayableArticleMedia(item.media, item.url);
                return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/article/${item.id}`)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1.0 })}
                >
                  <ThemedView style={[styles.articleCard, { width: screenWidth * 0.68 }]}>
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
    padding: 16,
    gap: 8,
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    color: c.primary,
    marginTop: 8,
  },
  summary: {
    backgroundColor: c.accentFaint,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  perspectives: {
    gap: 10,
    marginBottom: 8,
  },
  perspectiveCard: {
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 12,
    gap: 6,
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
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  coverageCount: {
    color: c.muted,
    fontSize: 13,
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
