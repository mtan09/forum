import ScalableImage from '@/components/scalable-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { api } from '@/lib/api';
import type { RecommendationContext } from '@/lib/feed-events';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import ContentActions from './contentActions';
import PostActions from './post-actions';
import ScorerReceipts from './scorerReceipts';
import Spectrum from './spectrum';

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
  variant?: 'feed' | 'detail';
  recommendationContext?: RecommendationContext;
}

function Post({ post, variant = 'feed', recommendationContext }: Props) {

  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const contentWidth = measuredWidth || Math.max(1, Math.min(windowWidth - 32, 700));
  const timeAgo = useRelativeTime(post.timestamp);
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const detail = variant === 'detail';

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
    <ThemedView style={[styles.post, detail && styles.postDetailWeb]}>
      <ThemedView style={[styles.postContent, detail && styles.postContentDetailWeb]}>
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
            <ThemedView style={styles.menuSlot}>
              <ContentActions
                targetKind="post"
                targetId={post.id}
                authorId={post.user}
                authorName={user.username}
                onBlocked={() => setHidden(true)}
                onNotInterested={() => setHidden(true)}
                recommendationContext={recommendationContext}
              />
            </ThemedView>
          </ThemedView>

            <ThemedView
              style={styles.content}
              onLayout={(event) => {
                const next = Math.round(event.nativeEvent.layout.width);
                if (next > 0 && next !== measuredWidth) setMeasuredWidth(next);
              }}
            >

            {/* Post text */}
            <ThemedText style={styles.text}>{post.text}</ThemedText>

            {/* Hashtags (background metadata, shown subtly) */}
            {post.hashtags && post.hashtags.length > 0 && (
              <ThemedText style={styles.hashtags}>
                {post.hashtags.map((t) => `#${t}`).join('  ')}
              </ThemedText>
            )}

            {/* Post media (if any) */}
            {post.media && Platform.OS === 'web' ? (
              <Image
                source={{ uri: post.media }}
                style={[styles.webMedia, { height: detail ? Math.min(contentWidth * 0.62, 420) : contentWidth * 9 / 16 }]}
                contentFit={detail ? 'contain' : 'cover'}
                cachePolicy="memory-disk"
              />
            ) : post.media ? (
              <ScalableImage
                source={{uri: post.media}}
                type='width'
                dimension={contentWidth}
                style={styles.media}
              />
            ) : null}

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
    paddingHorizontal: Platform.OS === 'web' ? 12 : 16,
  },
  postContent: {
    paddingVertical: 16,
    borderColor: c.border,
    borderBottomWidth: Platform.OS === 'web' ? 0 : 1,
    ...(Platform.OS === 'web' ? {
      borderWidth: 1,
      borderRadius: 18,
      backgroundColor: c.background,
      paddingHorizontal: 16,
      marginBottom: 12,
    } : {}),
  },
  postDetailWeb: {
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
  },
  postContentDetailWeb: {
    ...(Platform.OS === 'web'
      ? {
          borderWidth: 0,
          borderBottomWidth: 1,
          borderRadius: 0,
          paddingHorizontal: 20,
          marginBottom: 0,
        }
      : {}),
  },
  avatar: {
    width: 50,
    aspectRatio: 1,
    borderRadius: 25,
  },
  content: {
    width: '100%',
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
  menuSlot: {
    width: 28,
    minHeight: 32,
    paddingTop: 1,
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
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
  webMedia: {
    width: '100%',
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: c.surfaceMuted,
  },
});
