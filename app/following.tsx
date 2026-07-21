import Post, { type PostType } from '@/components/postComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { mapPost, usePosts } from '@/context/postContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';

export default function FollowingFeed() {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { posts, setPosts } = usePosts();
  const [ids, setIds] = useState<string[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const rows = await api<any[]>('/posts?feed=following&limit=100');
    const mapped = rows.map(mapPost);
    setPosts((current) => {
      const nextById = new Map(current.map((post) => [post.id, post]));
      mapped.forEach((post) => nextById.set(post.id, post));
      return Array.from(nextById.values());
    });
    setIds(mapped.map((post) => post.id));
  }, [setPosts]);

  useFocusEffect(
    useCallback(() => {
      load().catch((error: any) => {
        console.log('Error loading following feed:', error?.message);
        setIds((current) => current ?? []);
      });
    }, [load])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const postsById = useMemo(() => new Map(posts.map((post) => [post.id, post])), [posts]);
  const followingPosts = useMemo(
    () => (ids ?? []).map((id) => postsById.get(id)).filter((post): post is PostType => !!post),
    [ids, postsById]
  );

  return (
    <ThemedView style={styles.screen}>
      <FlatList
        data={followingPosts}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/post/${item.id}`)}
            style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
          >
            <Post post={item} />
          </Pressable>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} colors={[c.primary]} />}
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
});
