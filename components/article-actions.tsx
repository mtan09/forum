import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePalette } from '@/hooks/use-palette';
import { notifySuccess, tapLight } from '@/lib/haptics';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet } from 'react-native';
import { type ArticleType } from './articleComponent';

type VoteDirection = 'up' | 'down' | null;
type VoteState = { upvotes: number; downvotes: number; myVote: VoteDirection };

// Articles aren't held in a context like posts are, so each actions row
// owns its vote state: optimistic update, then reconcile with the server.
export default function ArticleActions({ article }: { article: ArticleType }) {
  const { c } = usePalette();
  const [isBookmarked, setBookmarked] = useState(article.my_bookmark ?? false);
  useEffect(() => setBookmarked(article.my_bookmark ?? false), [article.my_bookmark]);

  // Optimistic toggle, reconciled with the server's answer
  const toggleBookmark = async () => {
    tapLight();
    const prev = isBookmarked;
    setBookmarked(!prev);
    try {
      const res = await api<{ bookmarked: boolean }>('/bookmarks/toggle', {
        body: { article_id: article.id },
      });
      setBookmarked(res.bookmarked);
    } catch (error: any) {
      console.log('Error toggling bookmark:', error?.message);
      setBookmarked(prev);
    }
  };

  const [state, setState] = useState<VoteState>({
    upvotes: article.upvotes ?? 0,
    downvotes: article.downvotes ?? 0,
    myVote: article.my_vote ?? null,
  });

  const applyVote = (prev: VoteState, direction: VoteDirection): VoteState => {
    let { upvotes, downvotes } = prev;
    if (prev.myVote === 'up') upvotes = Math.max(upvotes - 1, 0);
    if (prev.myVote === 'down') downvotes = Math.max(downvotes - 1, 0);
    if (direction === 'up') upvotes += 1;
    if (direction === 'down') downvotes += 1;
    return { upvotes, downvotes, myVote: direction };
  };

  const vote = async (direction: VoteDirection) => {
    const prev = state;
    setState(applyVote(prev, direction));
    try {
      const res = await api<{ upvotes: number; downvotes: number; my_vote: VoteDirection }>(
        `/articles/${article.id}/vote`,
        { body: { direction } }
      );
      setState({ upvotes: res.upvotes, downvotes: res.downvotes, myVote: res.my_vote });
    } catch (error: any) {
      console.log('Error voting on article:', error?.message);
      setState(prev);
    }
  };

  const isUpvoted = state.myVote === 'up';
  const isDownvoted = state.myVote === 'down';

  const formatCount = (count: number | null | undefined): string => {
    if (!count) return '0';
    if (count >= 1000000) {
      return (count / 1000000).toFixed(count / 1000000 >= 10 ? 0 : 1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(count / 1000 >= 10 ? 0 : 1) + 'k';
    }
    return count.toString();
  };

  const handleShare = async () => {
    try {
      notifySuccess();
      await Share.share({
        message: `${article.title} (${article.source})`,
        url: article.url,
        title: 'Share Article',
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ThemedView style={styles.container}>

      {/* Upvote */}
      <Pressable style={styles.upvote} accessibilityRole="button" accessibilityLabel={isUpvoted ? 'Remove upvote' : 'Upvote'} onPress={() => { tapLight(); vote(isUpvoted ? null : 'up'); }}>
        <ThemedView style={styles.reactions}>
          <IconSymbol name={isUpvoted ? "arrowshape.up.fill" : "arrowshape.up"} size={20} color={isUpvoted ? c.voteUp : c.textMuted} />
          <ThemedText style={{color: isUpvoted ? c.voteUp : c.textMuted}}>
            {state.upvotes === 0 ? 0 : `+${formatCount(state.upvotes)}`}
          </ThemedText>
        </ThemedView>
      </Pressable>

      {/* Downvote */}
      <Pressable style={styles.downvote} accessibilityRole="button" accessibilityLabel={isDownvoted ? 'Remove downvote' : 'Downvote'} onPress={() => { tapLight(); vote(isDownvoted ? null : 'down'); }}>
        <ThemedView style={styles.reactions}>
          <IconSymbol name={isDownvoted ? "arrowshape.down.fill" : "arrowshape.down"} size={20} color={isDownvoted ? c.voteDown : c.textMuted} />
          <ThemedText style={{color: isDownvoted ? c.voteDown : c.textMuted}}>
            {state.downvotes === 0 ? 0 : `-${formatCount(state.downvotes)}`}
          </ThemedText>
        </ThemedView>
      </Pressable>

      {/* Comment count */}
      <ThemedView style={[styles.reactions, styles.comments]}>
        <IconSymbol name="bubble" size={20} color={c.muted} />
        <ThemedText style={{color: c.muted}}>{formatCount(article.commentcount)}</ThemedText>
      </ThemedView>

      {/* Bookmark */}
      <ThemedView style={[styles.reactions, styles.bookmark]}>
        <Pressable accessibilityRole="button" accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark'} onPress={toggleBookmark}>
          <IconSymbol name={isBookmarked ? "bookmark.fill" : "bookmark"} size={20} color={isBookmarked ? c.bookmark : c.textMuted} />
        </Pressable>
      </ThemedView>

      {/* Share */}
      <ThemedView style={[styles.reactions, styles.share]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Share article" onPress={handleShare}>
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
