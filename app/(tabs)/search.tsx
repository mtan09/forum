import Article, { ArticleType } from '@/components/articleComponent';
import AppTextInput from '@/components/app-text-input';
import Post from '@/components/postComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { mapPost } from '@/context/postContext';
import { usePalette } from '@/hooks/use-palette';
import { api } from '@/lib/api';
import { onTabRefresh } from '@/lib/tabRefresh';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { selectTick, tapLight } from '@/lib/haptics';

type SearchResults = {
  topics: SearchTopic[];
  posts: any[];
  articles: ArticleType[];
  counts: SearchCounts;
};

type ResultFilter = 'Articles' | 'Posts';

type SearchCounts = {
  topics: number;
  posts: number;
  articles: number;
};

type SearchTopic = {
  id: string;
  title: string;
  short_summary?: string | null;
  keywords?: string[];
  article_count: number;
  outlet_count: number;
};

type HotTopic = {
  id?: unknown;
  title?: unknown;
  short_summary?: unknown;
  volume?: unknown;
  article_count?: unknown;
};

type QuickTopic = {
  id?: string;
  title: string;
  summary?: string;
  volume?: number;
  articleCount?: number;
};

const EMPTY_COUNTS: SearchCounts = { topics: 0, posts: 0, articles: 0 };
const EMPTY: SearchResults = {
  topics: [],
  posts: [],
  articles: [],
  counts: EMPTY_COUNTS,
};
const FALLBACK_QUICK_TOPICS: QuickTopic[] = [
  { title: 'The economy' },
  { title: 'Immigration' },
  { title: 'Climate policy' },
  { title: 'Housing costs' },
  { title: 'Elections' },
];
const IS_WEB = Platform.OS === 'web';

