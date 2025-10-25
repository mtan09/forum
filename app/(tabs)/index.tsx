import Post from '@/components/postComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePosts } from '@/context/postContext';
import { useTopics } from '@/context/topicContext';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';

const screenWidth = Dimensions.get('window').width;

type Topic = {
  id: string;
  name: string;
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

  const { topics, setTopics } = useTopics();

  const [ activeTopic, setActiveTopic ] = useState<Topic | null>(null);

  useEffect(() => {
    if (topics.length > 0 && !activeTopic) {
      setActiveTopic(topics[0]);
    }
  }, [topics]);

  return(
      <ThemedView style={styles.container}>
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => 
            <Pressable
              onPress={() => {
                router.push(`/post/${item.id}`);
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1.0,
              })}
            >
              <Post 
                post={item} 
                onUpvote={() => handleUpvote(item.id)} 
                onUnUpvote={() => handleUnUpvote(item.id)}
                onDownvote={() => handleDownvote(item.id)}
                onUnDownvote={() => handleUnDownvote(item.id)}
              />
            </Pressable>
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: 164 }}
          ListHeaderComponent={
            activeTopic ? (
              <Pressable
                onPress={() => {
                  router.push(`/summary/${activeTopic.id}`);
                }}
                style={({ pressed }) => [
                  styles.summary,
                  { backgroundColor: pressed ? '#9687c2ff' : '#BAA8f0' }
                ]}
              >
                <ThemedText type="defaultSemiBold" style={{fontWeight: "800"}}>
                  Israel and Hamas agreed to a ceasefire involving hostage and prisoner exchanges, partial Israeli troop withdrawals, and increased humanitarian aid to Gaza, though key issues like Hamas’s disarmament and Gaza’s future governance remain unresolved.
                </ThemedText>
              </Pressable>
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
              borderBottomColor: activeTab === 'For You' ? '#7049E0' : 'white',
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
              borderBottomColor: activeTab === 'Random' ? '#7049E0' : 'white',
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
              borderBottomColor: activeTab === 'Against You' ? '#7049E0' : 'white',
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
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            >
              {topics.map((topic) => (
                activeTopic ? (
                  <Pressable
                    key={topic.id}
                    onPress={() => {
                      setActiveTopic(topic);
                    }}
                    style={styles.topicContainer}
                  >
                    <ThemedText
                      style={{
                        fontSize: 18,
                        lineHeight: 24,
                        height: 24,
                        width: topic.name.length * 10,
                        textAlign: 'left',
                        fontWeight: activeTopic.id === topic.id ? '800' : '500',
                        color: activeTopic.id === topic.id ? '#7049e0' : '#8D8D8D',
                      }}
                    >
                      {topic.name}
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
    backgroundColor: "#BAA8F0",
    borderRadius: 16,
    padding: 16,
  }
});