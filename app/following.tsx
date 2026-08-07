import AppRefreshControl from '@/components/appRefreshControl';
import Article, { type ArticleType } from '@/components/articleComponent';
import Post, { type PostType } from '@/components/postComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { mapPost, reusePostSnapshot, usePosts } from '@/context/postContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { mapRepostAttribution } from '@/lib/quoted-content';
import type { RepostAttribution } from '@/types/quoted-content';
import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, type ListRenderItemInfo, Platform, Pressable, StyleSheet } from 'react-native';
import { tapLight } from '@/lib/haptics';

// The feed carries posts the followed accounts wrote plus posts and articles
// they reposted, so rows are mixed and keyed by kind as well as id.
type FollowingItem =
  | { kind: 'post'; id: string; postId: string; repostAttribution: RepostAttribution | null }
  | { kind: 'article'; id: string; article: ArticleType; repostAttribution: RepostAttribution | null };

const itemKey = (item: FollowingItem) => item.id;
const FOLLOWING_PAGE_SIZE = 20;

const FollowingPostRow = memo(function FollowingPostRow({
  post,
  repostAttribution,
}: {
  post: PostType;
  repostAttribution: RepostAttribution | null;
}) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => { tapLight(); router.push(`/post/${post.id}`); }}
      style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
    >
      <Post post={post} repostAttribution={repostAttribution} />
    </Pressable>
  );
});

const FollowingArticleRow = memo(function FollowingArticleRow({
  article,
  repostAttribution,
}: {
  article: ArticleType;
  repostAttribution: RepostAttribution | null;
}) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => { tapLight(); router.push(`/article/${article.id}`); }}
      style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
    >
      <Article article={article} repostAttribution={repostAttribution} />
    </Pressable>
  );
});

export default function FollowingFeed() {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { posts, setPosts } = usePosts();
  const [items, setItems] = useState<FollowingItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const itemsRef = useRef<FollowingItem[]>([]);
  const loadingMoreRef = useRef(false);

  const load = useCallback(async (reset: boolean) => {
    if (!reset && loadingMoreRef.current) return;
    if (!reset) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }
    try {
      const offset = reset ? 0 : itemsRef.current.length;
      const rows = await api<any[]>(`/feed/following?limit=${FOLLOWING_PAGE_SIZE}&offset=${offset}`);

      // Posts live in the shared context so votes and bookmarks stay in sync
      // with the other feeds; articles are held on the row itself.
      const mappedPosts = rows.filter((row) => row.kind === 'post').map((row) => mapPost(row.data));
      if (mappedPosts.length > 0) {
        setPosts((current) => {
          const nextById = new Map(current.map((post) => [post.id, post]));
          mappedPosts.forEach((post) => nextById.set(post.id, reusePostSnapshot(nextById.get(post.id), post)));
          return Array.from(nextById.values());
        });
      }

      const mapped: FollowingItem[] = rows.map((row) =>
        row.kind === 'post'
          ? {
              kind: 'post',
              id: `p-${row.data.id}`,
              postId: String(row.data.id),
              repostAttribution: mapRepostAttribution(row.data),
            }
          : {
              kind: 'article',
              id: `a-${row.data.id}`,
              article: row.data as ArticleType,
              repostAttribution: mapRepostAttribution(row.data),
            }
      );

      const next = reset ? mapped : [...itemsRef.current, ...mapped];
      const seen = new Set<string>();
      const deduped = next.filter((item) => (seen.has(item.id) ? false : seen.add(item.id)));
      itemsRef.current = deduped;
      setItems(deduped);
      setHasMore(rows.length === FOLLOWING_PAGE_SIZE);
    } finally {
      if (!reset) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [setPosts]);

  useFocusEffect(
    useCallback(() => {
      load(true).catch((error: any) => {
        console.log('Error loading following feed:', error?.message);
        setItems((current) => current ?? []);
      });
    }, [load])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load(true);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const postsById = useMemo(() => new Map(posts.map((post) => [post.id, post])), [posts]);
  const rows = useMemo(
    () =>
      (items ?? []).filter((item) => item.kind === 'article' || postsById.has(item.postId)),
    [items, postsById]
  );
  const renderRow = useCallback(
    ({ item }: ListRenderItemInfo<FollowingItem>) =>
      item.kind === 'post' ? (
        <FollowingPostRow post={postsById.get(item.postId)!} repostAttribution={item.repostAttribution} />
      ) : (
        <FollowingArticleRow article={item.article} repostAttribution={item.repostAttribution} />
      ),
    [postsById]
  );
  const loadMore = useCallback(() => {
    // FlatList fires onEndReached once on mount, while the list is still empty
    // and the first page is in flight. Without this guard that kicks off a
    // second request at offset 0 and renders the footer spinner underneath the
    // empty-state spinner — two indicators at once for the same load.
    if (items === null) return;
    if (hasMore && !refreshing) {
      load(false).catch((error: any) => console.log('Error loading more following posts:', error?.message));
    }
  }, [hasMore, items, load, refreshing]);

  return (
    <ThemedView style={styles.page}>
      <ThemedView style={styles.screen}>
        <FlatList
        data={rows}
        showsVerticalScrollIndicator={false}
        keyExtractor={itemKey}
        renderItem={renderRow}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={Platform.OS === 'web' ? undefined : <AppRefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={rows.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          items === null ? (
            <ActivityIndicator color={c.primary} />
          ) : (
            <ThemedView style={styles.emptyCard}>
              <ThemedView style={styles.emptyIcon}>
                <IconSymbol name="person.2.fill" size={25} color={c.primary} />
              </ThemedView>
              <ThemedText style={styles.emptyTitle}>Your following feed is ready for people.</ThemedText>
              <ThemedText style={styles.emptyText}>
                Follow someone from their profile and what they post and repost will collect here—without changing the perspective mix on Home.
              </ThemedText>
            </ThemedView>
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={c.icon} style={styles.footerLoader} /> : null}
        />
      </ThemedView>
    </ThemedView>
  );
}

const makeStyles = (c: ReturnType<typeof usePalette>['c']) => StyleSheet.create({
  // The shell already supplies the centred column, background, and hairlines;
  // framing again here nested a rounded card inside it.
  page: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: c.background,
  },
  screen: {
    flex: 1,
    width: '100%',
    backgroundColor: c.background,
    overflow: 'hidden',
  },
  listContent: { paddingTop: 6, paddingBottom: 32 },
  emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyCard: { width: '100%', maxWidth: 420, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.card, padding: 22, alignItems: 'center' },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.accentSoftBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontWeight: '800', fontSize: 17, lineHeight: 22, textAlign: 'center' },
  emptyText: { color: c.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  footerLoader: { paddingVertical: 24 },
});
