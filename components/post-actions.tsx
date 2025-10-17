import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState } from 'react';
import { Pressable, Share, StyleSheet } from 'react-native';
import { type PostType } from './post';

export type PostActionsProps = {
  post: PostType;
  onUpvote: () => void;
  onUnUpvote: () => void;
  onDownvote: () => void;
  onUnDownvote: () => void;
}

export default function PostActions({ post, onUpvote, onUnUpvote, onDownvote, onUnDownvote }: PostActionsProps) {
  const [isUpvoted, setUpvoted] = useState(false);
  const [isDownvoted, setDownvoted] = useState(false);
  const [isBookmarked, setBookmarked] = useState(false);

  const formatCount = (count: number): string => {
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
      await Share.share({
        message: `Check out this post by ${post.user.username}: "${post.text}"`,
        url: 'https://yourapp.com/posts/' + post.id,
        title: 'Share Post',
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ThemedView style={styles.container}>

      {/* Upvote */}
      <ThemedView style={[styles.reactions, styles.upvote]}>
        <Pressable onPress={() => {
          if (isUpvoted) {
            setUpvoted(false);
            onUnUpvote();
          } else if (isDownvoted) {
            setDownvoted(false);
            onUnDownvote();
            setUpvoted(true);
            onUpvote();
          } else {
            setUpvoted(true);
            onUpvote();
          }
        }}>
          <IconSymbol name={isUpvoted ? "arrowshape.up.fill" : "arrowshape.up"} size={20} color={isUpvoted ? "#14DD78" : "#8D8D8D"} />
        </Pressable>
        <ThemedText lightColor = "#8D8D8D">
          {post.upvotes === 0 ? post.upvotes : `+${formatCount(post.upvotes)}`}
        </ThemedText>
      </ThemedView>

      {/* Downvote */}
      <ThemedView style={[styles.reactions, styles.downvote]}>
        <Pressable onPress={() => {
          if (isDownvoted) {
            setDownvoted(false);
            onUnDownvote();
          } else if (isUpvoted) {
            setUpvoted(false);
            onUnUpvote();
            setDownvoted(true);
            onDownvote();
          } else {
            setDownvoted(true);
            onDownvote();
          }
        }}>
          <IconSymbol name={isDownvoted ? "arrowshape.down.fill" : "arrowshape.down"} size={20} color={isDownvoted ? "#FF0080" : "#8D8D8D"} />
        </Pressable>
        <ThemedText lightColor = "#8D8D8D">
          {post.downvotes === 0 ? post.downvotes: `-${formatCount(post.downvotes)}`}
        </ThemedText>
      </ThemedView>
      
      {/* Comment */}
      <ThemedView style={[styles.reactions, styles.comments]}>
        <Pressable onPress={() => {
          console.log("Comment button pressed");
          // Add navigation to comments screen
        }}>
          <IconSymbol name="bubble" size={20} color="#8D8D8D" />
        </Pressable>
        <ThemedText lightColor={"#8D8D8D"}>{formatCount(post.commentCount)}</ThemedText>
      </ThemedView>
      
      {/* Bookmark */}
      <ThemedView style={[styles.reactions, styles.bookmark]}>
        <Pressable onPress={() => {
          console.log("Bookmark button pressed");
          setBookmarked(!isBookmarked);

          //Functionality later
        }}>
          <IconSymbol name={isBookmarked ? "bookmark.fill" : "bookmark"} size={20} color={isBookmarked ? "#FFD000" : "#8D8D8D"} />
        </Pressable>
      </ThemedView>

      {/* Share */}
      <ThemedView style={[styles.reactions, styles.share]}>
        <Pressable onPress={() => {
          console.log("Share button pressed");
          handleShare();
        }}>
          <IconSymbol name="square.and.arrow.up" size={20} color="#8D8D8D" />
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    // justifyContent: 'space-between',
  },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
  },
  upvote: {
    width: 92,
    marginRight: 8,
  },
  downvote: {
    width: 92,
  },
  comments: {
    width: 92,
    marginLeft: 8,
  },
  bookmark: {
    marginLeft: 8,
  },
  share: {
    marginLeft: 8,
  },
});