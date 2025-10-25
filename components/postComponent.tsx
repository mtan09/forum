import ScalableImage from '@/components/scalable-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { Dimensions, Image, StyleSheet } from 'react-native';
import PostActions from './post-actions';
import Spectrum from './spectrum';

const screenWidth = Dimensions.get('window').width;

export type PostType = {
  id: string;
  user: {
    username: string;
    avatar?: string;
  }
  text: string;
  timestamp: string;
  media?: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  topic: string;
  position: number;
}

type Props = {
  post: PostType;
  onUpvote: () => void;
  onUnUpvote: () => void;
  onDownvote: () => void;
  onUnDownvote: () => void;
}

export default function Post({ post, onUpvote, onUnUpvote, onDownvote, onUnDownvote }: Props) {

  const timeAgo = useRelativeTime(post.timestamp);

  return (
    <ThemedView style={styles.post}>
      <ThemedView style={styles.postContent}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <Image 
              source={post.user.avatar ? { uri: post.user.avatar } : require('@/assets/images/Default_pfp.jpg')} 
              style={styles.avatar} 
            />
            <ThemedView>
              <ThemedText type="defaultSemiBold" style={{fontWeight: 800, fontSize: 18}}>{post.user.username}</ThemedText>
              <ThemedText style={{color: '#8D8D8D', fontSize: 14}}>{timeAgo}</ThemedText>
            </ThemedView>
          </ThemedView>
          
          <ThemedView style={styles.content}>

            {/* Post text */}
            <ThemedText style={styles.text}>{post.text}</ThemedText>

            {/* Post media (if any) */}
            {post.media && (
              // <ThemedView style={styles.mediaContainer}>
                <ScalableImage
                  source={{uri: post.media}}
                  type='width'
                  dimension={screenWidth - 32}
                  style={styles.media}
                />
              // </ThemedView>
            )}

          </ThemedView>
        </ThemedView>
        {/* Spectrum Bar */}
        <Spectrum width={(screenWidth - 32)} height={20} topic={post.topic} position={post.position}/>
            
        {/* Interactions (likes, comments, etc.) */}
        <PostActions post={post} onUpvote={onUpvote} onUnUpvote={onUnUpvote} onDownvote={onDownvote} onUnDownvote={onUnDownvote}/>
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
  avatar: {
    width: 50,
    aspectRatio: 1,
    borderRadius: 20,
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