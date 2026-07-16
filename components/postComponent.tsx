import ScalableImage from '@/components/scalable-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet } from 'react-native';
import PostActions from './post-actions';
import Spectrum from './spectrum';

const screenWidth = Dimensions.get('window').width;

export type PostType = {
  id: string;
  user: string;
  text: string;
  timestamp: string;
  media?: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  topic: string;
  position: number;
  // author info joined in by the API
  username?: string;
  avatarUrl?: string;
  myVote?: 'up' | 'down' | null;
}

export type UserType = {
  id: string;
  username: string;
  avatar_url?: string;
}

type Props = {
  post: PostType;
}

export default function Post({ post }: Props) {

  const timeAgo = useRelativeTime(post.timestamp);

  const [ user, setUser ] = useState<UserType>({
    id: post.user,
    username: post.username ?? '',
    avatar_url: post.avatarUrl,
  });

  useEffect(() => {
    // Author usually arrives joined onto the post; fetch only if missing
    if (post.username) {
      setUser({ id: post.user, username: post.username, avatar_url: post.avatarUrl });
      return;
    }
    let cancelled = false;
    api<UserType>(`/users/${post.user}`)
      .then((data) => { if (!cancelled) setUser(data); })
      .catch((error) => console.log('Error fetching profile:', error?.message));
    return () => { cancelled = true; };
  }, [post.user, post.username, post.avatarUrl]);

  return (
    <ThemedView style={styles.post}>
      <ThemedView style={styles.postContent}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <Image
              source={user.avatar_url ? { uri: user.avatar_url } : require('@/assets/images/Default_pfp.jpg')}
              style={styles.avatar}
            />
            <ThemedView>
              <ThemedText type="defaultSemiBold" style={{fontWeight: 800, fontSize: 18}}>{user.username}</ThemedText>
              <ThemedText style={{color: '#8D8D8D', fontSize: 14}}>{timeAgo}</ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.content}>

            {/* Post text */}
            <ThemedText style={styles.text}>{post.text}</ThemedText>

            {/* Post media (if any) */}
            {post.media && (
              <ScalableImage
                source={{uri: post.media}}
                type='width'
                dimension={screenWidth - 32}
                style={styles.media}
              />
            )}

          </ThemedView>
        </ThemedView>
        {/* Spectrum Bar */}
        <Spectrum width={(screenWidth - 32)} height={20}  position={post.position}/>

        {/* Interactions (likes, comments, etc.) */}
        <PostActions post={post} user={user} />
      </ThemedView>
    </ThemedView>

  )
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    flexDirection: 'column',
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
    borderRadius: 25,
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
