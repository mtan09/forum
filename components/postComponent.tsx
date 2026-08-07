import ScalableImage from '@/components/scalable-image';
import DisplayName from '@/components/display-name';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import UserAvatar from '@/components/user-avatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { useContentInteraction, useInteractionController } from '@/context/interactionContext';
import { usePalette } from '@/hooks/use-palette';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { api } from '@/lib/api';
import type { RecommendationContext } from '@/lib/feed-events';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import ContentActions from './contentActions';
import ContentLongPress from './content-long-press';
import PostActions from './post-actions';
import ScorerReceipts from './scorerReceipts';
import Spectrum from './spectrum';
import QuotedContentCard from './quoted-content-card';
import type { QuotedContent, RepostAttribution } from '@/types/quoted-content';
import { tapLight } from '@/lib/haptics';

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
  isDemo?: boolean;
  myVote?: 'up' | 'down' | null;
  myBookmark?: boolean;
  repostCount?: number;
  myRepost?: boolean;
  quotedContent?: QuotedContent | null;
}

export type UserType = {
  id: string;
  username: string;
  avatar_url?: string;
  is_demo?: boolean;
}

type Props = {
  post: PostType;
  variant?: 'feed' | 'detail';
  recommendationContext?: RecommendationContext;
  onDeleted?: () => void;
  repostAttribution?: RepostAttribution | null;
}

function Post({ post, variant = 'feed', recommendationContext, onDeleted, repostAttribution }: Props) {

  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const contentWidth = measuredWidth || Math.max(1, Math.min(windowWidth - 32, 700));
  const timeAgo = useRelativeTime(post.timestamp);
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { state: sharedState, patch: patchSharedState } = useContentInteraction('post', post.id, {
    deleted: false,
  });
  const interactions = useInteractionController();
  const detail = variant === 'detail';

  const [fetchedUser, setFetchedUser] = useState<UserType | null>(null);
  const user = useMemo<UserType>(() => (
    post.username
      ? { id: post.user, username: post.username, avatar_url: post.avatarUrl, is_demo: post.isDemo }
      : fetchedUser ?? { id: post.user, username: '', avatar_url: post.avatarUrl, is_demo: post.isDemo }
  ), [fetchedUser, post.avatarUrl, post.isDemo, post.user, post.username]);

  useEffect(() => {
    // Author usually arrives joined onto the post; fetch only if missing
    if (post.username) return;
    let cancelled = false;
    api<UserType>(`/users/${post.user}`)
      .then((data) => { if (!cancelled) setFetchedUser(data); })
      .catch((error) => console.log('Error fetching profile:', error?.message));
    return () => { cancelled = true; };
  }, [post.user, post.username, post.avatarUrl]);

  const handleDeleted = () => {
    patchSharedState({ deleted: true });
    if (post.quotedContent) {
      interactions.update(post.quotedContent.kind, post.quotedContent.id, (current) => ({
        repostCount: Math.max(0, (current.repostCount ?? 0) - 1),
      }));
    }
    onDeleted?.();
  };

  if (hidden || sharedState.deleted) return null;

  return (
    <ContentLongPress
      preview={{
        kind: 'post',
        id: post.id,
        authorId: post.user,
        authorName: user.username,
        authorAvatar: user.avatar_url,
        authorIsDemo: user.is_demo,
        text: post.text,
        media: post.media,
        position: post.position,
        quotedContent: post.quotedContent ?? null,
      }}
      recommendationContext={recommendationContext}
      onBlocked={() => setHidden(true)}
      onNotInterested={() => setHidden(true)}
      onDeleted={handleDeleted}
    >
    <ThemedView style={[styles.post, detail && styles.postDetailWeb]}>
      <ThemedView style={[styles.postContent, detail && styles.postContentDetailWeb]}>
        <ThemedView style={styles.container}>
          {repostAttribution ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${repostAttribution.username}'s profile`}
              onPress={() => { tapLight(); router.push(`/user/${repostAttribution.userId}`); }}
              style={({ pressed }) => [styles.repostAttribution, pressed && { opacity: 0.6 }]}
            >
              <IconSymbol name="arrow.2.squarepath" size={14} color={c.muted} />
              <ThemedText style={styles.repostAttributionText} numberOfLines={1}>
                {repostAttribution.username}{repostAttribution.isDemo ? ' (Fictional demo account)' : ''} reposted
              </ThemedText>
            </Pressable>
          ) : null}
          {/* Avatar + name open the author's public profile; overflow menu at right */}
          <ThemedView style={styles.headerRow}>
            <ThemedView style={styles.header}>
              <UserAvatar
                userId={post.user}
                avatarUrl={user.avatar_url}
                isDemo={user.is_demo}
                size={50}
              />
              <ThemedView style={styles.authorCopy}>
                <DisplayName
                  username={user.username}
                  isDemo={user.is_demo}
                  nameStyle={{ fontWeight: '800', fontSize: 18 }}
                  onUsernamePress={() => router.push(`/user/${post.user}`)}
                />
                <ThemedText style={{color: c.muted, fontSize: 14}}>{timeAgo}</ThemedText>
              </ThemedView>
            </ThemedView>
            <ThemedView style={styles.menuSlot}>
              <ContentActions
                targetKind="post"
                targetId={post.id}
                authorId={post.user}
                authorName={user.username}
                onBlocked={() => setHidden(true)}
                onNotInterested={() => setHidden(true)}
                onDeleted={handleDeleted}
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

            {post.quotedContent ? (
              <ThemedView style={styles.quoteWrap}>
                <QuotedContentCard content={post.quotedContent} />
              </ThemedView>
            ) : null}

          </ThemedView>
        </ThemedView>
        {/* Spectrum Bar — tap to see the scorer's receipts for this placement */}
        {typeof post.position === 'number' && (
          <Pressable
            onPress={() => { tapLight(); setReceiptsOpen(true); }}
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
    </ContentLongPress>

  )
}

export default memo(Post);

const makeStyles = (c: Palette) => StyleSheet.create({
  container: {
    gap: 8,
    flexDirection: 'column',
  },
  // Matches articleComponent: one continuous feed of hairline-split rows on
  // both platforms, not detached cards on web.
  post: {
    paddingHorizontal: 16,
  },
  postContent: {
    paddingVertical: 16,
    borderColor: c.border,
    borderBottomWidth: 1,
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
  content: {
    width: '100%',
  },
  repostAttribution: {
    paddingLeft: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  repostAttributionText: { flex: 1, color: c.muted, fontSize: 12, lineHeight: 16, fontWeight: '800' },
  // Post text, hashtags, and media already contribute the standard 8-point
  // content gap. Add space only beneath the quote to protect the action row.
  quoteWrap: { marginBottom: 12 },
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
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorCopy: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'transparent',
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
