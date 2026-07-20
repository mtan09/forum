import Article, { ArticleType } from '@/components/articleComponent';
import Post from '@/components/postComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { mapPost } from '@/context/postContext';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

type SearchResults = {
  users: { id: string; username: string; avatar_url: string | null; bio: string | null }[];
  sources: { name: string; lean: number | null; articles: number }[];
  posts: any[];
  articles: ArticleType[];
};

const EMPTY: SearchResults = { users: [], sources: [], posts: [], articles: [] };

function leanTag(lean: number | null) {
  if (lean == null) return null;
  if (lean < 0.4) return { label: 'Left', color: '#2563EB', bg: '#E8F0FE' };
  if (lean > 0.6) return { label: 'Right', color: '#DC2626', bg: '#FDE8E8' };
  return { label: 'Center', color: '#6B7280', bg: '#F1F1F3' };
}

export default function SearchTab() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search-as-you-type
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        setResults(await api<SearchResults>(`/search?q=${encodeURIComponent(q)}`));
      } catch (err: any) {
        console.log('Search error:', err?.message);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const hasAny =
    results.users.length + results.sources.length + results.posts.length + results.articles.length > 0;

  return (
    <ThemedView style={styles.screen}>
      {/* Search box */}
      <ThemedView style={styles.searchBox}>
        <IconSymbol name="magnifyingglass" size={18} color="#8D8D8D" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search posts, articles, sources, people..."
          placeholderTextColor="#8f8f8f"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(''); Keyboard.dismiss(); }} hitSlop={8}>
            <IconSymbol name="x.circle.fill" size={18} color="#C6C6C6" />
          </Pressable>
        )}
      </ThemedView>

      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {loading && <ActivityIndicator style={{ marginTop: 24 }} color="#B647FF" />}

        {!loading && query.trim().length >= 2 && !hasAny && (
          <ThemedText style={styles.emptyText}>No results for “{query.trim()}”.</ThemedText>
        )}

        {!loading && query.trim().length < 2 && (
          <ThemedText style={styles.emptyText}>
            Search everything on the forum — posts, articles, #hashtags, news sources, and people.
          </ThemedText>
        )}

        {results.sources.length > 0 && (
          <>
            <ThemedText style={styles.sectionHeader}>Sources</ThemedText>
            {results.sources.map((s) => {
              const tag = leanTag(s.lean);
              return (
                <Pressable
                  key={s.name}
                  onPress={() => router.push(`/source/${encodeURIComponent(s.name)}`)}
                  style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <ThemedText type="defaultSemiBold" style={styles.rowTitle}>{s.name}</ThemedText>
                  <ThemedView style={styles.rowRight}>
                    {tag && (
                      <ThemedView style={[styles.tag, { backgroundColor: tag.bg }]}>
                        <ThemedText style={[styles.tagText, { color: tag.color }]}>{tag.label}</ThemedText>
                      </ThemedView>
                    )}
                    <ThemedText style={styles.rowMeta}>{s.articles} articles</ThemedText>
                  </ThemedView>
                </Pressable>
              );
            })}
          </>
        )}

        {results.users.length > 0 && (
          <>
            <ThemedText style={styles.sectionHeader}>People</ThemedText>
            {results.users.map((u) => (
              <Pressable
                key={u.id}
                onPress={() => router.push(`/user/${u.id}`)}
                style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
              >
                <ThemedView style={styles.userCell}>
                  <Image
                    source={u.avatar_url ? { uri: u.avatar_url } : require('@/assets/images/Default_pfp.jpg')}
                    style={styles.userAvatar}
                  />
                  <ThemedView style={{ flexShrink: 1 }}>
                    <ThemedText type="defaultSemiBold" style={styles.rowTitle}>{u.username}</ThemedText>
                    {u.bio ? <ThemedText style={styles.rowMeta} numberOfLines={1}>{u.bio}</ThemedText> : null}
                  </ThemedView>
                </ThemedView>
              </Pressable>
            ))}
          </>
        )}

        {results.posts.length > 0 && (
          <>
            <ThemedText style={styles.sectionHeader}>Posts</ThemedText>
            {results.posts.map((row) => {
              const post = mapPost(row);
              return (
                <Pressable
                  key={post.id}
                  onPress={() => router.push(`/post/${post.id}`)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
                >
                  <Post post={post} />
                </Pressable>
              );
            })}
          </>
        )}

        {results.articles.length > 0 && (
          <>
            <ThemedText style={styles.sectionHeader}>Articles</ThemedText>
            {results.articles.map((article) => (
              <Pressable
                key={article.id}
                onPress={() => router.push(`/article/${article.id}`)}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
              >
                <Article article={article} />
              </Pressable>
            ))}
          </>
        )}
        <ThemedView style={{ height: 32 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 88,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E9C8FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 0,
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 4,
    marginLeft: 16,
    fontSize: 13,
    fontWeight: '800',
    color: '#8D8D8D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4DCFF',
    gap: 8,
  },
  rowTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowMeta: {
    color: '#8D8D8D',
    fontSize: 13,
  },
  tag: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
  userCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8D8D8D',
    marginTop: 32,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
