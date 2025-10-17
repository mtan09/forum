import ScalableImage from '@/components/scalable-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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

  

  return (
    <ThemedView style={styles.container}>
      <Image 
        source={post.user.avatar ? { uri: post.user.avatar } : require('@/assets/images/Default_pfp.jpg')} 
        style={styles.avatar} 
      />


      <ThemedView style={styles.content}>

        {/* Username & timestamp */}
        <ThemedView style={styles.header}>
          <ThemedText type="defaultSemiBold">{post.user.username}</ThemedText>
        </ThemedView>

        {/* Post text */}
        <ThemedText style={styles.text}>{post.text}</ThemedText>

        {/* Post media (if any) */}
        {post.media && (
          // <ThemedView style={styles.mediaContainer}>
            <ScalableImage
              source={{uri: post.media}}
              width={screenWidth - 82}
              style={styles.media}
            />
          // </ThemedView>
        )}

        {/* Spectrum Bar */}
        <Spectrum width={(screenWidth - 82)} height={20} topic={post.topic} position={post.position}/>
        
        {/* Interactions (likes, comments, etc.) */}
        <PostActions post={post} onUpvote={onUpvote} onUnUpvote={onUnUpvote} onDownvote={onDownvote} onUnDownvote={onUnDownvote}/>

      </ThemedView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    gap: 8,
    flexDirection: 'row',
  },
  avatar: {
    width: 50,
    aspectRatio: 1,
    borderRadius: 20,
  },
  content: {
    width: screenWidth - 82, // 50 (avatar) + 12*2 (padding) + 8 (gap)
  },
  text: {
    flexShrink: 1,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
  },
  media: {
    borderRadius: 16,
    marginBottom: 8,
  },
});