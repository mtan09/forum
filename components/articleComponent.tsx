import ScalableImage from '@/components/scalable-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet } from 'react-native';
import ArticleActions from './article-actions';
import ScorerReceipts from './scorerReceipts';

const screenWidth = Dimensions.get('window').width;

export type ArticleType = {
  id: string;
  url: string;
  title: string;
  source: string;
  content: string;
  media: string;
  political_lean: number | null;
  content_type?: 'news_report' | 'opinion' | 'analysis' | 'factual_report' | null;
  lean_confidence?: number | null;
  lean_signals?: string[];
  scorer_version?: string;
  source_lean?: number | null;
  general_topic_id: string;
  published_at: string;
  upvotes?: number;
  downvotes?: number;
  commentcount?: number;
  my_vote?: 'up' | 'down' | null;
  my_bookmark?: boolean;
}

// Outlet logo from the article's own domain, so it covers every source
// without storing logo URLs anywhere.
function logoUrl(articleUrl: string): string | null {
  try {
    const host = new URL(articleUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch {
    return null;
  }
}


export type UserType = {
  id: string;
  username: string;
  avatar?: string;
}

type Props = {
  article: ArticleType;
}

export default function Article({ article }: Props) {

  const timeAgo = useRelativeTime(article.published_at);

  // Articles are identified by their OUTLET's published lean (a small
  // Left/Center/Right tag by the source name), not per-article spectrums.
  const sourceLean = article.source_lean ?? article.political_lean;
  const leanTag =
    sourceLean == null ? null :
    sourceLean < 0.4 ? { label: 'Left',   color: '#2563EB', bg: '#E8F0FE' } :
    sourceLean > 0.6 ? { label: 'Right',  color: '#DC2626', bg: '#FDE8E8' } :
                       { label: 'Center', color: '#6B7280', bg: '#F1F1F3' };

  const router = useRouter();
  const [logoFailed, setLogoFailed] = useState(false);
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const logo = logoUrl(article.url);
  const receiptPosition = article.political_lean ?? article.source_lean ?? null;

  return (
    <ThemedView style={styles.post}>
      <ThemedView style={styles.postContent}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            {/* Outlet logo opens the source's detail page */}
            <Pressable
              onPress={() => router.push(`/source/${encodeURIComponent(article.source)}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
            >
              {logo && !logoFailed ? (
                <Image
                  source={{ uri: logo }}
                  style={styles.logo}
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <ThemedView style={styles.logoFallback}>
                  <ThemedText style={styles.logoInitial}>
                    {(article.source ?? '?').charAt(0).toUpperCase()}
                  </ThemedText>
                </ThemedView>
              )}
            </Pressable>
            <ThemedView style={{flex: 1}}>
              <ThemedView style={styles.sourceRow}>
                <ThemedText type="defaultSemiBold" style={{fontWeight: 800, fontSize: 18}}>{article.source}</ThemedText>
                {leanTag && (
                  <Pressable
                    onPress={() => receiptPosition != null && setReceiptsOpen(true)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <ThemedView style={[styles.leanTag, { backgroundColor: leanTag.bg }]}>
                      <ThemedText style={[styles.leanTagText, { color: leanTag.color }]}>{leanTag.label}</ThemedText>
                    </ThemedView>
                  </Pressable>
                )}
              </ThemedView>
              <ThemedText style={{color: '#8D8D8D', fontSize: 14}}>{timeAgo}</ThemedText>
            </ThemedView>
          </ThemedView>
          
          <ThemedView style={styles.content}>

            {/* Post text */}
            <ThemedText style={styles.text}>{article.title}</ThemedText>

            {/* Post media (if any) */}
            {article.media && (
              // <ThemedView style={styles.mediaContainer}>
                <ScalableImage
                  source={{uri: article.media}}
                  type='width'
                  dimension={screenWidth - 32}
                  style={styles.media}
                />
              // </ThemedView>
            )}

          </ThemedView>
        </ThemedView>
        {receiptPosition != null && (
          <ScorerReceipts
            visible={receiptsOpen}
            onClose={() => setReceiptsOpen(false)}
            position={receiptPosition}
            signals={article.lean_signals ?? []}
            kind="article"
          />
        )}

        {/* Interactions — same treatment as posts */}
        <ArticleActions article={article} />
            
        {/* Interactions (likes, comments, etc.) */}
        {/* <PostActions post={post} user={user} /> */}
      </ThemedView>
    </ThemedView>
    
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    flexDirection: 'column',
    // borderTopWidth: 1,
    // borderBottomWidth: 1,
    // borderTopColor: "#8D8D8D",
    // borderBottomColor: "#8D8D8D"
  },
  post: {
    paddingHorizontal: 16,
    
  },
  postContent: {
    paddingVertical: 16,
    borderColor: "#c6c6c6ff",
    borderBottomWidth: 1,
  },
  logo: {
    width: 50,
    aspectRatio: 1,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  logoFallback: {
    width: 50,
    aspectRatio: 1,
    borderRadius: 25,
    backgroundColor: '#E9C8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInitial: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
    color: '#9A00FF',
  },
  content: {
    width: screenWidth - 32, // 50 (avatar) + 12*2 (padding) + 8 (gap)
  },
  text: {
    flexShrink: 1,
    flexWrap: 'wrap',
    marginBottom: 8,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leanTag: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  leanTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  media: {
    borderRadius: 16,
    marginBottom: 8,
  },
});