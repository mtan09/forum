import ScalableImage from '@/components/scalable-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { Dimensions, StyleSheet } from 'react-native';
import Spectrum from './spectrum';

const screenWidth = Dimensions.get('window').width;

export type ArticleType = {
  id: string;
  url: string;
  title: string;
  source: string;
  content: string;
  media: string;
  political_lean: number;
  general_topic_id: string;
  published_at: string;
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

  return (
    <ThemedView style={styles.post}>
      <ThemedView style={styles.postContent}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <ThemedText style={styles.emoji}>
              {article.political_lean < .35 ? '🟦' : article.political_lean > .65 ? '🟥' : '🟪'}
            </ThemedText>
            <ThemedView>
              <ThemedText type="defaultSemiBold" style={{fontWeight: 800, fontSize: 18}}>{article.source}</ThemedText>
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
        {/* Spectrum Bar */}
        <Spectrum width={(screenWidth - 32)} height={20} topic={"Political Lean:"} position={article.political_lean}/>
        {/* topic={post.topic} */}
            
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
  emoji: {
    width: 50,
    fontSize: 32,
    textAlign: 'center',
    lineHeight: 50,
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
  media: {
    borderRadius: 16,
    marginBottom: 8,
  },
});