import ImageCarousel from '@/components/imageCarousel';
import Spectrum from '@/components/spectrum';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchMockSummary, SummaryType } from '@/data/mockSummaries';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Linking, Pressable, ScrollView, StyleSheet } from 'react-native';

const screenWidth =  Dimensions.get('window').width;

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [ summary, setSummary ] = useState<SummaryType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        setIsLoading(true);
        const data = await fetchMockSummary(id);
        setSummary(data);
      } catch (err) {
        console.error('Failed to fetch summary:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [id]);

  const text = '📊 ' + formatCount(summary?.info?.volume ?? 0) + ' posts' + '   •   ' + summary?.info.keywords.join('   •   ');


  return (

    <ScrollView showsVerticalScrollIndicator={false}>
      <ThemedView style={ styles.container }>

        {/* Title */}
        <ThemedText style={{ fontSize: 24, fontWeight: '800', lineHeight: 32, color: '#592EDC', marginTop: 8 }}>
          {summary?.name}
        </ThemedText>

        {/* Metadata */} 
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 24, marginBottom: 8 }}>
          <ThemedText numberOfLines={1} ellipsizeMode="clip" style={{ color: '#7049E0' }}>{text}   •   {text}</ThemedText>
        </ScrollView>
        
        {/* Image Carousel */}
        {summary?.images && summary.images.length > 0 && (
          <ImageCarousel images={summary.images} height={200} />
        )}

        {/* Summary Content */}
        <ThemedView style={styles.summary}>
          <ThemedText type="defaultSemiBold" style={{fontWeight: "800"}}>
            {summary?.summaryContent}
          </ThemedText>
        </ThemedView>

        {/* Spectrum Visualization */}
        <Spectrum width={(screenWidth - 32)} height={20} topic="Public Opinion" position={summary?.position ?? 0.5} textStyle={{fontWeight: '800'}}/>
        
        {/* Across the Spectrum News Sources */}
        <ThemedView style={ styles.news }>
          <ThemedText type="defaultSemiBold" style={{fontWeight: "800"}}>Across the Spectrum</ThemedText>  
          <ThemedView style={ styles.article }>
            <ThemedText style={styles.newsSource}>🟦 {summary?.news.left.source}</ThemedText>
            <Pressable
              onPress={() => Linking.openURL(summary?.news.left.url ?? '')}
            >
              <ThemedText style={styles.articleTitle}>{summary?.news.left.title}</ThemedText>
            </Pressable>
          </ThemedView>
          <ThemedView style={ styles.article }>
            <ThemedText style={styles.newsSource}>🟪 {summary?.news.center.source}</ThemedText>
            <ThemedText style={styles.articleTitle}>{summary?.news.center.title}</ThemedText>
          </ThemedView>
          <ThemedView style={ styles.article }>
            <ThemedText style={styles.newsSource}>🟥 {summary?.news.right.source}</ThemedText>
            <ThemedText style={styles.articleTitle}>{summary?.news.right.title}</ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Other topics */}

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
    backgroundColor: "#BAA8F0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  news: {
    gap: 16,
    marginTop: 12,
  },
  article: {
    flexDirection: 'row',
    
    // width: screenWidth - 32,
    
  },
  articleTitle: {
    flexShrink: 1,
    flexWrap: 'wrap',
    width: (screenWidth-32)/2,
    color: "#592EDC",
    textDecorationLine: 'underline'
  },
  newsSource: {
    width: (screenWidth-32)/2-8,
    marginLeft: 8,
  }
});