export default function SearchTab() {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ResultFilter>('Articles');
  const [quickTopics, setQuickTopics] = useState(FALLBACK_QUICK_TOPICS);
  const [hasLiveTopics, setHasLiveTopics] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const searchRef = useRef<TextInput>(null);

  const fetchQuickTopics = useCallback(async () => {
    try {
      const payload = await api<HotTopic[]>('/topics/hot?limit=5');
      const topics = Array.isArray(payload)
        ? payload.flatMap((topic): QuickTopic[] => {
            if (typeof topic?.title !== 'string' || !topic.title.trim()) return [];
            return [{
              id: typeof topic.id === 'string' ? topic.id : undefined,
              title: topic.title.trim(),
              summary: typeof topic.short_summary === 'string' ? topic.short_summary.trim() : undefined,
              volume: typeof topic.volume === 'number' ? topic.volume : undefined,
              articleCount: typeof topic.article_count === 'number' ? topic.article_count : undefined,
            }];
          }).filter((topic, index, all) => all.findIndex((item) => item.title === topic.title) === index).slice(0, 5)
        : [];

      if (topics.length > 0) {
        setQuickTopics(topics);
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
      setActiveFilter('Articles');
      return;
    }

    setLoading(true);
    setSearchError(null);
    debounceRef.current = setTimeout(async () => {
      try {
        const searchPath = selectedTopicId
          ? `/search?topic_id=${encodeURIComponent(selectedTopicId)}&q=${encodeURIComponent(q)}`
          : `/search?q=${encodeURIComponent(q)}`;
        const payload = await api<Partial<SearchResults>>(searchPath);
        // A partial or malformed response should become an empty section,
        // never a render-time `.length`/`.map` crash.
        const topics = Array.isArray(payload?.topics) ? payload.topics : [];
        const posts = Array.isArray(payload?.posts) ? payload.posts : [];
        const articles = Array.isArray(payload?.articles) ? payload.articles : [];
        setResults({
          topics,
          posts,
          articles,
          counts: {
            topics: Number(payload?.counts?.topics) || topics.length,
            posts: Number(payload?.counts?.posts) || posts.length,
            articles: Number(payload?.counts?.articles) || articles.length,
          },
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
  }, [query, selectedTopicId]);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length >= 2;
  const showArticles = activeFilter === 'Articles';
  const showPosts = activeFilter === 'Posts';
  const filters: { label: ResultFilter; count: number }[] = [
    { label: 'Articles', count: results.counts.articles },
    { label: 'Posts', count: results.counts.posts },
  ];
  const filteredCount = filters.find((filter) => filter.label === activeFilter)?.count ?? 0;

  const chooseTopic = (topic: QuickTopic) => {
    setSelectedTopicId(topic.id ?? null);
    setQuery(topic.title);
    setActiveFilter('Articles');
    Keyboard.dismiss();
  };

  const clearSearch = () => {
    setSelectedTopicId(null);
    setQuery('');
    setActiveFilter('Articles');
    Keyboard.dismiss();
  };

  return (
    <ThemedView style={styles.screen}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>Discover</ThemedText>
        <ThemedText style={styles.subtitle}>Search the whole conversation.</ThemedText>
      </ThemedView>

      <AppTextInput
        ref={searchRef}
        value={query}
        onChangeText={(value) => {
          setSelectedTopicId(null);
          setQuery(value);
        }}
        placeholder="Search articles and posts"
        leadingIcon="magnifyingglass"
        actionIcon={query.length > 0 ? 'x.circle.fill' : undefined}
        actionLabel="Clear search"
        actionDisabled={false}
        onAction={query.length > 0 ? clearSearch : undefined}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        containerStyle={styles.searchShell}
      />

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
                {quickTopics.map((topic, index) => {
                  const count = topic.articleCount ?? topic.volume;
                  const countLabel = count != null
                    ? `${count} ${topic.articleCount != null ? `ARTICLE${count === 1 ? '' : 'S'}` : 'RELATED'}`
                    : 'TRENDING';
                  return (
                    <Pressable
                      key={topic.title}
                      onPress={() => { selectTick(); chooseTopic(topic); }}
                      style={({ pressed }) => [
                        styles.topicChip,
                        index === 0 && styles.topicChipFeatured,
                        IS_WEB && index === 0 && styles.topicChipFeaturedWeb,
                        { opacity: pressed ? 0.65 : 1 },
                      ]}
                    >
                      <ThemedView style={styles.topicCopy}>
                        <ThemedText style={[styles.topicEyebrow, index === 0 && styles.topicEyebrowFeatured]}>
                          {index === 0 ? `TOP STORY · ${countLabel}` : countLabel}
                        </ThemedText>
                        <ThemedText numberOfLines={2} style={[styles.topicText, index === 0 && styles.topicTextFeatured]}>{topic.title}</ThemedText>
                        {topic.summary ? (
                          <ThemedText numberOfLines={index === 0 ? 2 : 1} style={[styles.topicSummary, index === 0 && styles.topicSummaryFeatured]}>
                            {topic.summary}
                          </ThemedText>
                        ) : null}
                      </ThemedView>
                      <ThemedView style={[styles.topicArrow, index === 0 && styles.topicArrowFeatured]}>
                        <IconSymbol name="arrow.up.right" size={14} color={index === 0 ? c.onPrimary : c.primary} />
                      </ThemedView>
                    </Pressable>
                  );
                })}
              </ThemedView>
            </ThemedView>
          </>
        ) : (
          <>
            <ThemedView style={styles.filterRow}>
              {filters.map((filter) => {
                const selected = filter.label === activeFilter;
                return (
                  <Pressable
                    key={filter.label}
                    onPress={() => { selectTick(); setActiveFilter(filter.label); }}
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
            </ThemedView>

            <ThemedView style={styles.resultSummary}>
              {/* The spinner sits with the status line it belongs to. Pinned to
                  the far right it read as unrelated and crowded the edge. */}
              <ThemedView style={styles.resultEyebrowRow}>
                <ThemedText style={styles.resultEyebrow}>
                  {loading ? 'SEARCHING FOR' : `${filteredCount} MATCHING ${activeFilter.toUpperCase()}`}
                </ThemedText>
                {loading && <ActivityIndicator size="small" color={c.primary} />}
              </ThemedView>
              <ThemedText style={styles.resultQuery}>“{trimmedQuery}”</ThemedText>
            </ThemedView>

            {!loading && filteredCount === 0 && (
              <ThemedView style={styles.emptyCard}>
                <ThemedView style={styles.emptyMark}>
                  <IconSymbol name="magnifyingglass" size={25} color={c.primary} />
                </ThemedView>
                <ThemedText style={styles.emptyTitle}>{searchError ? 'Search could not connect' : 'Nothing in this lane yet'}</ThemedText>
                <ThemedText style={styles.emptyText}>
                  {searchError ?? `No matching ${activeFilter.toLowerCase()} yet. Try a broader phrase or check the other tab.`}
                </ThemedText>
              </ThemedView>
            )}

            {!loading && showArticles && results.topics.length > 0 && (
              <ThemedView style={styles.resultSection}>
                <ThemedView style={styles.sectionTitleRow}>
                  <ThemedText style={styles.sectionTitle}>Story clusters</ThemedText>
                  <ThemedText style={styles.sectionMeta}>Best context first</ThemedText>
                </ThemedView>
                <ThemedView style={styles.clusterGroup}>
                  {results.topics.map((topic, index) => (
                    <Pressable
                      key={topic.id}
                      onPress={() => { tapLight(); router.push(`/summary/${topic.id}`); }}
                      style={({ pressed }) => [
                        styles.clusterRow,
                        index > 0 && styles.resultRowDivider,
                        { opacity: pressed ? 0.65 : 1 },
                      ]}
                    >
                      <ThemedView style={styles.clusterMark}>
                        <IconSymbol name="rectangle.stack.fill" size={17} color={c.primary} />
                      </ThemedView>
                      <ThemedView style={styles.rowCopy}>
                        <ThemedText style={styles.clusterTitle} numberOfLines={2}>{topic.title}</ThemedText>
                        {topic.short_summary ? (
                          <ThemedText style={styles.clusterSummary} numberOfLines={2}>{topic.short_summary}</ThemedText>
                        ) : null}
                        <ThemedText style={styles.clusterMeta}>
                          {topic.article_count} article{topic.article_count === 1 ? '' : 's'}
                          {topic.outlet_count > 0 ? ` · ${topic.outlet_count} outlet${topic.outlet_count === 1 ? '' : 's'}` : ''}
                        </ThemedText>
                      </ThemedView>
                      <IconSymbol name="chevron.right" size={17} color={c.faint} />
                    </Pressable>
                  ))}
                </ThemedView>
              </ThemedView>
            )}

            {!loading && showPosts && results.posts.length > 0 && (
              <ThemedView style={styles.storySection}>
                <ThemedView style={styles.storyHeading}>
                  <ThemedText style={styles.sectionTitle}>Community posts</ThemedText>
                  <ThemedText style={styles.sectionMeta}>
                    {results.posts.length < results.counts.posts
                      ? `${results.posts.length} of ${results.counts.posts}`
                      : results.counts.posts}
                  </ThemedText>
                </ThemedView>
                <ThemedView style={styles.storyGrid}>
                  {results.posts.map((row) => {
                    const post = mapPost(row);
                    return (
                      <Pressable
                        key={post.id}
                        onPress={() => { tapLight(); router.push(`/post/${post.id}`); }}
                        style={({ pressed }) => [styles.storyResult, { opacity: pressed ? 0.6 : 1 }]}
                      >
                        <Post post={post} />
                      </Pressable>
                    );
                  })}
                </ThemedView>
              </ThemedView>
            )}

            {!loading && showArticles && results.articles.length > 0 && (
              <ThemedView style={styles.storySection}>
                <ThemedView style={styles.storyHeading}>
                  <ThemedText style={styles.sectionTitle}>Reporting</ThemedText>
                  <ThemedText style={styles.sectionMeta}>
                    {results.articles.length < results.counts.articles
                      ? `${results.articles.length} of ${results.counts.articles}`
                      : results.counts.articles}
                  </ThemedText>
                </ThemedView>
                <ThemedView style={styles.storyGrid}>
                  {results.articles.map((article) => (
                    <Pressable
                      key={article.id}
                      onPress={() => { tapLight(); router.push(`/article/${article.id}`); }}
                      style={({ pressed }) => [styles.storyResult, { opacity: pressed ? 0.6 : 1 }]}
                    >
                      <Article article={article} />
                    </Pressable>
                  ))}
                </ThemedView>
              </ThemedView>
            )}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, paddingTop: IS_WEB ? 32 : 88 },
  header: { paddingHorizontal: IS_WEB ? 28 : 16, backgroundColor: 'transparent' },
  title: { color: c.primary, fontSize: IS_WEB ? 34 : 32, lineHeight: IS_WEB ? 40 : 38 },
  subtitle: { color: c.muted, marginTop: 3, marginBottom: 8, fontSize: IS_WEB ? 15 : 14, lineHeight: 20 },
  searchShell: {
    marginHorizontal: IS_WEB ? 28 : 16,
    marginTop: 18,
    marginBottom: 5,
    ...(IS_WEB
      ? { boxShadow: `0 5px 13px ${c.primary}17` }
      : {
          shadowColor: c.primary,
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.09,
          shadowRadius: 13,
        }),
    elevation: 3,
  },
  scrollContent: { paddingBottom: 44 },
  topicSection: { marginTop: 25, paddingHorizontal: IS_WEB ? 28 : 16, backgroundColor: 'transparent' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, backgroundColor: 'transparent' },
  sectionTitle: { fontSize: 16, lineHeight: 20, fontWeight: '900' },
  sectionMeta: { color: c.muted, fontSize: 11, lineHeight: 14, fontWeight: '700' },
  topicGrid: { width: '100%', gap: 8, backgroundColor: 'transparent', flexDirection: IS_WEB ? 'row' : 'column', flexWrap: IS_WEB ? 'wrap' : 'nowrap' },
  topicChip: { width: IS_WEB ? '49%' : '100%', flexGrow: IS_WEB ? 1 : 0, minHeight: IS_WEB ? 112 : 64, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, borderWidth: 1, borderColor: c.cardBorder, borderRadius: IS_WEB ? 18 : 12, backgroundColor: c.card, paddingHorizontal: IS_WEB ? 17 : 12, paddingVertical: IS_WEB ? 15 : 11 },
  topicChipFeatured: { backgroundColor: c.primary, borderColor: c.primary },
  topicChipFeaturedWeb: { width: '100%', minHeight: 148, flexGrow: 0 },
  topicCopy: { flex: 1, minWidth: 0, backgroundColor: 'transparent' },
  topicEyebrow: { color: c.primary, fontSize: 8, lineHeight: 11, fontWeight: '900', letterSpacing: 0.8, marginBottom: 7 },
  topicEyebrowFeatured: { color: c.onPrimaryMuted },
  topicText: { color: c.onAccentFaint, fontSize: IS_WEB ? 15 : 13, lineHeight: IS_WEB ? 20 : 18, fontWeight: '900' },
  topicTextFeatured: { color: c.onPrimary },
  topicSummary: { color: c.muted, fontSize: 11, lineHeight: 16, marginTop: 6 },
  topicSummaryFeatured: { color: c.onPrimaryMuted },
  topicArrow: { width: 28, height: 28, borderRadius: 9, backgroundColor: c.accentSoftBg, alignItems: 'center', justifyContent: 'center' },
  topicArrowFeatured: { backgroundColor: c.onPrimaryOverlay },
  filterRow: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: IS_WEB ? 28 : 16,
    marginTop: 17,
    padding: 4,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.inputBg,
  },
  filterChip: { minHeight: 38, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 11, backgroundColor: 'transparent', paddingHorizontal: 12, paddingVertical: 7 },
  filterChipSelected: { backgroundColor: c.primary, borderColor: c.primary },
  filterText: { color: c.subtle, fontSize: 12, lineHeight: 16, fontWeight: '800' },
  filterTextSelected: { color: c.onPrimary },
  filterCount: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: c.inputBg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  filterCountSelected: { backgroundColor: c.onPrimaryOverlay },
  filterCountText: { color: c.muted, fontSize: 9, lineHeight: 12, fontWeight: '900' },
  filterCountTextSelected: { color: c.onPrimary },
  resultSummary: { marginHorizontal: IS_WEB ? 28 : 16, marginTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: 'transparent' },
  resultEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'transparent' },
  resultEyebrow: { color: c.muted, fontSize: 8, lineHeight: 11, fontWeight: '900', letterSpacing: 0.8 },
  resultQuery: { fontSize: 18, lineHeight: 23, fontWeight: '900', marginTop: 7 },
  emptyCard: { marginHorizontal: IS_WEB ? 28 : 16, marginTop: 20, borderRadius: 20, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.card, paddingHorizontal: 26, paddingVertical: 30, alignItems: 'center' },
  emptyMark: { width: 52, height: 52, borderRadius: 17, backgroundColor: c.accentSoftBg, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, lineHeight: 22, fontWeight: '900', marginTop: 13 },
  emptyText: { color: c.muted, textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 6 },
  resultSection: { marginTop: 21, paddingHorizontal: IS_WEB ? 28 : 16, backgroundColor: 'transparent' },
  clusterGroup: { borderRadius: 17, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.card, overflow: 'hidden' },
  clusterRow: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: 'transparent' },
  clusterMark: { width: 40, height: 40, borderRadius: 13, backgroundColor: c.accentSoftBg, alignItems: 'center', justifyContent: 'center' },
  clusterTitle: { color: c.text, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  clusterSummary: { color: c.subtle, fontSize: 11, lineHeight: 16, marginTop: 3 },
  clusterMeta: { color: c.primary, fontSize: 9, lineHeight: 13, fontWeight: '900', letterSpacing: 0.35, marginTop: 5 },
  resultRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.cardBorder },
  rowCopy: { flex: 1, minWidth: 0, backgroundColor: 'transparent' },
  storySection: { marginTop: 23, backgroundColor: 'transparent' },
  storyHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: IS_WEB ? 28 : 16, marginBottom: 8, backgroundColor: 'transparent' },
  storyGrid: {
    flexDirection: IS_WEB ? 'row' : 'column',
    flexWrap: IS_WEB ? 'wrap' : 'nowrap',
    backgroundColor: 'transparent',
  },
  storyResult: {
    width: IS_WEB ? '50%' : '100%',
    minWidth: IS_WEB ? 320 : undefined,
    flexGrow: IS_WEB ? 1 : 0,
  },
});
