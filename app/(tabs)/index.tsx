import Article, { ArticleType } from '@/components/articleComponent';
import AppRefreshControl from '@/components/appRefreshControl';
import Carousel from '@/components/carousel';
import Post, { type PostType } from '@/components/postComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { useFeedPreference } from '@/context/feedPreferenceContext';
import { mapPost, reusePostSnapshot, usePosts } from '@/context/postContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { getDisplayableArticleMedia } from '@/lib/article-media';
import { mapRepostAttribution } from '@/lib/quoted-content';
import type { RepostAttribution } from '@/types/quoted-content';
import {
  createFeedSessionId,
  flushFeedEvents,
  queueFeedEvent,
  type FeedMode,
  type RecommendationContext,
} from '@/lib/feed-events';
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
  | { kind: 'post'; id: string; data: PostType; recommendationContext: RecommendationContext; reason: string; repostAttribution?: RepostAttribution | null }
  | { kind: 'article'; id: string; data: ArticleType; recommendationContext: RecommendationContext; reason: string; repostAttribution?: RepostAttribution | null };

const feedItemKey = (item: FeedItem) => item.id;
const FEED_VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };

const FeedRow = memo(function FeedRow({ item }: { item: FeedItem }) {
  const router = useRouter();
  if (item.kind === 'post') {
    return (
      <Pressable
        onPress={() => {
          queueFeedEvent({
            ...item.recommendationContext,
            itemType: 'post',
            itemId: item.data.id,
            eventType: 'open',
          });
          router.push(`/post/${item.data.id}`);
        }}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
      >
        <Post post={item.data} recommendationContext={item.recommendationContext} repostAttribution={item.repostAttribution} />
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={() => {
        queueFeedEvent({
          ...item.recommendationContext,
          itemType: 'article',
          itemId: item.data.id,
          eventType: 'open',
        });
        const params = new URLSearchParams({
          feed_session: item.recommendationContext.sessionId,
          feed_algorithm: item.recommendationContext.algorithmVersion,
          feed_mode: item.recommendationContext.feedMode,
          feed_position: String(item.recommendationContext.position ?? 0),
        });
        router.push(`/article/${item.data.id}?${params.toString()}`);
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
    >
      <Article article={item.data} recommendationContext={item.recommendationContext} repostAttribution={item.repostAttribution} />
    </Pressable>
  );
}, (previous, next) =>
  previous.item.id === next.item.id &&
  previous.item.data === next.item.data &&
  previous.item.repostAttribution?.userId === next.item.repostAttribution?.userId &&
  previous.item.repostAttribution?.repostedAt === next.item.repostAttribution?.repostedAt &&
  previous.item.recommendationContext.sessionId === next.item.recommendationContext.sessionId
);

const renderFeedItem = ({ item }: ListRenderItemInfo<FeedItem>) => <FeedRow item={item} />;

const FEED_PAGE_SIZE = 20;
type FeedTab = 'For You' | 'Random' | 'Against You';
type FeedApiResponse = {
  algorithm_version: string;
  session_id: string;
  items: { kind: 'post' | 'article'; data: any; recommendation_reason: string }[];
  next_cursor: string | null;
};
type TabFeedState = {
  items: FeedItem[];
  cursor: string | null;
  loaded: boolean;
  loadingMore: boolean;
};
const emptyTabState = (): TabFeedState => ({ items: [], cursor: null, loaded: false, loadingMore: false });
const tabMode = (tab: FeedTab): FeedMode =>
  tab === 'For You' ? 'for_you' : tab === 'Against You' ? 'against' : 'random';

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
  const { posts, setPosts } = usePosts();

  const scrollY = useRef(new Animated.Value(0)).current;

  const [activeTab, setActiveTab] = useState<FeedTab>('Random');

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

  const [tabFeeds, setTabFeeds] = useState<Record<FeedTab, TabFeedState>>({
    'For You': emptyTabState(),
    Random: emptyTabState(),
    'Against You': emptyTabState(),
  });
  const tabFeedsRef = useRef(tabFeeds);
  useEffect(() => { tabFeedsRef.current = tabFeeds; }, [tabFeeds]);
  const sessions = useRef<Record<FeedTab, string>>({
    'For You': createFeedSessionId(),
    Random: createFeedSessionId(),
    'Against You': createFeedSessionId(),
  });
  const loadingTabs = useRef(new Map<FeedTab, number>());
  const feedGeneration = useRef(0);

  const loadFeed = useCallback(async (tab: FeedTab, reset: boolean) => {
    const generation = feedGeneration.current;
    if (loadingTabs.current.get(tab) === generation) return;
    const current = tabFeedsRef.current[tab];
    if (!reset && !current.cursor) return;
    loadingTabs.current.set(tab, generation);
    if (reset) sessions.current[tab] = createFeedSessionId();
    setTabFeeds((state) => ({
      ...state,
      [tab]: { ...state[tab], loadingMore: !reset },
    }));
    try {
      const cursor = reset ? null : current.cursor;
      const params = new URLSearchParams({
        mode: tabMode(tab),
        content: feedContentPreference,
        limit: String(FEED_PAGE_SIZE),
        session_id: sessions.current[tab],
      });
      if (cursor) params.set('cursor', cursor);
      const response = await api<FeedApiResponse>(`/feed?${params.toString()}`);
      if (generation !== feedGeneration.current) return;
      sessions.current[tab] = response.session_id;
      const start = reset ? 0 : current.items.length;
      const mappedPosts: PostType[] = [];
      const nextItems = response.items.map((entry, index): FeedItem => {
        const recommendationContext: RecommendationContext = {
          sessionId: response.session_id,
          algorithmVersion: response.algorithm_version,
          feedMode: tabMode(tab),
          position: start + index,
        };
        if (entry.kind === 'post') {
          const data = mapPost(entry.data);
          mappedPosts.push(data);
          return {
            kind: 'post',
            id: `p-${data.id}`,
            data,
            recommendationContext,
            reason: entry.recommendation_reason,
            repostAttribution: mapRepostAttribution(entry.data),
          };
        }
        const data = entry.data as ArticleType;
        return {
          kind: 'article',
          id: `a-${data.id}`,
          data,
          recommendationContext,
          reason: entry.recommendation_reason,
          repostAttribution: mapRepostAttribution(entry.data),
        };
      });
      if (mappedPosts.length > 0) {
        setPosts((existing) => {
          const byId = new Map(existing.map((post) => [post.id, post]));
          mappedPosts.forEach((post) => byId.set(post.id, reusePostSnapshot(byId.get(post.id), post)));
          return Array.from(byId.values());
        });
      }
      setTabFeeds((state) => {
        const previous = reset ? [] : state[tab].items;
        const seen = new Set(previous.map((item) => item.id));
        return {
          ...state,
          [tab]: {
            items: [...previous, ...nextItems.filter((item) => !seen.has(item.id))],
            cursor: response.next_cursor,
            loaded: true,
            loadingMore: false,
          },
        };
      });
    } catch (err: any) {
      if (generation !== feedGeneration.current) return;
      console.log('Error loading personalized feed:', err?.message);
      setTabFeeds((state) => ({
        ...state,
        [tab]: { ...state[tab], loaded: true, loadingMore: false },
      }));
    } finally {
      if (loadingTabs.current.get(tab) === generation) loadingTabs.current.delete(tab);
    }
  }, [feedContentPreference, setPosts]);

  useEffect(() => {
    if (!tabFeeds[activeTab].loaded) void loadFeed(activeTab, true);
  }, [activeTab, loadFeed, tabFeeds]);

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
      await Promise.all([
        loadFeed(activeTab, true),
        fetchHotTopics(),
      ]);
    } finally {
      setRefreshing(false);
      refreshInflight.current = false;
    }
  }, [activeTab, fetchHotTopics, loadFeed]);

  const onPullRefresh = useCallback(async () => {
    // A fast request can finish while the list is still held past the
    // refresh threshold. Keep the gesture latched until a new drag begins
    // so native refresh controls cannot fire repeatedly for one pull.
    if (refreshTriggeredThisDrag.current) return;
    refreshTriggeredThisDrag.current = true;
    await refreshFeed();
  }, [refreshFeed]);

  const onEndReached = useCallback(() => {
    if (!refreshing) void loadFeed(activeTab, false);
  }, [activeTab, loadFeed, refreshing]);

  const currentFeed = tabFeeds[activeTab];
  const postsById = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);
  const feedItems = useMemo<FeedItem[]>(() => currentFeed.items.map((item) =>
    item.kind === 'post'
      ? { ...item, data: postsById.get(item.data.id) ?? item.data }
      : item
  ), [currentFeed.items, postsById]);
  const feedItemsRef = useRef(feedItems);
  useEffect(() => { feedItemsRef.current = feedItems; }, [feedItems]);

  const visibleStarted = useRef(new Map<string, { startedAt: number; item: FeedItem }>());
  const impressed = useRef(new Set<string>());
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<FeedItem>[] }) => {
    const now = Date.now();
    const visibleKeys = new Set(viewableItems.map((token) => token.item.id));
    for (const [key, visible] of visibleStarted.current) {
      if (!visibleKeys.has(key)) {
        const dwellMs = now - visible.startedAt;
        if (dwellMs >= 750) {
          queueFeedEvent({
            ...visible.item.recommendationContext,
            itemType: visible.item.kind,
            itemId: visible.item.data.id,
            eventType: 'dwell',
            dwellMs,
          });
        }
        visibleStarted.current.delete(key);
      }
    }
    for (const token of viewableItems) {
      const item = token.item;
      const impressionKey = `${item.recommendationContext.sessionId}:${item.id}`;
      if (!visibleStarted.current.has(item.id)) {
        visibleStarted.current.set(item.id, { startedAt: now, item });
      }
      if (!impressed.current.has(impressionKey)) {
        impressed.current.add(impressionKey);
        queueFeedEvent({
          ...item.recommendationContext,
          position: token.index ?? item.recommendationContext.position,
          itemType: item.kind,
          itemId: item.data.id,
          eventType: 'impression',
        });
      }
    }
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

  useEffect(() => () => {
    const now = Date.now();
    for (const visible of visibleStarted.current.values()) {
      const dwellMs = now - visible.startedAt;
      if (dwellMs >= 750) {
        queueFeedEvent({
          ...visible.item.recommendationContext,
          itemType: visible.item.kind,
          itemId: visible.item.data.id,
          eventType: 'dwell',
          dwellMs,
        });
      }
    }
    visibleStarted.current.clear();
    void flushFeedEvents();
  }, []);

  const listRef = useRef<FlatList<FeedItem>>(null);

  // A content-type change creates a different timeline. Reset every tab's
  // saved offset so returning from Settings cannot land beyond the new list.
  useEffect(() => {
    feedGeneration.current += 1;
    scrollOffsets.current = {};
    setTabFeeds({
      'For You': emptyTabState(),
      Random: emptyTabState(),
      'Against You': emptyTabState(),
    });
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
            currentFeed.loadingMore ? (
              <ActivityIndicator style={{ paddingVertical: 24 }} />
            ) : currentFeed.loaded && !currentFeed.cursor && feedItems.length > 0 ? (
              <ThemedText style={styles.feedEnd}>You&apos;re all caught up</ThemedText>
            ) : null
          }
          ListEmptyComponent={
            <ThemedView style={styles.emptyFeed}>
              {!currentFeed.loaded ? (
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
