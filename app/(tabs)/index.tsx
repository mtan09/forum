import Article, { ArticleType } from '@/components/articleComponent';
import AppRefreshControl from '@/components/appRefreshControl';
import Carousel from '@/components/carousel';
import Post, { type PostType } from '@/components/postComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { useFeedPreference } from '@/context/feedPreferenceContext';
import { usePosts } from '@/context/postContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { getDisplayableArticleMedia } from '@/lib/article-media';
import { selectTick, tapLight } from '@/lib/haptics';
import { onTabRefresh } from '@/lib/tabRefresh';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  type ListRenderItemInfo,
  Pressable,
  StyleSheet,
  type ViewToken,
  useWindowDimensions,
} from 'react-native';

// An article's side comes from its scored lean, falling back to its
// outlet's lean (always present for ingested articles)
const articleLean = (a: ArticleType): number | null =>
  a.political_lean ?? a.source_lean ?? null;

const sameSignals = (left?: string[], right?: string[]): boolean => {
  if (left === right) return true;
  if (!left || !right || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};

const reuseArticleSnapshot = (current: ArticleType | undefined, next: ArticleType): ArticleType => {
  if (!current) return next;
  const unchanged =
    current.id === next.id &&
    current.url === next.url &&
    current.title === next.title &&
    current.source === next.source &&
    current.description === next.description &&
    current.media === next.media &&
    current.media_thumbnail_url === next.media_thumbnail_url &&
    current.media_large_url === next.media_large_url &&
    current.media_width === next.media_width &&
    current.media_height === next.media_height &&
    current.media_status === next.media_status &&
    current.image_mode === next.image_mode &&
    current.text_mode === next.text_mode &&
    current.ai_mode === next.ai_mode &&
    current.political_lean === next.political_lean &&
    current.content_type === next.content_type &&
    current.lean_confidence === next.lean_confidence &&
    current.scorer_version === next.scorer_version &&
    current.source_lean === next.source_lean &&
    current.general_topic_id === next.general_topic_id &&
    current.published_at === next.published_at &&
    current.upvotes === next.upvotes &&
    current.downvotes === next.downvotes &&
    current.commentcount === next.commentcount &&
    current.my_vote === next.my_vote &&
    current.my_bookmark === next.my_bookmark &&
    sameSignals(current.lean_signals, next.lean_signals);
  return unchanged ? current : next;
};

// Auto-clustered hot topics from /topics/hot
type HotTopic = {
  id: string;
  title: string;
  short_summary: string;
  keywords: string[];
  volume: number;
  public_position: number | null;
};

type FeedItem =
  | { kind: 'post'; id: string; data: PostType }
  | { kind: 'article'; id: string; data: ArticleType };

const feedItemKey = (item: FeedItem) => item.id;
const FEED_VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };

