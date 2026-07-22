import AppRefreshControl from '@/components/appRefreshControl';
import Post, { type PostType } from '@/components/postComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { mapPost, reusePostSnapshot, usePosts } from '@/context/postContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, type ListRenderItemInfo, Pressable, StyleSheet } from 'react-native';

const postKey = (post: PostType) => post.id;
const FOLLOWING_PAGE_SIZE = 20;

const FollowingRow = memo(function FollowingRow({ post }: { post: PostType }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/post/${post.id}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
    >
      <Post post={post} />
    </Pressable>
  );
});

const renderPost = ({ item }: ListRenderItemInfo<PostType>) => <FollowingRow post={item} />;

export default function FollowingFeed() {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { posts, setPosts } = usePosts();
  const [ids, setIds] = useState<string[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const idsRef = useRef<string[]>([]);
  const loadingMoreRef = useRef(false);

  const load = useCallback(async (reset: boolean) => {
    if (!reset && loadingMoreRef.current) return;
    if (!reset) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }
    try {
      const offset = reset ? 0 : idsRef.current.length;
      const rows = await api<any[]>(`/posts?feed=following&limit=${FOLLOWING_PAGE_SIZE}&offset=${offset}`);
      const mapped = rows.map(mapPost);
      setPosts((current) => {
        const nextById = new Map(current.map((post) => [post.id, post]));
        mapped.forEach((post) => nextById.set(post.id, reusePostSnapshot(nextById.get(post.id), post)));
        return Array.from(nextById.values());
      });
      const nextIds = reset
        ? mapped.map((post) => post.id)
        : [...new Set([...idsRef.current, ...mapped.map((post) => post.id)])];
      idsRef.current = nextIds;
      setIds(nextIds);
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
        setIds((current) => current ?? []);
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
  const followingPosts = useMemo(
    () => (ids ?? []).map((id) => postsById.get(id)).filter((post): post is PostType => !!post),
    [ids, postsById]
  );
  const loadMore = useCallback(() => {
    if (hasMore && !refreshing) {
      load(false).catch((error: any) => console.log('Error loading more following posts:', error?.message));
    }
  }, [hasMore, load, refreshing]);

  return (
    <ThemedView style={styles.screen}>
      <FlatList
        data={followingPosts}
        keyExtractor={postKey}
        renderItem={renderPost}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={followingPosts.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          ids === null ? (
            <ActivityIndicator color={c.primary} />
          ) : (
            <ThemedView style={styles.emptyCard}>
              <ThemedView style={styles.emptyIcon}>
                <IconSymbol name="person.2.fill" size={25} color={c.primary} />
              </ThemedView>
              <ThemedText style={styles.emptyTitle}>Your following feed is ready for people.</ThemedText>
              <ThemedText style={styles.emptyText}>
                Follow someone from their profile and their posts will collect here—without changing the perspective mix on Home.
              </ThemedText>
            </ThemedView>
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={c.icon} style={styles.footerLoader} /> : null}
      />
    </ThemedView>
  );
}

const makeStyles = (c: ReturnType<typeof usePalette>['c']) => StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingTop: 6, paddingBottom: 32 },
  emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyCard: { width: '100%', maxWidth: 420, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.card, padding: 22, alignItems: 'center' },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.accentSoftBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontWeight: '800', fontSize: 17, lineHeight: 22, textAlign: 'center' },
  emptyText: { color: c.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  footerLoader: { paddingVertical: 24 },
});
