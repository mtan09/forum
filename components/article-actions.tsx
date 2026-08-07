import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import ContentShareSheet from '@/components/content-share-sheet';
import { useContentInteraction, type InteractionVote } from '@/context/interactionContext';
import { usePalette } from '@/hooks/use-palette';
import { tapLight } from '@/lib/haptics';
import { api } from '@/lib/api';
import { publicArticleUrl } from '@/lib/public-links';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { type ArticleType } from './articleComponent';
import RepostSheet from '@/components/repost-sheet';

export default function ArticleActions({ article }: { article: ArticleType }) {
  const { c } = usePalette();
  const [shareOpen, setShareOpen] = useState(false);
  const [repostOpen, setRepostOpen] = useState(false);
  const { state, getCurrent, patch, update } = useContentInteraction('article', article.id, {
    upvotes: article.upvotes ?? 0,
    downvotes: article.downvotes ?? 0,
    myVote: article.my_vote ?? null,
    bookmarked: article.my_bookmark ?? false,
    commentCount: article.commentcount ?? 0,
    repostCount: article.repost_count ?? 0,
    reposted: article.my_repost ?? false,
  });
  const isBookmarked = state.bookmarked ?? false;

  // Optimistic toggle, reconciled with the server's answer
  const toggleBookmark = async () => {
    tapLight();
    const prev = isBookmarked;
    patch({ bookmarked: !prev });
    try {
      const res = await api<{ bookmarked: boolean }>('/bookmarks/toggle', {
        body: { article_id: article.id },
      });
      patch({ bookmarked: res.bookmarked });
    } catch (error: any) {
      console.log('Error toggling bookmark:', error?.message);
      patch({ bookmarked: prev });
    }
  };

  const vote = async (direction: InteractionVote) => {
    const prev = getCurrent();
    update((current) => {
      let upvotes = current.upvotes ?? 0;
      let downvotes = current.downvotes ?? 0;
      if (current.myVote === 'up') upvotes = Math.max(upvotes - 1, 0);
      if (current.myVote === 'down') downvotes = Math.max(downvotes - 1, 0);
      if (direction === 'up') upvotes += 1;
      if (direction === 'down') downvotes += 1;
      return { upvotes, downvotes, myVote: direction };
    });
    try {
      const res = await api<{ upvotes: number; downvotes: number; my_vote: InteractionVote }>(
        `/articles/${article.id}/vote`,
        { body: { direction } }
      );
      patch({ upvotes: res.upvotes, downvotes: res.downvotes, myVote: res.my_vote });
    } catch (error: any) {
      console.log('Error voting on article:', error?.message);
      patch({ upvotes: prev.upvotes, downvotes: prev.downvotes, myVote: prev.myVote });
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

  const handleShare = () => {
    tapLight();
    setShareOpen(true);
  };

  return (
    <ThemedView style={styles.container}>

      {/* Upvote */}
      <Pressable style={styles.upvote} accessibilityRole="button" accessibilityLabel={isUpvoted ? 'Remove upvote' : 'Upvote'} onPress={() => { tapLight(); vote(isUpvoted ? null : 'up'); }}>
        <ThemedView style={styles.reactions}>
          <IconSymbol name={isUpvoted ? "arrowshape.up.fill" : "arrowshape.up"} size={20} color={isUpvoted ? c.voteUp : c.textMuted} />
          <ThemedText style={{color: isUpvoted ? c.voteUp : c.textMuted}}>
            {(state.upvotes ?? 0) === 0 ? 0 : `+${formatCount(state.upvotes)}`}
          </ThemedText>
        </ThemedView>
      </Pressable>

      {/* Downvote */}
      <Pressable style={styles.downvote} accessibilityRole="button" accessibilityLabel={isDownvoted ? 'Remove downvote' : 'Downvote'} onPress={() => { tapLight(); vote(isDownvoted ? null : 'down'); }}>
        <ThemedView style={styles.reactions}>
          <IconSymbol name={isDownvoted ? "arrowshape.down.fill" : "arrowshape.down"} size={20} color={isDownvoted ? c.voteDown : c.textMuted} />
          <ThemedText style={{color: isDownvoted ? c.voteDown : c.textMuted}}>
            {(state.downvotes ?? 0) === 0 ? 0 : `-${formatCount(state.downvotes)}`}
          </ThemedText>
        </ThemedView>
      </Pressable>

      {/* Comment count */}
      <ThemedView style={[styles.reactions, styles.comments]}>
        <IconSymbol name="bubble" size={20} color={c.muted} />
        <ThemedText style={{color: c.muted}}>{formatCount(state.commentCount)}</ThemedText>
      </ThemedView>

      {/* Repost + quote */}
      <Pressable
        style={styles.repost}
        accessibilityRole="button"
        accessibilityLabel={state.reposted ? 'Repost options, reposted' : 'Repost or quote article'}
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
        <Pressable accessibilityRole="button" accessibilityLabel="Share article" onPress={handleShare}>
          <IconSymbol name="square.and.arrow.up" size={20} color={c.muted} />
        </Pressable>
      </ThemedView>

      <ContentShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        kind="article"
        contentId={article.id}
        url={publicArticleUrl(article.id)}
        message={`${article.title} (${article.source})`}
        title="Share Article"
      />
      <RepostSheet
        visible={repostOpen}
        onClose={() => setRepostOpen(false)}
        kind="article"
        id={article.id}
        initialCount={article.repost_count ?? 0}
        initiallyReposted={article.my_repost ?? false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    // iOS spreads these across a ~358pt column. Let them spread across a 600px
    // web column and the row reads as six stranded icons, so cap it.
    maxWidth: Platform.OS === 'web' ? 400 : undefined,
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
