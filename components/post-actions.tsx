import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import ContentShareSheet from '@/components/content-share-sheet';
import { usePalette } from '@/hooks/use-palette';
import { tapLight } from '@/lib/haptics';
import { useContentInteraction } from '@/context/interactionContext';
import { usePostVote } from '@/context/postContext';
import { api } from '@/lib/api';
import { publicPostUrl } from '@/lib/public-links';
import { Pressable, StyleSheet } from 'react-native';
import { useState } from 'react';
import { type PostType, type UserType } from './postComponent';
import RepostSheet from '@/components/repost-sheet';

export type PostActionsProps = {
  post: PostType;
  user: UserType;
}

export default function PostActions({ post, user }: PostActionsProps) {
  const { c } = usePalette();
  const [shareOpen, setShareOpen] = useState(false);
  const [repostOpen, setRepostOpen] = useState(false);
  const { state, patch } = useContentInteraction('post', post.id, {
    upvotes: post.upvotes ?? 0,
    downvotes: post.downvotes ?? 0,
    myVote: post.myVote ?? null,
    bookmarked: post.myBookmark ?? false,
    commentCount: post.commentCount ?? 0,
    repostCount: post.repostCount ?? 0,
    reposted: post.myRepost ?? false,
  });
  const isBookmarked = state.bookmarked ?? false;

  // Optimistic toggle, reconciled with the server's answer
  const toggleBookmark = async () => {
    tapLight();
    const prev = isBookmarked;
    patch({ bookmarked: !prev });
    try {
      const res = await api<{ bookmarked: boolean }>('/bookmarks/toggle', {
        body: { post_id: post.id },
      });
      patch({ bookmarked: res.bookmarked });
    } catch (error: any) {
      console.log('Error toggling bookmark:', error?.message);
      patch({ bookmarked: prev });
    }
  };

  const vote = usePostVote();

  const isUpvoted = state.myVote === 'up';
  const isDownvoted = state.myVote === 'down';

  const formatCount = (count: number | null | undefined): string => {
    if (!count) return '0';

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

  const handleShare = () => {
    tapLight();
    setShareOpen(true);
  };

  return (
    <ThemedView style={styles.container}>

      {/* Upvote */}
      <Pressable style={styles.upvote} accessibilityRole="button" accessibilityLabel={isUpvoted ? 'Remove upvote' : 'Upvote'} onPress={() => { tapLight(); vote(post.id, isUpvoted ? null : 'up'); }}>
        <ThemedView style={styles.reactions}>
          <IconSymbol name={isUpvoted ? "arrowshape.up.fill" : "arrowshape.up"} size={20} color={isUpvoted ? c.voteUp : c.textMuted} />
          <ThemedText style={{color: isUpvoted ? c.voteUp : c.textMuted}}>
            {(state.upvotes ?? 0) === 0 ? 0 : `+${formatCount(state.upvotes)}`}
          </ThemedText>
        </ThemedView>
      </Pressable>

      {/* Downvote */}
      <Pressable style={styles.downvote} accessibilityRole="button" accessibilityLabel={isDownvoted ? 'Remove downvote' : 'Downvote'} onPress={() => { tapLight(); vote(post.id, isDownvoted ? null : 'down'); }}>
        <ThemedView style={styles.reactions}>
          <IconSymbol name={isDownvoted ? "arrowshape.down.fill" : "arrowshape.down"} size={20} color={isDownvoted ? c.voteDown : c.textMuted} />
          <ThemedText style={{color: isDownvoted ? c.voteDown : c.textMuted}}>
            {(state.downvotes ?? 0) === 0 ? 0 : `-${formatCount(state.downvotes)}`}
          </ThemedText>
        </ThemedView>
      </Pressable>

      {/* Comment */}
      <ThemedView style={[styles.reactions, styles.comments]}>
        <IconSymbol name="bubble" size={20} color={c.muted} />
        <ThemedText style={{color: c.muted}}>{formatCount(state.commentCount)}</ThemedText>
      </ThemedView>

      {/* Repost + quote */}
      <Pressable
        style={styles.repost}
        accessibilityRole="button"
        accessibilityLabel={state.reposted ? 'Repost options, reposted' : 'Repost or quote post'}
        onPress={() => { tapLight(); setRepostOpen(true); }}
      >
        <ThemedView style={styles.reactions}>
          <IconSymbol name="arrow.2.squarepath" size={20} color={state.reposted ? c.primary : c.textMuted} />
          <ThemedText style={{ color: state.reposted ? c.primary : c.textMuted }}>
            {formatCount(state.repostCount)}
          </ThemedText>
        </ThemedView>
      </Pressable>

      {/* Bookmark */}
      <ThemedView style={[styles.reactions, styles.bookmark]}>
        <Pressable accessibilityRole="button" accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark'} onPress={toggleBookmark}>
          <IconSymbol name={isBookmarked ? "bookmark.fill" : "bookmark"} size={20} color={isBookmarked ? c.bookmark : c.textMuted} />
        </Pressable>
      </ThemedView>

      {/* Share */}
      <ThemedView style={[styles.reactions, styles.share]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Share post" onPress={handleShare}>
          <IconSymbol name="square.and.arrow.up" size={20} color={c.muted} />
        </Pressable>
      </ThemedView>

      <ContentShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        kind="post"
        contentId={post.id}
        url={publicPostUrl(post.id)}
        message={`${user.username}${post.isDemo ? ' (Fictional demo account)' : ''} on forum: "${post.text.slice(0, 120)}"`}
        title="Share Post"
      />
      <RepostSheet
        visible={repostOpen}
        onClose={() => setRepostOpen(false)}
        kind="post"
        id={post.id}
        initialCount={post.repostCount ?? 0}
        initiallyReposted={post.myRepost ?? false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
  },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
  },
  upvote: {
    flex: 2,
  },
  downvote: {
    flex: 2,
  },
  comments: {
    flex: 2,
  },
  repost: { flex: 2 },
  bookmark: {
   flex: 1,
   justifyContent: 'flex-end'
  },
  share: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
