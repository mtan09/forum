import Article, { ArticleType } from '@/components/articleComponent';
import Carousel from '@/components/carousel';
import Post from '@/components/postComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { usePosts } from '@/context/postContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { selectTick, tapLight } from '@/lib/haptics';
import { onTabRefresh } from '@/lib/tabRefresh';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from 'react-native';

const screenWidth = Dimensions.get('window').width;

// An article's side comes from its scored lean, falling back to its
// outlet's lean (always present for ingested articles)
const articleLean = (a: ArticleType): number | null =>
  a.political_lean ?? a.source_lean ?? null;

// Auto-clustered hot topics from /topics/hot
type HotTopic = {
  id: string;
  title: string;
  short_summary: string;
  keywords: string[];
  volume: number;
  public_position: number | null;
};

// Articles per page for infinite scroll
const FEED_ARTICLE_LIMIT = 30;

export default function Feed() {

  const router = useRouter();

  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);

  const { posts, refresh, loadMorePosts, hasMorePosts, postsEpoch } = usePosts();

  const scrollY = useRef(new Animated.Value(0)).current;

  const [activeTab, setActiveTab] = useState<'For You' | 'Random' | 'Against You'>('Random');

  // Each feed tab remembers its own scroll position; the listener keeps
  // the active tab's offset current on every scroll event.
  const scrollOffsets = useRef<Record<string, number>>({});
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (e: { nativeEvent: { contentOffset: { y: number } } }) => {
        scrollOffsets.current[activeTab] = e.nativeEvent.contentOffset.y;
      },
    }
  );

  const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
  const [hotIndex, setHotIndex] = useState(0);

  const fetchHotTopics = useCallback(async () => {
    try {
      setHotTopics(await api<HotTopic[]>('/topics/hot'));
    } catch (err: any) {
      console.log('Error fetching hot topics:', err?.message);
    }
  }, []);

  useEffect(() => {
    fetchHotTopics();
  }, [fetchHotTopics]);

  // The user's single computed position (from their posts and votes) —
  // used only to sort content into For You / Against You
  const { user: me } = useAuth();
  const [userPosition, setUserPosition] = useState(0.5);
  useEffect(() => {
    api<{ position: number }>('/users/me/spectrum')
      .then((data) => setUserPosition(data.position ?? 0.5))
      .catch((err: any) => console.log('Error fetching user spectrum:', err?.message));
  }, []);

  // One feed; the tabs slice BOTH posts and articles by spectrum side.
  // A narrow center band is its own side so neutral content isn't
  // arbitrarily called left or right: For You = your side plus neutral,
  // Against You = strictly the other side, Random = everything.
  const tabAllows = useCallback((value: number | null | undefined): boolean => {
    if (activeTab === 'Random') return true;
    if (value == null) return false; // unscored content has no side
    const side = Math.abs(value - 0.5) <= 0.05 ? 'center' : value < 0.5 ? 'left' : 'right';
    const userSide = userPosition < 0.5 ? 'left' : 'right';
    if (activeTab === 'For You') return side === 'center' || side === userSide;
    return side !== 'center' && side !== userSide;
  }, [activeTab, userPosition]);

  const filteredPosts = useMemo(() => {
    // Your own posts never appear in the feed — they live on your profile
    const others = posts.filter((p) => p.user !== me?.id);
    if (activeTab === 'Random') return others;
    return others.filter((p) => tabAllows(p.position));
  }, [posts, activeTab, me?.id, tabAllows]);

  // Articles accumulate page by page for infinite scroll
  const [ articles, setArticles ] = useState<ArticleType[]>([]);
  const articlesRef = useRef<ArticleType[]>([]);
  useEffect(() => { articlesRef.current = articles; }, [articles]);
  const [hasMoreArticles, setHasMoreArticles] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // ONE master order for all three tabs: shuffled only when the data is
  // refreshed (mount / pull-to-refresh), never on tab switches or votes.
  // Each tab renders the master order filtered to its members, so the
  // sequence is stable and consistent — like any other social feed.
  const [masterOrder, setMasterOrder] = useState<{ kind: 'post' | 'article'; id: string }[]>([]);
  const [orderEpoch, setOrderEpoch] = useState(0);

  const shuffle = <T,>(arr: T[]): T[] => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  const fetchArticles = useCallback(async (reset: boolean): Promise<ArticleType[]> => {
    try {
      const offset = reset ? 0 : articlesRef.current.length;
      const rows = await api<ArticleType[]>(`/articles?limit=${FEED_ARTICLE_LIMIT}&offset=${offset}`);
      setHasMoreArticles(rows.length === FEED_ARTICLE_LIMIT);
      if (reset) {
        setArticles(rows);
        setOrderEpoch((e) => e + 1); // fresh page 1 = rebuild the feed order
      } else {
        setArticles((prev) => {
          const seen = new Set(prev.map((a) => a.id));
          return [...prev, ...rows.filter((r) => !seen.has(r.id))];
        });
      }
      return rows;
    } catch (err: any) {
      console.log('Error fetching articles:', err?.message);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchArticles(true);
  }, [fetchArticles])

  // Pull-to-refresh reloads everything the feed shows (guarded so a long
  // pull can't queue up repeat refreshes)
  const [refreshing, setRefreshing] = useState(false);
  const refreshInflight = useRef(false);
  const onRefresh = useCallback(async () => {
    if (refreshInflight.current) return;
    refreshInflight.current = true;
    setRefreshing(true);
    try {
      await Promise.all([
        refresh(),
        fetchArticles(true),
        fetchHotTopics(),
      ]);
    } finally {
      setRefreshing(false);
      refreshInflight.current = false;
    }
  }, [refresh, fetchArticles, fetchHotTopics]);

  // Infinite scroll: page in more articles AND posts when the bottom nears
  const onEndReached = useCallback(async () => {
    if (loadingMore || refreshing || (!hasMoreArticles && !hasMorePosts)) return;
    setLoadingMore(true);
    try {
      const [addedArticles, addedPosts] = await Promise.all([
        hasMoreArticles ? fetchArticles(false) : Promise.resolve([] as ArticleType[]),
        hasMorePosts ? loadMorePosts() : Promise.resolve([]),
      ]);
      // Appended pages join the END of the master order (shuffled among
      // themselves); every tab sees them below what it already showed.
      setMasterOrder((prev) => {
        const seen = new Set(prev.map((o) => o.id));
        const fresh = [
          ...addedArticles.filter((a) => !seen.has(a.id)).map((a) => ({ kind: 'article' as const, id: a.id })),
          ...addedPosts.filter((p) => !seen.has(p.id)).map((p) => ({ kind: 'post' as const, id: p.id })),
        ];
        return [...prev, ...shuffle(fresh)];
      });
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, refreshing, hasMoreArticles, hasMorePosts, fetchArticles, loadMorePosts]);

  // Rebuild the master shuffle only on data RESETS (pull-to-refresh, new
  // post created) — never on appended pages or tab switches, so the
  // sequence users already scrolled through stays put.
  const postsForOrderRef = useRef(posts);
  useEffect(() => { postsForOrderRef.current = posts; }, [posts]);
  useEffect(() => {
    const postEntries = postsForOrderRef.current.map((p) => ({ kind: 'post' as const, id: p.id }));
    const articleEntries = articlesRef.current.map((a) => ({ kind: 'article' as const, id: a.id }));
    setMasterOrder(shuffle([...postEntries, ...articleEntries]));
  }, [postsEpoch, orderEpoch]);

  type FeedItem =
    | { kind: 'post'; id: string; data: import('@/components/postComponent').PostType }
    | { kind: 'article'; id: string; data: ArticleType };

  // Resolve the stable master order into fresh data on every render,
  // keeping only what the active tab allows — the sequence itself never
  // changes, each tab just sees its slice of it.
  const postsById = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);
  const articlesById = useMemo(() => new Map(articles.map((a) => [a.id, a])), [articles]);
  const visiblePostIds = useMemo(
    () => new Set(filteredPosts.map((p) => p.id)),
    [filteredPosts]
  );
  const feedItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    for (const o of masterOrder) {
      if (o.kind === 'post') {
        const data = postsById.get(o.id);
        if (data && visiblePostIds.has(o.id)) items.push({ kind: 'post', id: `p-${o.id}`, data });
      } else {
        const data = articlesById.get(o.id);
        if (data && tabAllows(articleLean(data))) items.push({ kind: 'article', id: `a-${o.id}`, data });
      }
    }
    return items;
  }, [masterOrder, postsById, articlesById, visiblePostIds, tabAllows]);

  const listRef = useRef<FlatList<FeedItem>>(null);

  // Re-tapping the home tab button jumps to the top and reloads the feed
  useEffect(() => {
    return onTabRefresh('index', () => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      scrollOffsets.current[activeTab] = 0;
      onRefresh();
    });
  }, [onRefresh, activeTab]);

  // Coming back to a tab drops you where you left it
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        offset: scrollOffsets.current[activeTab] ?? 0,
        animated: false,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab]);

  return(
      <ThemedView style={styles.container}>
        <FlatList<FeedItem>
          ref={listRef}
          data={feedItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (item.kind === 'post') {
              return (
                <Pressable
                  onPress={() => {
                    router.push(`/post/${item.data.id}`);
                  }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
                >
                  <Post post={item.data} />
                </Pressable>
              );
            }
            return (
              <Pressable
                onPress={() => {
                  router.push(`/article/${item.data.id}`);
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
              >
                <Article article={item.data} />
              </Pressable>
            );
          }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          // The list's own top edge sits just below the solid part of the
          // hot bar, so pull-to-refresh triggers at the normal distance
          // and the spinner shows up in the fade zone. Content still
          // scrolls up under the gradient (which overlays the list top).
          style={{ marginTop: hotTopics.length > 0 ? 210 : 104 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              // intentionally the iOS system-default gray spinner
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ paddingVertical: 24 }} />
            ) : !hasMoreArticles && !hasMorePosts && feedItems.length > 0 ? (
              <ThemedText style={styles.feedEnd}>You&apos;re all caught up</ThemedText>
            ) : null
          }
          contentContainerStyle={{ paddingTop: 0, paddingBottom: 24 }}
        />
        {/* Hot topics: slim swipeable carousel pinned below the tabs;
            tap a title for its summary */}
        {hotTopics.length > 0 && (
          <ThemedView style={styles.hotBar} pointerEvents="box-none">
            <Carousel
              data={hotTopics}
              keyExtractor={(t) => t.id}
              horizontalPadding={0}
              showPagination={false}
              onIndexChange={setHotIndex}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => router.push(`/summary/${item.id}`)}
                  style={({ pressed }) => [
                    styles.hotCard,
                    { backgroundColor: pressed ? c.accentFaint + 'BF' : c.accentFaint },
                  ]}
                >
                  <ThemedText style={styles.hotCardText} numberOfLines={2}>
                    {item.title}
                  </ThemedText>
                  {/* Dots live inside the card so they sit on purple, not
                      on the fading background */}
                  {hotTopics.length > 1 && (
                    <ThemedView style={styles.hotDots}>
                      {hotTopics.map((_, i) => (
                        <ThemedView
                          key={i}
                          style={[
                            styles.hotDot,
                            { backgroundColor: i === hotIndex ? c.accentDeep : c.carouselDotInactive },
                          ]}
                        />
                      ))}
                    </ThemedView>
                  )}
                </Pressable>
              )}
            />
          </ThemedView>
        )}
        {/* Fade overlay: starts fully opaque exactly at the list's clip
            line (bottom of the solid bar), so scrolled content dissolves
            smoothly instead of being cut off mid-fade */}
        {hotTopics.length > 0 && (
          <LinearGradient
            // Theme-owned fade tokens keep this overlay neutral in both modes.
            colors={[c.background, c.backgroundFade60, c.backgroundFade25, c.backgroundTransparent]}
            locations={[0, 0.45, 0.75, 1]}
            style={styles.fadeOverlay}
            pointerEvents="none"
          />
        )}
        <ThemedView style={styles.header}>
          {(['For You', 'Random', 'Against You'] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => { selectTick(); setActiveTab(tab); }}
              style={{
                paddingVertical: 10,
                borderBottomLeftRadius: activeTab === tab ? 4 : 0,
                borderBottomRightRadius: activeTab === tab ? 4 : 0,
                borderBottomWidth: 4,
                borderBottomColor: activeTab === tab ? c.primary : c.background,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 54,
                width: screenWidth / 3,
              }}
            >
              <ThemedText
                style={{ fontSize: 15, fontWeight: '800', color: activeTab === tab ? c.text : c.muted }}
                numberOfLines={1}
              >
                {tab}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
        {/* Floating create-post button */}
        <Pressable
          onPress={() => { tapLight(); router.push('/createpost'); }}
          style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Create post"
        >
          <IconSymbol name="plus" size={28} color={c.onPrimary} />
        </Pressable>
      </ThemedView>

  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: c.background,
    position: 'absolute',
    width: screenWidth,
    height: 104,
    borderColor: c.border,
    borderBottomWidth: 1,
  },
  hotBar: {
    position: 'absolute',
    top: 104,
    width: screenWidth,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: c.background,
  },
  // sits directly below the solid bar (104 + 14 + 84 card + 8 = 210)
  fadeOverlay: {
    position: 'absolute',
    top: 210,
    width: screenWidth,
    height: 20,
  },
  hotCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    minHeight: 84,
    justifyContent: 'center',
  },
  hotCardText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: c.onAccentFaint,
    textAlign: 'center',
  },
  hotDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  hotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  feedEnd: {
    textAlign: 'center',
    color: c.muted,
    paddingVertical: 24,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
});
