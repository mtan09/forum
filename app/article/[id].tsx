import Article, { ArticleType } from '@/components/articleComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { api } from '@/lib/api';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export default function ArticleScreen() {
  const { id } = useLocalSearchParams();
  const articleId = useMemo(() => (Array.isArray(id) ? id[0] : id) as string | undefined, [id]);

  const [article, setArticle] = useState<ArticleType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!articleId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<ArticleType>(`/articles/${articleId}`);
        setArticle(data);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load article');
        setArticle(null);
      }
      setLoading(false);
    };
    load();
  }, [articleId]);

  if (!articleId) {
    return (
      <ThemedView style={{ padding: 16 }}>
        <ThemedText>Missing article id.</ThemedText>
      </ThemedView>
    );
  }

  if (loading) {
    return (
      <ThemedView style={{ padding: 16 }}>
        <ThemedText>Loading article…</ThemedText>
      </ThemedView>
    );
  }

  if (error || !article) {
    return (
      <ThemedView style={{ padding: 16 }}>
        <ThemedText>Error: {error ?? 'Article not found.'}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView>
      <Pressable
        onPress={async () => {
          try { await WebBrowser.openBrowserAsync(article.url); } catch {}
        }}
      >
        <Article 
          article={article}
        />
      </Pressable>
      
      <ThemedView style={styles.container}>
        <ThemedText>
          {article.content}
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  factCheck: {
    gap: 8,
  },
  claims: {
    gap: 8,
  },
  claim: {
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  biggerPicture: {
    backgroundColor: "#BAA8F0",
    borderRadius: 16,
    padding: 16,
  },
  dropdown: {
    width: screenWidth - 60,
    marginLeft: 28,
    borderLeftColor: '#BAA8F0',
    borderLeftWidth: 2,
    paddingLeft: 8,
  }
});