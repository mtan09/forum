import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { Dimensions, Pressable, Share, StyleSheet } from 'react-native';
import { type ArticleType } from './articleComponent';

const screenWidth = Dimensions.get('window').width;

type VoteDirection = 'up' | 'down' | null;
type VoteState = { upvotes: number; downvotes: number; myVote: VoteDirection };

// Articles aren't held in a context like posts are, so each actions row
// owns its vote state: optimistic update, then reconcile with the server.
export default function ArticleActions({ article }: { article: ArticleType }) {
  const [isBookmarked, setBookmarked] = useState(article.my_bookmark ?? false);
  useEffect(() => setBookmarked(article.my_bookmark ?? false), [article.my_bookmark]);

  // Optimistic toggle, reconciled with the server's answer
  const toggleBookmark = async () => {
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
      <Pressable onPress={() => vote(isUpvoted ? null : 'up')}>
        <ThemedView style={[styles.reactions, styles.upvote]}>
          <IconSymbol name={isUpvoted ? "arrowshape.up.fill" : "arrowshape.up"} size={20} color={isUpvoted ? "#14DD78" : "#8D8D8D"} />
          <ThemedText style={{color: isUpvoted ? "#14DD78" : "#8D8D8D"}}>
            {state.upvotes === 0 ? 0 : `+${formatCount(state.upvotes)}`}
          </ThemedText>
        </ThemedView>
      </Pressable>

      {/* Downvote */}
      <Pressable onPress={() => vote(isDownvoted ? null : 'down')}>
        <ThemedView style={[styles.reactions, styles.downvote]}>
          <IconSymbol name={isDownvoted ? "arrowshape.down.fill" : "arrowshape.down"} size={20} color={isDownvoted ? "#FF0080" : "#8D8D8D"} />
          <ThemedText style={{color: isDownvoted ? "#FF0080" : "#8D8D8D"}}>
            {state.downvotes === 0 ? 0 : `-${formatCount(state.downvotes)}`}
          </ThemedText>
        </ThemedView>
      </Pressable>

      {/* Comment count */}
      <ThemedView style={[styles.reactions, styles.comments]}>
        <IconSymbol name="bubble" size={20} color="#8D8D8D" />
        <ThemedText lightColor={"#8D8D8D"}>{formatCount(article.commentcount)}</ThemedText>
      </ThemedView>

      {/* Bookmark */}
      <ThemedView style={[styles.reactions, styles.bookmark]}>
        <Pressable onPress={toggleBookmark}>
          <IconSymbol name={isBookmarked ? "bookmark.fill" : "bookmark"} size={20} color={isBookmarked ? "#FFD000" : "#8D8D8D"} />
        </Pressable>
      </ThemedView>

      {/* Share */}
      <ThemedView style={[styles.reactions, styles.share]}>
        <Pressable onPress={handleShare}>
          <IconSymbol name="square.and.arrow.up" size={20} color="#8D8D8D" />
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
  },
  upvote: {
    width: (screenWidth-32)/4,
  },
  downvote: {
    width: (screenWidth-32)/4,
  },
  comments: {
    width: (screenWidth-32)/4,
  },
  bookmark: {
   width: (screenWidth-32)/8,
   justifyContent: 'flex-end'
  },
  share: {
    width: (screenWidth-32)/8,
    justifyContent: 'flex-end',
  },
});