const FeedRow = memo(function FeedRow({ item }: { item: FeedItem }) {
  const router = useRouter();
  if (item.kind === 'post') {
    return (
      <Pressable
        onPress={() => router.push(`/post/${item.data.id}`)}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
      >
        <Post post={item.data} />
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={() => router.push(`/article/${item.data.id}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
    >
      <Article article={item.data} />
    </Pressable>
  );
}, (previous, next) => previous.item.id === next.item.id && previous.item.data === next.item.data);

const renderFeedItem = ({ item }: ListRenderItemInfo<FeedItem>) => <FeedRow item={item} />;

// Articles per page for infinite scroll
const FEED_ARTICLE_LIMIT = 15;

export default function Feed() {

  const router = useRouter();

  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const isWeb = Platform.OS === 'web';
  const { width: windowWidth } = useWindowDimensions();
  const webHasSidebar = isWeb && windowWidth >= 1180;
  const webHasHeaderComposer = isWeb && windowWidth < 700;
  const [feedWidth, setFeedWidth] = useState(0);

  const { preference: feedContentPreference } = useFeedPreference();
  const showsPosts = feedContentPreference !== 'articles';
  const showsArticles = feedContentPreference !== 'posts';
  const {
    feedPosts: posts,
    refresh,
    loadMorePosts,
    hasMorePosts,
    postsEpoch,
    isLoading: postsLoading,
  } = usePosts();

  const scrollY = useRef(new Animated.Value(0)).current;

  const [activeTab, setActiveTab] = useState<'For You' | 'Random' | 'Against You'>('Random');

  // Each feed tab remembers its own scroll position; the listener keeps
  // the active tab's offset current on every scroll event.
  const scrollOffsets = useRef<Record<string, number>>({});
  const handleScroll = useMemo(() => Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (e: { nativeEvent: { contentOffset: { y: number } } }) => {
        scrollOffsets.current[activeTab] = e.nativeEvent.contentOffset.y;
      },
    }
  ), [activeTab, scrollY]);

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
    if (!showsPosts) return [];
    // Your own posts never appear in the feed — they live on your profile
    const others = posts.filter((p) => p.user !== me?.id);
    if (activeTab === 'Random') return others;
    return others.filter((p) => tabAllows(p.position));
  }, [posts, activeTab, me?.id, showsPosts, tabAllows]);

  // Articles accumulate page by page for infinite scroll
  const [ articles, setArticles ] = useState<ArticleType[]>([]);
  const articlesRef = useRef<ArticleType[]>([]);
  useEffect(() => { articlesRef.current = articles; }, [articles]);
  const [hasMoreArticles, setHasMoreArticles] = useState(true);
  const [articlesLoaded, setArticlesLoaded] = useState(false);
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

  const fetchArticles = useCallback(async (reset: boolean, bumpEpoch = true): Promise<ArticleType[]> => {
    try {
      const offset = reset ? 0 : articlesRef.current.length;
      const rows = await api<ArticleType[]>(`/articles?limit=${FEED_ARTICLE_LIMIT}&offset=${offset}`);
      setHasMoreArticles(rows.length === FEED_ARTICLE_LIMIT);
      if (reset) {
        setArticles((current) => {
          const currentById = new Map(current.map((article) => [article.id, article]));
          return rows.map((article) => reuseArticleSnapshot(currentById.get(article.id), article));
        });
        if (bumpEpoch) setOrderEpoch((e) => e + 1); // fresh page 1 = rebuild the feed order
      } else {
        setArticles((prev) => {
          const seen = new Set(prev.map((a) => a.id));
          return [...prev, ...rows.filter((r) => !seen.has(r.id))];
        });
      }
      return rows;
    } catch (err: any) {
      console.log('Error fetching articles:', err?.message);
      return reset ? articlesRef.current : [];
    } finally {
      setArticlesLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchArticles(true);
  }, [fetchArticles])

  // Pull-to-refresh reloads everything the feed shows (guarded so a long
  // pull can't queue up repeat refreshes)
  const [refreshing, setRefreshing] = useState(false);
  const refreshInflight = useRef(false);
  const refreshTriggeredThisDrag = useRef(false);
  const refreshFeed = useCallback(async () => {
    if (refreshInflight.current) return;
    refreshInflight.current = true;
    setRefreshing(true);
    try {
      const [freshPosts, freshArticles] = await Promise.all([
        // Suppress the two independent order epochs: after both datasets
        // arrive, rebuild the shuffled feed once from the same snapshot.
        refresh({ bumpEpoch: false }),
        fetchArticles(true, false),
        fetchHotTopics(),
      ]);
      setMasterOrder(shuffle([
        ...freshPosts.map((post) => ({ kind: 'post' as const, id: post.id })),
        ...freshArticles.map((article) => ({ kind: 'article' as const, id: article.id })),
      ]));
    } finally {
      setRefreshing(false);
      refreshInflight.current = false;
    }
  }, [refresh, fetchArticles, fetchHotTopics]);

  const onPullRefresh = useCallback(async () => {
    // A fast request can finish while the list is still held past the
    // refresh threshold. Keep the gesture latched until a new drag begins
    // so native refresh controls cannot fire repeatedly for one pull.
    if (refreshTriggeredThisDrag.current) return;
    refreshTriggeredThisDrag.current = true;
    await refreshFeed();
  }, [refreshFeed]);

  // Infinite scroll: page in more articles AND posts when the bottom nears
  const onEndReached = useCallback(async () => {
    const canLoadArticles = showsArticles && hasMoreArticles;
    const canLoadPosts = showsPosts && hasMorePosts;
    if (loadingMore || refreshing || (!canLoadArticles && !canLoadPosts)) return;
    setLoadingMore(true);
    try {
      const [addedArticles, addedPosts] = await Promise.all([
        canLoadArticles ? fetchArticles(false) : Promise.resolve([] as ArticleType[]),
        canLoadPosts ? loadMorePosts() : Promise.resolve([]),
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
  }, [
    loadingMore,
    refreshing,
    showsArticles,
    showsPosts,
    hasMoreArticles,
    hasMorePosts,
    fetchArticles,
    loadMorePosts,
  ]);

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

  // Async post/article resets can finish in separate renders. Keep the
  // stable order synchronized with the data that actually exists so an
  // early empty reset can never strand the feed with no rows. Existing
  // entries keep their order; newly paged content joins at the end.
  useEffect(() => {
    setMasterOrder((current) => {
      const available = [
        ...posts.map((post) => ({ kind: 'post' as const, id: post.id })),
        ...articles.map((article) => ({ kind: 'article' as const, id: article.id })),
      ];
      const availableKeys = new Set(available.map((item) => `${item.kind}:${item.id}`));
      const kept = current.filter((item) => availableKeys.has(`${item.kind}:${item.id}`));
      const keptKeys = new Set(kept.map((item) => `${item.kind}:${item.id}`));
      const missing = available.filter((item) => !keptKeys.has(`${item.kind}:${item.id}`));

      if (missing.length === 0 && kept.length === current.length) return current;
      return [...kept, ...shuffle(missing)];
    });
  }, [articles, posts]);

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
    const renderOrder = masterOrder.length > 0
      ? masterOrder
      : [
          ...posts.map((post) => ({ kind: 'post' as const, id: post.id })),
          ...articles.map((article) => ({ kind: 'article' as const, id: article.id })),
        ];
    for (const o of renderOrder) {
      if (o.kind === 'post') {
        if (!showsPosts) continue;
        const data = postsById.get(o.id);
        if (data && visiblePostIds.has(o.id)) items.push({ kind: 'post', id: `p-${o.id}`, data });
      } else {
        if (!showsArticles) continue;
        const data = articlesById.get(o.id);
        if (data && tabAllows(articleLean(data))) items.push({ kind: 'article', id: `a-${o.id}`, data });
      }
    }
    return items;
  }, [
    masterOrder,
    posts,
    articles,
    postsById,
    articlesById,
    visiblePostIds,
    tabAllows,
    showsPosts,
    showsArticles,
  ]);
  const feedItemsRef = useRef(feedItems);
  useEffect(() => { feedItemsRef.current = feedItems; }, [feedItems]);

  // Warm only the next few images after the visible window. This mirrors
  // timeline prefetching without downloading the whole paginated feed.
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<FeedItem>[] }) => {
    const lastVisibleIndex = viewableItems.reduce(
      (highest, token) => Math.max(highest, token.index ?? -1),
      -1
    );
    if (lastVisibleIndex < 0) return;
    const urls = feedItemsRef.current
      .slice(lastVisibleIndex + 1, lastVisibleIndex + 4)
      .map((item) => item.kind === 'post'
        ? item.data.media
        : getDisplayableArticleMedia(
            item.data.media_thumbnail_url ?? item.data.media,
            item.data.url,
            item.data.image_mode
          ))
      .filter((url): url is string => typeof url === 'string' && /^https?:\/\//i.test(url));
    if (urls.length > 0) ExpoImage.prefetch(urls, 'memory-disk').catch(() => {});
  }).current;

  const listRef = useRef<FlatList<FeedItem>>(null);

  // A content-type change creates a different timeline. Reset every tab's
  // saved offset so returning from Settings cannot land beyond the new list.
  useEffect(() => {
    scrollOffsets.current = {};
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [feedContentPreference]);

  // Re-tapping the home tab button jumps to the top and reloads the feed
  useEffect(() => {
    return onTabRefresh('index', () => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      scrollOffsets.current[activeTab] = 0;
      refreshFeed();
    });
  }, [refreshFeed, activeTab]);

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
      <ThemedView
        style={styles.container}
        onLayout={(event) => {
          const next = Math.round(event.nativeEvent.layout.width);
          if (next > 0 && next !== feedWidth) setFeedWidth(next);
        }}
      >
        <FlatList<FeedItem>
          ref={listRef}
          data={feedItems}
          showsVerticalScrollIndicator={false}
          keyExtractor={feedItemKey}
          renderItem={renderFeedItem}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          windowSize={7}
          viewabilityConfig={FEED_VIEWABILITY_CONFIG}
          onViewableItemsChanged={onViewableItemsChanged}
          onScroll={handleScroll}
          onScrollBeginDrag={() => {
            refreshTriggeredThisDrag.current = false;
          }}
          scrollEventThrottle={16}
          // The list's own top edge sits just below the solid part of the
          // hot bar, so pull-to-refresh triggers at the normal distance
          // and the spinner shows up in the fade zone. Content still
          // scrolls up under the gradient (which overlays the list top).
          style={{
            flex: 1,
            marginTop: hotTopics.length > 0 ? (isWeb ? 184 : 210) : (isWeb ? 58 : 104),
          }}
          refreshControl={
            isWeb ? undefined : (
              <AppRefreshControl
                refreshing={refreshing}
                onRefresh={onPullRefresh}
              />
            )
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ paddingVertical: 24 }} />
            ) : (!showsArticles || !hasMoreArticles) &&
              (!showsPosts || !hasMorePosts) &&
              feedItems.length > 0 ? (
              <ThemedText style={styles.feedEnd}>You&apos;re all caught up</ThemedText>
            ) : null
          }
          ListEmptyComponent={
            <ThemedView style={styles.emptyFeed}>
              {(showsPosts && postsLoading && posts.length === 0) ||
              (showsArticles && !articlesLoaded && articles.length === 0) ? (
                <>
                  <ActivityIndicator color={c.muted} />
                  <ThemedText style={styles.emptyFeedText}>Loading the conversation…</ThemedText>
                </>
              ) : (
                <>
                  <ThemedText style={styles.emptyFeedTitle}>Nothing matches this view yet</ThemedText>
                  <ThemedText style={styles.emptyFeedText}>
                    {feedContentPreference === 'posts'
                      ? 'No posts match this perspective yet.'
                      : feedContentPreference === 'articles'
                        ? 'No articles match this perspective yet.'
                        : 'The Random feed keeps every perspective in the mix.'}
                  </ThemedText>
                  {activeTab !== 'Random' && (
                    <Pressable onPress={() => setActiveTab('Random')} style={styles.emptyFeedButton}>
                      <ThemedText style={styles.emptyFeedButtonText}>Open Random</ThemedText>
                    </Pressable>
                  )}
                </>
              )}
            </ThemedView>
          }
          contentContainerStyle={{ paddingTop: 0, paddingBottom: 24 }}
        />
        {/* Hot topics: slim swipeable carousel pinned below the tabs;
            tap a title for its summary */}
        {hotTopics.length > 0 && (
          <ThemedView style={[styles.hotBar, isWeb && styles.hotBarWeb, { pointerEvents: 'box-none' }]}>
            <Carousel
              data={hotTopics}
              keyExtractor={(t) => t.id}
              pageWidth={feedWidth || undefined}
              horizontalPadding={0}
              showPagination={false}
              showControls={isWeb && windowWidth >= 700}
              onIndexChange={setHotIndex}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => router.push(`/summary/${item.id}`)}
                  style={({ pressed }) => [
                    styles.hotCard,
                    isWeb && styles.hotCardWeb,
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
            style={[styles.fadeOverlay, isWeb && styles.fadeOverlayWeb, { pointerEvents: 'none' }]}
          />
        )}
        <ThemedView style={[styles.header, isWeb && styles.headerWeb]}>
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
                marginTop: isWeb ? 0 : 54,
                flex: 1,
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
          style={({ pressed }) => [styles.fab, (webHasSidebar || webHasHeaderComposer) && styles.fabWeb, { opacity: pressed ? 0.85 : 1 }]}
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
    width: '100%',
    height: 104,
    borderColor: c.border,
    borderBottomWidth: 1,
  },
  headerWeb: {
    height: 58,
    zIndex: 4,
  },
  hotBar: {
    position: 'absolute',
    top: 104,
    width: '100%',
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: c.background,
  },
  hotBarWeb: {
    top: 58,
    paddingTop: 12,
    paddingBottom: 12,
    zIndex: 3,
  },
  // sits directly below the solid bar (104 + 14 + 84 card + 8 = 210)
  fadeOverlay: {
    position: 'absolute',
    top: 210,
    width: '100%',
    height: 20,
  },
  fadeOverlayWeb: {
    top: 166,
    height: 18,
    zIndex: 2,
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
  hotCardWeb: {
    minHeight: 84,
    marginHorizontal: 12,
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
  emptyFeed: {
    minHeight: 240,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  emptyFeedTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyFeedText: {
    color: c.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  emptyFeedButton: {
    marginTop: 6,
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primary,
  },
  emptyFeedButtonText: {
    color: c.onPrimary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
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
    ...(Platform.OS === 'web'
      ? { boxShadow: `0 3px 10px ${c.shadow}4D` }
      : {
          shadowColor: c.shadow,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
        }),
    elevation: 6,
  },
  fabWeb: {
    display: 'none',
  },
});
