import ScalableImage from '@/components/scalable-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { api } from '@/lib/api';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, StyleSheet } from 'react-native';
import ContentActions from './contentActions';
import PostActions from './post-actions';
import ScorerReceipts from './scorerReceipts';
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
  hashtags?: string[];
  position: number | null;
  // scorer receipts (why the post landed where it did)
  positionSignals?: string[];
  positionConfidence?: number | null;
  scorerVersion?: string;
  // author info joined in by the API
  username?: string;
  avatarUrl?: string;
  myVote?: 'up' | 'down' | null;
  myBookmark?: boolean;
}

export type UserType = {
  id: string;
  username: string;
  avatar_url?: string;
}

type Props = {
  post: PostType;
}

function Post({ post }: Props) {

  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const contentWidth = screenWidth - 32;
  const timeAgo = useRelativeTime(post.timestamp);
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  const [fetchedUser, setFetchedUser] = useState<UserType | null>(null);
  const user = useMemo<UserType>(() => (
    post.username
      ? { id: post.user, username: post.username, avatar_url: post.avatarUrl }
      : fetchedUser ?? { id: post.user, username: '', avatar_url: post.avatarUrl }
  ), [fetchedUser, post.avatarUrl, post.user, post.username]);

  useEffect(() => {
    // Author usually arrives joined onto the post; fetch only if missing
    if (post.username) return;
    let cancelled = false;
    api<UserType>(`/users/${post.user}`)
      .then((data) => { if (!cancelled) setFetchedUser(data); })
      .catch((error) => console.log('Error fetching profile:', error?.message));
    return () => { cancelled = true; };
  }, [post.user, post.username, post.avatarUrl]);

  if (hidden) return null;

  return (
    <ThemedView style={styles.post}>
      <ThemedView style={styles.postContent}>
        <ThemedView style={styles.container}>
          {/* Avatar + name open the author's public profile; overflow menu at right */}
          <ThemedView style={styles.headerRow}>
            <Pressable
              onPress={() => router.push(`/user/${post.user}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0, flex: 1 })}
            >
              <ThemedView style={styles.header}>
                <Image
                  source={user.avatar_url ? { uri: user.avatar_url } : require('@/assets/images/Default_pfp.jpg')}
                  style={styles.avatar}
                  cachePolicy="memory-disk"
                  recyclingKey={user.avatar_url ?? `avatar:${post.user}`}
                />
                <ThemedView>
                  <ThemedText type="defaultSemiBold" style={{fontWeight: 800, fontSize: 18}}>{user.username}</ThemedText>
                  <ThemedText style={{color: c.muted, fontSize: 14}}>{timeAgo}</ThemedText>
                </ThemedView>
              </ThemedView>
            </Pressable>
            <ContentActions
              targetKind="post"
              targetId={post.id}
              authorId={post.user}
              authorName={user.username}
              onBlocked={() => setHidden(true)}
            />
          </ThemedView>

          <ThemedView style={styles.content}>

            {/* Post text */}
            <ThemedText style={styles.text}>{post.text}</ThemedText>

            {/* Hashtags (background metadata, shown subtly) */}
            {post.hashtags && post.hashtags.length > 0 && (
              <ThemedText style={styles.hashtags}>
                {post.hashtags.map((t) => `#${t}`).join('  ')}
              </ThemedText>
            )}

            {/* Post media (if any) */}
            {post.media && (
              <ScalableImage
                source={{uri: post.media}}
                type='width'
                dimension={contentWidth}
                style={styles.media}
              />
            )}

          </ThemedView>
        </ThemedView>
        {/* Spectrum Bar — tap to see the scorer's receipts for this placement */}
        {typeof post.position === 'number' && (
          <Pressable
            onPress={() => setReceiptsOpen(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Why this placement? Show scoring receipts"
          >
            <Spectrum width={contentWidth} height={20} position={post.position}/>
          </Pressable>
        )}

        {typeof post.position === 'number' && receiptsOpen && (
          <ScorerReceipts
            visible
            onClose={() => setReceiptsOpen(false)}
            position={post.position}
            signals={post.positionSignals ?? []}
            kind="post"
          />
        )}

        {/* Interactions (likes, comments, etc.) */}
        <PostActions post={post} user={user} />
      </ThemedView>
    </ThemedView>

  )
}

export default memo(Post);

const makeStyles = (c: Palette) => StyleSheet.create({
  container: {
    gap: 8,
    flexDirection: 'column',
  },
  post: {
    paddingHorizontal: 16,

  },
  postContent: {
    paddingVertical: 16,
    borderColor: c.border,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 50,
    aspectRatio: 1,
    borderRadius: 25,
  },
  content: {
    width: screenWidth - 32,
  },
  text: {
    flexShrink: 1,
    flexWrap: 'wrap',
    marginBottom: 8,
    fontSize: 16,
  },
  hashtags: {
    color: c.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
