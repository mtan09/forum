import Article, { ArticleType } from '@/components/articleComponent';
import Post from '@/components/postComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { mapPost } from '@/context/postContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { getPerspectiveToneForPosition } from '@/lib/perspective-colors';
import { onTabRefresh } from '@/lib/tabRefresh';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

type SearchResults = {
  users: { id: string; username: string; avatar_url: string | null; bio: string | null }[];
  sources: { name: string; lean: number | null; articles: number }[];
  posts: any[];
  articles: ArticleType[];
};

type ResultFilter = 'All' | 'Stories' | 'People' | 'Sources';

type HotTopic = {
  title?: unknown;
};

const EMPTY: SearchResults = { users: [], sources: [], posts: [], articles: [] };
const FALLBACK_QUICK_TOPICS = ['The economy', 'Immigration', 'Climate policy', 'Housing costs', 'Elections'];

export default function SearchTab() {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ResultFilter>('All');
  const [quickTopics, setQuickTopics] = useState(FALLBACK_QUICK_TOPICS);
  const [hasLiveTopics, setHasLiveTopics] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const searchRef = useRef<TextInput>(null);

  const fetchQuickTopics = useCallback(async () => {
    try {
      const payload = await api<HotTopic[]>('/topics/hot?limit=5');
      const titles = Array.isArray(payload)
        ? [...new Set(payload.flatMap((topic) => typeof topic?.title === 'string' ? [topic.title.trim()] : []).filter(Boolean))].slice(0, 5)
        : [];

      if (titles.length > 0) {
        setQuickTopics(titles);
        setHasLiveTopics(true);
      } else {
        setQuickTopics(FALLBACK_QUICK_TOPICS);
        setHasLiveTopics(false);
      }
    } catch (err: any) {
      // Keep stable suggestions available when live topic retrieval fails.
      console.warn('[search] hot topics unavailable:', err?.message);
      setQuickTopics(FALLBACK_QUICK_TOPICS);
      setHasLiveTopics(false);
    }
  }, []);

  useEffect(() => {
    fetchQuickTopics();
  }, [fetchQuickTopics]);

  useEffect(() => onTabRefresh('search', () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    fetchQuickTopics();
  }), [fetchQuickTopics]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      setSearchError(null);
      setActiveFilter('All');
      return;
    }

    setLoading(true);
    setSearchError(null);
    debounceRef.current = setTimeout(async () => {
      try {
        const payload = await api<Partial<SearchResults>>(`/search?q=${encodeURIComponent(q)}`);
        // A partial or malformed response should become an empty section,
        // never a render-time `.length`/`.map` crash.
        setResults({
          users: Array.isArray(payload?.users) ? payload.users : [],
          sources: Array.isArray(payload?.sources) ? payload.sources : [],
          posts: Array.isArray(payload?.posts) ? payload.posts : [],
          articles: Array.isArray(payload?.articles) ? payload.articles : [],
        });
      } catch (err: any) {
        console.warn('[search] request failed:', err?.message);
        setResults(EMPTY);
        setSearchError('Search is unavailable right now. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const trimmedQuery = query.trim();
  const storyCount = results.posts.length + results.articles.length;
  const totalCount = storyCount + results.users.length + results.sources.length;
  const hasQuery = trimmedQuery.length >= 2;
  const showStories = activeFilter === 'All' || activeFilter === 'Stories';
  const showPeople = activeFilter === 'All' || activeFilter === 'People';
  const showSources = activeFilter === 'All' || activeFilter === 'Sources';
  const filters: { label: ResultFilter; count: number }[] = [
    { label: 'All', count: totalCount },
    { label: 'Stories', count: storyCount },
    { label: 'People', count: results.users.length },
    { label: 'Sources', count: results.sources.length },
  ];
  const filteredCount = filters.find((filter) => filter.label === activeFilter)?.count ?? 0;

  const chooseTopic = (topic: string) => {
    setQuery(topic);
    setActiveFilter('All');
    searchRef.current?.focus();
  };

  const clearSearch = () => {
    setQuery('');
    setActiveFilter('All');
    Keyboard.dismiss();
  };

  return (
    <ThemedView style={styles.screen}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>Discover</ThemedText>
        <ThemedText style={styles.subtitle}>Search the whole conversation.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.searchShell}>
        <ThemedView style={styles.searchIcon}>
          <IconSymbol name="magnifyingglass" size={19} color={c.primary} />
        </ThemedView>
        <TextInput
          ref={searchRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Topic, person, source, or #hashtag"
          placeholderTextColor={c.muted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={clearSearch} hitSlop={8}>
            <IconSymbol name="x.circle.fill" size={19} color={c.faint} />
          </Pressable>
        )}
      </ThemedView>

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {!hasQuery ? (
          <>
            <ThemedView style={styles.topicSection}>
              <ThemedView style={styles.sectionTitleRow}>
                <ThemedText style={styles.sectionTitle}>Start with a topic</ThemedText>
                <ThemedText style={styles.sectionMeta}>{hasLiveTopics ? 'Trending now' : 'Suggested'}</ThemedText>
              </ThemedView>
              <ThemedView style={styles.topicGrid}>
                {quickTopics.map((topic, index) => (
                  <Pressable
                    key={topic}
                    onPress={() => chooseTopic(topic)}
                    style={({ pressed }) => [styles.topicChip, index === 0 && styles.topicChipFeatured, { opacity: pressed ? 0.65 : 1 }]}
                  >
                    <ThemedText numberOfLines={2} style={[styles.topicText, index === 0 && styles.topicTextFeatured]}>{topic}</ThemedText>
                    <IconSymbol name="arrow.up.right" size={14} color={index === 0 ? c.onPrimary : c.primary} />
                  </Pressable>
                ))}
              </ThemedView>
            </ThemedView>
          </>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {filters.map((filter) => {
                const selected = filter.label === activeFilter;
                return (
                  <Pressable
                    key={filter.label}
                    onPress={() => setActiveFilter(filter.label)}
                    style={[styles.filterChip, selected && styles.filterChipSelected]}
                  >
                    <ThemedText style={[styles.filterText, selected && styles.filterTextSelected]}>{filter.label}</ThemedText>
                    {!loading && (
                      <ThemedView style={[styles.filterCount, selected && styles.filterCountSelected]}>
                        <ThemedText style={[styles.filterCountText, selected && styles.filterCountTextSelected]}>{filter.count}</ThemedText>
                      </ThemedView>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <ThemedView style={styles.resultSummary}>
              <ThemedView>
                <ThemedText style={styles.resultEyebrow}>{loading ? 'SEARCHING FOR' : `${filteredCount} ${activeFilter.toUpperCase()} RESULT${filteredCount === 1 ? '' : 'S'}`}</ThemedText>
                <ThemedText style={styles.resultQuery}>“{trimmedQuery}”</ThemedText>
              </ThemedView>
              {loading && <ActivityIndicator color={c.primary} />}
            </ThemedView>

            {!loading && filteredCount === 0 && (
              <ThemedView style={styles.emptyCard}>
                <ThemedView style={styles.emptyMark}>
                  <IconSymbol name="magnifyingglass" size={25} color={c.primary} />
                </ThemedView>
                <ThemedText style={styles.emptyTitle}>{searchError ? 'Search could not connect' : 'Nothing in this lane yet'}</ThemedText>
                <ThemedText style={styles.emptyText}>{searchError ?? 'Try a broader phrase, another spelling, or switch back to All results.'}</ThemedText>
              </ThemedView>
            )}

            {!loading && showSources && results.sources.length > 0 && (
              <ThemedView style={styles.resultSection}>
                <ThemedView style={styles.sectionTitleRow}>
                  <ThemedText style={styles.sectionTitle}>Sources</ThemedText>
                  <ThemedText style={styles.sectionMeta}>{results.sources.length}</ThemedText>
                </ThemedView>
                <ThemedView style={styles.resultGroup}>
                  {results.sources.map((source, index) => {
                    const tag = getPerspectiveToneForPosition(source.lean, c);
                    return (
                      <Pressable
                        key={source.name}
                        onPress={() => router.push(`/source/${encodeURIComponent(source.name)}`)}
                        style={({ pressed }) => [styles.resultRow, index > 0 && styles.resultRowDivider, { opacity: pressed ? 0.6 : 1 }]}
                      >
                        <ThemedView style={styles.sourceMark}>
                          <IconSymbol name="newspaper.fill" size={18} color={c.primary} />
                        </ThemedView>
                        <ThemedView style={styles.rowCopy}>
                          <ThemedText style={styles.rowTitle}>{source.name}</ThemedText>
                          <ThemedText style={styles.rowMeta}>{source.articles} matching articles</ThemedText>
                        </ThemedView>
                        {tag && (
                          <ThemedView style={[styles.leanTag, { backgroundColor: tag.background }]}>
                            <ThemedText style={[styles.leanTagText, { color: tag.color }]}>{tag.label}</ThemedText>
                          </ThemedView>
                        )}
                        <IconSymbol name="chevron.right" size={17} color={c.faint} />
                      </Pressable>
                    );
                  })}
                </ThemedView>
              </ThemedView>
            )}

            {!loading && showPeople && results.users.length > 0 && (
              <ThemedView style={styles.resultSection}>
                <ThemedView style={styles.sectionTitleRow}>
                  <ThemedText style={styles.sectionTitle}>People</ThemedText>
                  <ThemedText style={styles.sectionMeta}>{results.users.length}</ThemedText>
                </ThemedView>
                <ThemedView style={styles.resultGroup}>
                  {results.users.map((user, index) => (
                    <Pressable
                      key={user.id}
                      onPress={() => router.push(`/user/${user.id}`)}
                      style={({ pressed }) => [styles.resultRow, index > 0 && styles.resultRowDivider, { opacity: pressed ? 0.6 : 1 }]}
                    >
                      <Image source={user.avatar_url ? { uri: user.avatar_url } : require('@/assets/images/Default_pfp.jpg')} style={styles.userAvatar} />
                      <ThemedView style={styles.rowCopy}>
                        <ThemedText style={styles.rowTitle}>{user.username}</ThemedText>
                        <ThemedText style={styles.rowMeta} numberOfLines={1}>{user.bio || 'forum community member'}</ThemedText>
                      </ThemedView>
                      <IconSymbol name="chevron.right" size={17} color={c.faint} />
                    </Pressable>
                  ))}
                </ThemedView>
              </ThemedView>
            )}

            {!loading && showStories && results.posts.length > 0 && (
              <ThemedView style={styles.storySection}>
                <ThemedView style={styles.storyHeading}>
                  <ThemedText style={styles.sectionTitle}>Community posts</ThemedText>
                  <ThemedText style={styles.sectionMeta}>{results.posts.length}</ThemedText>
                </ThemedView>
                {results.posts.map((row) => {
                  const post = mapPost(row);
                  return (
                    <Pressable key={post.id} onPress={() => router.push(`/post/${post.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                      <Post post={post} />
                    </Pressable>
                  );
                })}
              </ThemedView>
            )}

            {!loading && showStories && results.articles.length > 0 && (
              <ThemedView style={styles.storySection}>
                <ThemedView style={styles.storyHeading}>
                  <ThemedText style={styles.sectionTitle}>Reporting</ThemedText>
                  <ThemedText style={styles.sectionMeta}>{results.articles.length}</ThemedText>
                </ThemedView>
                {results.articles.map((article) => (
                  <Pressable key={article.id} onPress={() => router.push(`/article/${article.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                    <Article article={article} />
                  </Pressable>
                ))}
              </ThemedView>
            )}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, paddingTop: 88 },
  header: { paddingHorizontal: 16, backgroundColor: 'transparent' },
  title: { color: c.primary },
  subtitle: { color: c.muted, marginTop: 3, marginBottom: 8, fontSize: 14, lineHeight: 20 },
  searchShell: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9, marginHorizontal: 16, marginTop: 18, marginBottom: 5, borderWidth: 1.5, borderColor: c.accentFaint, borderRadius: 18, paddingHorizontal: 9, paddingVertical: 8, backgroundColor: c.card, shadowColor: c.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.09, shadowRadius: 13, elevation: 3 },
  searchIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: c.accentSoftBg, alignItems: 'center', justifyContent: 'center' },
  searchInput: { flex: 1, color: c.text, fontSize: 15, fontWeight: '700', paddingVertical: 0 },
  scrollContent: { paddingBottom: 44 },
  topicSection: { marginTop: 25, paddingHorizontal: 16, backgroundColor: 'transparent' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, backgroundColor: 'transparent' },
  sectionTitle: { fontSize: 16, lineHeight: 20, fontWeight: '900' },
  sectionMeta: { color: c.muted, fontSize: 11, lineHeight: 14, fontWeight: '700' },
  topicGrid: { width: '100%', gap: 8, backgroundColor: 'transparent' },
  topicChip: { width: '100%', minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12, backgroundColor: c.card, paddingHorizontal: 12, paddingVertical: 10 },
  topicChipFeatured: { backgroundColor: c.primary, borderColor: c.primary },
  topicText: { flex: 1, minWidth: 0, color: c.onAccentFaint, fontSize: 12, lineHeight: 16, fontWeight: '800' },
  topicTextFeatured: { color: c.onPrimary },
  filterRow: { gap: 8, paddingHorizontal: 16, paddingTop: 17, paddingBottom: 7 },
  filterChip: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.background, paddingHorizontal: 12, paddingVertical: 7 },
  filterChipSelected: { backgroundColor: c.primary, borderColor: c.primary },
  filterText: { color: c.subtle, fontSize: 12, lineHeight: 16, fontWeight: '800' },
  filterTextSelected: { color: c.onPrimary },
  filterCount: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: c.inputBg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  filterCountSelected: { backgroundColor: c.onPrimaryOverlay },
  filterCountText: { color: c.muted, fontSize: 9, lineHeight: 12, fontWeight: '900' },
  filterCountTextSelected: { color: c.onPrimary },
  resultSummary: { minHeight: 69, marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: 'transparent' },
  resultEyebrow: { color: c.muted, fontSize: 8, lineHeight: 11, fontWeight: '900', letterSpacing: 0.8 },
  resultQuery: { fontSize: 18, lineHeight: 23, fontWeight: '900', marginTop: 3 },
  emptyCard: { marginHorizontal: 16, marginTop: 20, borderRadius: 20, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.card, paddingHorizontal: 26, paddingVertical: 30, alignItems: 'center' },
  emptyMark: { width: 52, height: 52, borderRadius: 17, backgroundColor: c.accentSoftBg, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, lineHeight: 22, fontWeight: '900', marginTop: 13 },
  emptyText: { color: c.muted, textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 6 },
  resultSection: { marginTop: 21, paddingHorizontal: 16, backgroundColor: 'transparent' },
  resultGroup: { borderRadius: 17, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.card, overflow: 'hidden' },
  resultRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: 'transparent' },
  resultRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.cardBorder },
  sourceMark: { width: 42, height: 42, borderRadius: 13, backgroundColor: c.accentSoftBg, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0, backgroundColor: 'transparent' },
  rowTitle: { fontSize: 14, lineHeight: 18, fontWeight: '900' },
  rowMeta: { color: c.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  leanTag: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  leanTagText: { fontSize: 9, lineHeight: 12, fontWeight: '900' },
  userAvatar: { width: 42, height: 42, borderRadius: 14 },
  storySection: { marginTop: 23, backgroundColor: 'transparent' },
  storyHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8, backgroundColor: 'transparent' },
});
