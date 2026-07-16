import { ArticleType } from '@/components/articleComponent';
import Carousel from '@/components/carousel';
import ImageCarousel from '@/components/imageCarousel';
import Spectrum from '@/components/spectrum';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { api } from '@/lib/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet } from 'react-native';

const screenWidth =  Dimensions.get('window').width;

type Summary = {
  title: string;
  long_summary: string;
  keywords: string[];
  volume: number;
  public_position: number;
}

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [ summary, setSummary ] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ articles, setArticles ] = useState<ArticleType[]>([]);

  const [ images, setImages ] = useState<string[]>([]);

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      if (count / 1000000 >= 10) {
        return (count / 1000000).toFixed(0) + 'M';
      }
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      if (count / 1000 >= 10) {
        return (count / 1000).toFixed(0) + 'k';
      }
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  };


  useEffect(() => {
    const loadSummary = async () => {
      try {
        // subtopic detail comes back with its articles nested
        const data = await api<Summary & { articles: ArticleType[] }>(`/topics/subtopics/${id}`);

        setSummary(data);
        setArticles(data.articles ?? []);
        setImages((data.articles ?? []).map((a) => a.media).filter((u): u is string => Boolean(u)));
      } catch (err: any) {
        console.log('Error fetching summary:', err?.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [id]);

  const text = '📊 ' + formatCount(summary?.volume ?? 0) + ' posts' + '   •   ' + summary?.keywords.join('   •   ');


  return (

    <ScrollView showsVerticalScrollIndicator={false}>
      <ThemedView style={ styles.container }>

        <ThemedText style={{ fontSize: 24, fontWeight: '800', lineHeight: 32, color: '#9A00FF', marginTop: 8 }}>
          {summary?.title}
        </ThemedText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 24, marginBottom: 8 }}>
          <ThemedText numberOfLines={1} ellipsizeMode="clip" style={{ color: '#9A00FF' }}>{text}   •   {text}</ThemedText>
        </ScrollView>
        
        {images && images.length > 0 && (
          <ImageCarousel images={images} height={240} />
        )}

        <ThemedView style={styles.summary}>
          <ThemedText type="defaultSemiBold" style={{fontWeight: "800"}}>
            {summary?.long_summary}
          </ThemedText>
        </ThemedView>

        <Spectrum width={(screenWidth - 32)} height={20} topic="Public Opinion" position={summary?.public_position ?? 0.5} textStyle={{fontWeight: '800'}}/>
        
        {/* Articles carousel */}
        {articles && articles.length > 0 && (
          <ThemedView style={{ marginTop: 12 }}>
            <ThemedText type="defaultSemiBold" style={{ fontWeight: '800', marginBottom: 8 }}>
              Latest coverage
            </ThemedText>
            <Carousel
              data={articles}
              keyExtractor={(a) => a.id}
              horizontalPadding={16}
              renderItem={({ item, size }) => (
                <Pressable
                  onPress={() => router.push(`/article/${item.id}`)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1.0 })}
                >
                  <ThemedView style={styles.articleCard}> 
                    {item.media ? (
                      <Image
                        source={{ uri: item.media }}
                        style={styles.articleImage}
                      />
                    ) : null}
                    <ThemedText style={styles.articleSource}>{item.source}</ThemedText>
                    <ThemedText type="defaultSemiBold" style={styles.articleHeadline} numberOfLines={3}>
                      {item.title}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              )}
            />
          </ThemedView>
        )}


      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
    marginBottom: 32,
  },
  summary: {
    backgroundColor: "#E9C8FF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  news: {
    gap: 16,
    marginTop: 12,
  },
  articleCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#F5F2FF',
    borderWidth: 1,
    borderColor: '#E4DCFF',
  },
  articleImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 8,
  },
  articleSource: {
    color: '#B647FF',
    marginBottom: 4,
    fontWeight: '700',
  },
  articleHeadline: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  article: {
    flexDirection: 'row',
    
    // width: screenWidth - 32,
    
  },
  articleTitle: {
    flexShrink: 1,
    flexWrap: 'wrap',
    width: (screenWidth-32)/2,
    color: "#B647FF",
    textDecorationLine: 'underline'
  },
  newsSource: {
    width: (screenWidth-32)/2-8,
    marginLeft: 8,
  }
});
