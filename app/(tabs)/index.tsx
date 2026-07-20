import Article, { ArticleType } from '@/components/articleComponent';
import Carousel from '@/components/carousel';
import Post from '@/components/postComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/authContext';
import { usePosts } from '@/context/postContext';
import { api } from '@/lib/api';
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

  const { posts, refresh } = usePosts();

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
      await Promise.all([refresh(), fetchArticles(true), fetchHotTopics()]);
    } finally {
      setRefreshing(false);
      refreshInflight.current = false;
    }
  }, [refresh, fetchArticles, fetchHotTopics]);

  // Infinite scroll: page in more articles when the bottom nears
  const onEndReached = useCallback(async () => {
    if (loadingMore || refreshing || !hasMoreArticles) return;
    setLoadingMore(true);
    try {
      const added = await fetchArticles(false);
      // Appended pages join the END of the master order (shuffled among
      // themselves); every tab sees them below what it already showed.
      setMasterOrder((prev) => {
        const seen = new Set(prev.map((o) => o.id));
        const fresh = added
          .filter((a) => !seen.has(a.id))
          .map((a) => ({ kind: 'article' as const, id: a.id }));
        return [...prev, ...shuffle(fresh)];
      });
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, refreshing, hasMoreArticles, fetchArticles]);

  // Rebuild the master shuffle only when membership actually changes
  // (new data epoch or posts arriving) — NOT on tab switches, so every
  // tab keeps its sequence.
  const postIdsKey = posts.map((p) => p.id).join(',');
  useEffect(() => {
    const postEntries = postIdsKey === ''
      ? []
      : postIdsKey.split(',').map((id) => ({ kind: 'post' as const, id }));
    const articleEntries = articlesRef.current.map((a) => ({ kind: 'article' as const, id: a.id }));
    setMasterOrder(shuffle([...postEntries, ...articleEntries]));
  }, [postIdsKey, orderEpoch]);

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
            ) : !hasMoreArticles && feedItems.length > 0 ? (
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
                    { backgroundColor: pressed ? '#e9c8ffbf' : '#E9C8FF' },
                  ]}
                >
                  <ThemedText style={styles.hotCardText} numberOfLines={2}>
                    {item.title}
                  </ThemedText>
                  {/* Dots live inside the card so they sit on purple, not
                      on the fading white background */}
                  {hotTopics.length > 1 && (
                    <ThemedView style={styles.hotDots}>
                      {hotTopics.map((_, i) => (
                        <ThemedView
                          key={i}
                          style={[
                            styles.hotDot,
                            { backgroundColor: i === hotIndex ? '#9A00FF' : '#FFFFFF' },
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
            colors={[
              'rgba(255,255,255,1)',
              'rgba(255,255,255,0.6)',
              'rgba(255,255,255,0.25)',
              'rgba(255,255,255,0)',
            ]}
            locations={[0, 0.45, 0.75, 1]}
            style={styles.fadeOverlay}
            pointerEvents="none"
          />
        )}
        <ThemedView style={styles.header}>
          <Pressable
            onPress={() => setActiveTab('For You')}
            style={{
              padding: 10,
              borderBottomLeftRadius: activeTab === 'For You' ? 4 : 0,
              borderBottomRightRadius: activeTab === 'For You' ? 4 : 0,
              borderBottomWidth: 4,
              borderBottomColor: activeTab === 'For You' ? '#B647FF' : 'white',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 54,
              width: screenWidth / 3,
            }}
          >
            <ThemedText type="subtitle" lightColor={activeTab === 'For You' ? 'black' : '#8D8D8D'}>For You</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('Random')}
            style={{
              padding: 10,
              borderBottomLeftRadius: activeTab === 'Random' ? 4 : 0,
              borderBottomRightRadius: activeTab === 'Random' ? 4 : 0,
              borderBottomWidth: 4,
              borderBottomColor: activeTab === 'Random' ? '#B647FF' : 'white',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 54,
              width: screenWidth / 3,
            }}
          >
            <ThemedText type="subtitle" lightColor={activeTab === 'Random' ? 'black' : '#8D8D8D'}>Random</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('Against You')}
            style={{
              padding: 10,
              borderBottomLeftRadius: activeTab === 'Against You' ? 4 : 0,
              borderBottomRightRadius: activeTab === 'Against You' ? 4 : 0,
              borderBottomWidth: 4,
              borderBottomColor: activeTab === 'Against You' ? '#B647FF' : 'white',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 54,
              width: screenWidth / 3,
            }}
          >
            <ThemedText type="subtitle" lightColor={activeTab === 'Against You' ? 'black' : '#8D8D8D'}>Against You</ThemedText>
          </Pressable>
        </ThemedView>
        {/* Floating create-post button */}
        <Pressable
          onPress={() => router.push('/createpost')}
          style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.85 : 1 }]}
        >
          <IconSymbol name="plus" size={28} color="#FFFFFF" />
        </Pressable>
      </ThemedView>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    position: 'absolute',
    width: screenWidth,
    height: 104,
    borderColor: "#c6c6c6ff",
    borderBottomWidth: 1,
  },
  hotBar: {
    position: 'absolute',
    top: 104,
    width: screenWidth,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: 'white',
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
    color: '#7A1FA8',
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
    color: '#8D8D8D',
    paddingVertical: 24,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#B647FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
});
