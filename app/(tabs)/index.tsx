import Article, { ArticleType } from '@/components/articleComponent';
import Carousel from '@/components/carousel';
import Post from '@/components/postComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/authContext';
import { usePosts } from '@/context/postContext';
import { supabase } from '@/lib/supabaseClient';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { spectrums } from './profile';

const screenWidth = Dimensions.get('window').width;
const LEFT_PADDING = 16; // keep in sync with contentContainerStyle paddingHorizontal

type Topic = {
  id: string;
  name: string;
  slug: string;
  spectrum_left_label: string | null;
  spectrum_right_label: string | null;
  spectrum_left_description: string | null;
  spectrum_right_description: string | null;
  importance: number;
}

type Subtopic = {
  id: string;
  general_topic_id: string;
  title: string;
  short_summary: string;
}

export default function Feed() {

  const router = useRouter();

  const { posts, setPosts, error, handleUpvote, handleUnUpvote, handleDownvote, handleUnDownvote } = usePosts();

  const scrollY = useRef(new Animated.Value(0)).current;

  const headerTranslateY = Animated.multiply(scrollY, -1);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const [activeTab, setActiveTab] = useState<'For You' | 'Random' | 'Against You'>('For You');

  const [ topics, setTopics ] = useState<Topic[]>([]);

  const [ activeTopic, setActiveTopic ] = useState<Topic | null>(null);

  const [subtopicsByTopic, setSubtopicsByTopic] = useState<Record<string, Subtopic[]>>({});
  // const [activeSubtopicGroup, setActiveSubtopicGroup] = useState<Subtopic[] | null>(null);
  const [activeSubtopic, setActiveSubtopic] = useState<Subtopic | null>(null);

  // Track topic chip layouts and the topics ScrollView
  const topicsScrollRef = useRef<ScrollView>(null);
  const [topicLayouts, setTopicLayouts] = useState<Record<string, { x: number; width: number }>>({});
  // Optional manual width overrides per topic id: set a width to force a chip width
  const [topicWidthOverrides, setTopicWidthOverrides] = useState<Record<string, number>>({
    // 'topic-id-here': 88,
  });

  const activeSubtopicGroup = useMemo(
    () => (activeTopic ? subtopicsByTopic[activeTopic.id] ?? [] : []),
    [activeTopic?.id, subtopicsByTopic]
  );

  // Keep a valid activeSubtopic whenever the group changes
  useEffect(() => {
    setActiveSubtopic(prev => {
      if (!activeSubtopicGroup || activeSubtopicGroup.length === 0) return null;
      // Keep previous if it still exists; else pick first
      return prev && activeSubtopicGroup.some(s => s.id === prev.id)
        ? prev
        : activeSubtopicGroup[0];
    });
  }, [activeSubtopicGroup]);

  useEffect(() => {
    // fetch topics + subtopics in parallel and group subtopics by general_topic_id
    const load = async () => {
      const [
        { data: topicData, error: topicError },
        { data: subtopicData, error: subtopicError },
      ] = await Promise.all([
        supabase
          .from('general_topics')
          .select('id, name, slug, spectrum_left_label, spectrum_right_label, spectrum_left_description, spectrum_right_description, importance'),
        supabase
          .from('subtopics')
          .select('id, general_topic_id, title, short_summary'),
      ]);

      if (topicError) {
        console.log('Error fetching topics:', topicError);
      } else {
        const sorted = ((topicData ?? []) as Topic[])
          .slice()
          .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));
        setTopics(sorted);
        setActiveTopic(prev => prev ?? (sorted?.[0] ?? null));
        console.log('Fetched topics (sorted by importance desc):', sorted);
      }

      if (subtopicError) {
        console.log('Error fetching subtopics:', subtopicError);
      } else {
        const grouped: Record<string, Subtopic[]> = {};
        (subtopicData as Subtopic[] | null)?.forEach((s) => {
          const key = String(s.general_topic_id);
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(s);
        });
        setSubtopicsByTopic(grouped);
        console.log('Fetched subtopics:', subtopicData);

        // setActiveSubtopicGroup(grouped[topicData?.[0]?.id ?? ''] ?? null);
        // setActiveSubtopic(grouped[topicData?.[0]?.id ?? '']?.[0] ?? null);

        // console.log('Active subtopic group:', activeSubtopicGroup);
        // console.log('Active subtopic:', activeSubtopic);
      }
    };

    load();
  }, []);

  useEffect(() => {
    console.log('Active topic id:', activeTopic?.id);
    console.log('Subtopic groups keys:', Object.keys(subtopicsByTopic));
    console.log('Active subtopic group length:', activeSubtopicGroup.length);
    console.log('Active subtopic:', activeSubtopic?.id, activeSubtopic?.title);
  }, [activeTopic?.id, subtopicsByTopic, activeSubtopicGroup, activeSubtopic]);

  const { session, user } = useAuth();

  // Compute the initial slide based on the current activeSubtopic
  const initialSlide =
    Math.max(0, activeSubtopicGroup.findIndex(s => s.id === activeSubtopic?.id)) || 0;

  // Helper to align a topic chip to the left edge (respecting left padding)
  const scrollToTopic = (id: string) => {
    const layout = topicLayouts[id];
    if (!layout) return;
    const targetX = Math.max(0, layout.x - LEFT_PADDING);
    topicsScrollRef.current?.scrollTo({ x: targetX, animated: true });
  };

  const getUserPosForTopic = (topic: Topic | null): number => {
    if (!topic) return 0.5;
    const topicKey = topic.slug || topic.id;
    const match =
      spectrums.find(s => String(s.id) === String(topicKey)) ||
      spectrums.find(s => String((s as any).slug ?? '') === String(topic.slug ?? ''));
    const pos = Number((match as any)?.position);
    return Number.isFinite(pos) ? pos : 0.5;
  };

  const userPos = useMemo(
    () => getUserPosForTopic(activeTopic),
    [activeTopic?.id, activeTopic?.slug]
  );

  // Filter posts by the active general topic id (posts[].topic holds the general topic id)
  const filteredPosts = useMemo(() => {
    if (!activeTopic?.id) return posts;
    if (activeTab === 'Random') return posts.filter((p) => String(p.topic) === String(activeTopic.id));
    else if (activeTab === 'For You') {
      if (userPos <= 0.5) {
        return posts.filter(p =>
          String(p.topic) === String(activeTopic.id) &&
          p.position <= 0.5
        )
      } else if (userPos >= 0.5) {
        return posts.filter(p =>
          String(p.topic) === String(activeTopic.id) &&
          p.position >= 0.5
        )
      } else {
        return posts.filter(p => String(p.topic) === String(activeTopic.id));
      }
    } else if (activeTab === 'Against You') {
      if (userPos <= 0.5) {
        return posts.filter(p =>
          String(p.topic) === String(activeTopic.id) &&
          p.position >= 0.5
        )
      } else if (userPos >= 0.5) {
        return posts.filter(p =>
          String(p.topic) === String(activeTopic.id) &&
          p.position <= 0.5
        )
      } else {
        return posts.filter(p => String(p.topic) === String(activeTopic.id));
      }
    } else {
      return posts.filter((p) => String(p.topic) === String(activeTopic.id));
    }
  }, [posts, activeTopic?.id, activeTab]);

  const [ articles, setArticles ] = useState<ArticleType[]>([]);

  useEffect(() => {
    const fetchArticles = async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*');

      if (error) {
        console.log('Error fetching articles:', error);
        return;
      }

      const rows = (data ?? []) as ArticleType[];
      setArticles(rows);
      // console.log('Fetched articles:', rows);
    };

    fetchArticles();
  }, [])

  const filteredArticles = useMemo(() => {
    if (!activeTopic?.id) return articles;
    return articles.filter((a) => String(a.general_topic_id) === String(activeTopic.id));
  }, [articles, activeTopic?.id]);

  type FeedItem =
    | { kind: 'post'; id: string; data: import('@/components/postComponent').PostType }
    | { kind: 'article'; id: string; data: ArticleType };

  // Combine posts and articles into one feed and randomize the order (Fisher-Yates shuffle).
  const feedItems = useMemo<FeedItem[]>(() => {
    const postsMapped: FeedItem[] = filteredPosts.map((p) => ({
      kind: 'post',
      id: `p-${p.id}`,
      data: p,
    }));
    const articlesMapped: FeedItem[] = filteredArticles.map((a) => ({
      kind: 'article',
      id: `a-${a.id}`,
      data: a,
    }));

    const combined = [...postsMapped, ...articlesMapped];
    // Shuffle in-place
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }
    return combined;
  }, [filteredPosts, filteredArticles]);

  // Scroll to top when the active topic changes
  const listRef = useRef<FlatList<FeedItem>>(null);
  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };
  useEffect(() => {
    if (activeTopic?.id) {
      scrollToTop();
    }
  }, [activeTopic?.id]);

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
                onPress={async () => {
                  try { await WebBrowser.openBrowserAsync(item.data.url); } catch {}
                }}
                // onPress={() => {
                //   router.push(`/article/${item.data.id}`)
                // }}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
              >
                <Article article={item.data} />
              </Pressable>
            );
          }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: 164 }}
          ListHeaderComponent={
            activeSubtopicGroup.length > 0 ? (
              <Carousel
                key={`carousel-${activeTopic?.id ?? 'none'}`}
                data={activeSubtopicGroup}
                initialIndex={initialSlide}
                horizontalPadding={0}
                onIndexChange={(idx) => {
                  const s = activeSubtopicGroup[idx];
                  if (s && s.id !== activeSubtopic?.id) setActiveSubtopic(s);
                }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      router.push(`/summary/${item.id}`);
                    }}
                    style={({ pressed }) => [
                      styles.summary,
                      { backgroundColor: pressed ? '#e9c8ffbf' : '#E9C8FF' }
                    ]}
                  >
                    <ThemedText type="defaultSemiBold" style={{fontWeight: "800"}}>
                      {item.title}
                    </ThemedText>
                    <ThemedText type="defaultSemiBold" style={{fontWeight: "600"}}>
                      {item.short_summary}
                    </ThemedText>
                    {/* <ThemedText>
                      {session === null ? 'No session' : `Logged in as ${user?.id}`}
                    </ThemedText> */}
                  </Pressable>
                )}
              />
            ) : null
          }
        />
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
        <ThemedView style={styles.topics}>
            <LinearGradient
                colors={['white', 'rgb(255, 255, 255, 0)']}
                style={StyleSheet.absoluteFill}
                locations={[0.5, 1.0]}
            />
            <ScrollView
              ref={topicsScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: LEFT_PADDING, gap: 8 }}
            >
              {topics.map((topic) => (
                activeTopic ? (
                  <Pressable
                    key={topic.id}
                    onLayout={(e) => {
                      const { x, width } = e.nativeEvent.layout;
                      setTopicLayouts(prev => ({ ...prev, [topic.id]: { x, width } }));
                    }}
                    onPress={() => {
                      setActiveTopic(topic);
                      scrollToTopic(topic.id);
                      // Example to manually adjust a chip width:
                      // setTopicWidthOverrides(prev => ({ ...prev, [topic.id]: 92 }));
                    }}
                    style={[
                      styles.topicContainer,
                      topicWidthOverrides[topic.id] ? { width: topicWidthOverrides[topic.id] } : null,
                    ]}
                  >
                    <ThemedText
                      style={{
                        fontSize: 18,
                        lineHeight: 24,
                        height: 24,
                        // remove fixed width; let content size + padding handle it
                        paddingHorizontal: 8, // tweak for overall chip width feel
                        textAlign: 'left',
                        fontWeight: activeTopic.id === topic.id ? '800' : '500',
                        color: activeTopic.id === topic.id ? '#B647FF' : '#8D8D8D',
                      }}
                    >
                      {topic.slug}
                    </ThemedText>
                  </Pressable>
                ) : null
              ))}
            </ScrollView>
        </ThemedView>
      </ThemedView>
      
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    position: 'absolute',
    width: screenWidth,
    height: 104,
    // borderBottomWidth: 2,
    // borderBottomColor: "#B647FF",
    borderColor: "#c6c6c6ff",
    borderBottomWidth: 1,
  },
  topics: {
    position: 'absolute',
    top: 104,
    width: screenWidth,
    height: 60,
    backgroundColor: 'transparent',
    // alignItems: 'center',
  },
  topicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    marginHorizontal: 16,
    backgroundColor: "#E9C8FF",
    borderRadius: 16,
    padding: 16,
  }
});