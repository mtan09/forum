import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePalette } from '@/hooks/use-palette';
import { notifySuccess, tapLight } from '@/lib/haptics';
import { usePostVote } from '@/context/postContext';
import { api, API_URL } from '@/lib/api';
import { Pressable, Share, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { type PostType, type UserType } from './postComponent';

export type PostActionsProps = {
  post: PostType;
  user: UserType;
}

export default function PostActions({ post, user }: PostActionsProps) {
  const { c } = usePalette();
  const [isBookmarked, setBookmarked] = useState(post.myBookmark ?? false);
  useEffect(() => setBookmarked(post.myBookmark ?? false), [post.myBookmark]);

  // Optimistic toggle, reconciled with the server's answer
  const toggleBookmark = async () => {
    tapLight();
    const prev = isBookmarked;
    setBookmarked(!prev);
    try {
      const res = await api<{ bookmarked: boolean }>('/bookmarks/toggle', {
        body: { post_id: post.id },
      });
      setBookmarked(res.bookmarked);
    } catch (error: any) {
      console.log('Error toggling bookmark:', error?.message);
      setBookmarked(prev);
    }
  };

  const vote = usePostVote();

  const isUpvoted = post.myVote === 'up';
  const isDownvoted = post.myVote === 'down';

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

  const handleShare = async () => {
    try {
      notifySuccess();
      await Share.share({
        message: `${user.username} on forum: "${post.text.slice(0, 120)}"`,
        // Lands on the API's share page: OG preview + open-in-app link
        url: `${API_URL}/p/${post.id}`,
        title: 'Share Post',
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ThemedView style={styles.container}>

      {/* Upvote */}
      <Pressable style={styles.upvote} accessibilityRole="button" accessibilityLabel={isUpvoted ? 'Remove upvote' : 'Upvote'} onPress={() => { tapLight(); vote(post.id, isUpvoted ? null : 'up'); }}>
        <ThemedView style={styles.reactions}>
          <IconSymbol name={isUpvoted ? "arrowshape.up.fill" : "arrowshape.up"} size={20} color={isUpvoted ? c.voteUp : c.textMuted} />
          <ThemedText style={{color: isUpvoted ? c.voteUp : c.textMuted}}>
            {post.upvotes === 0 ? post.upvotes : `+${formatCount(post.upvotes)}`}
          </ThemedText>
        </ThemedView>
      </Pressable>

      {/* Downvote */}
      <Pressable style={styles.downvote} accessibilityRole="button" accessibilityLabel={isDownvoted ? 'Remove downvote' : 'Downvote'} onPress={() => { tapLight(); vote(post.id, isDownvoted ? null : 'down'); }}>
        <ThemedView style={styles.reactions}>
          <IconSymbol name={isDownvoted ? "arrowshape.down.fill" : "arrowshape.down"} size={20} color={isDownvoted ? c.voteDown : c.textMuted} />
          <ThemedText style={{color: isDownvoted ? c.voteDown : c.textMuted}}>
            {post.downvotes === 0 ? post.downvotes: `-${formatCount(post.downvotes)}`}
          </ThemedText>
        </ThemedView>
      </Pressable>

      {/* Comment */}
      <ThemedView style={[styles.reactions, styles.comments]}>
        <IconSymbol name="bubble" size={20} color={c.muted} />
        <ThemedText style={{color: c.muted}}>{formatCount(post.commentCount)}</ThemedText>
      </ThemedView>

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
  bookmark: {
   flex: 1,
   justifyContent: 'flex-end'
  },
  share: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
