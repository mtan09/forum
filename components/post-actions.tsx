import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePosts } from '@/context/postContext';
import { useState } from 'react';
import { Dimensions, Pressable, Share, StyleSheet } from 'react-native';
import { type PostType, type UserType } from './postComponent';

export type PostActionsProps = {
  post: PostType;
  user: UserType;
}

const screenWidth = Dimensions.get('window').width;

export default function PostActions({ post, user }: PostActionsProps) {
  const [isUpvoted, setUpvoted] = useState(false);
  const [isDownvoted, setDownvoted] = useState(false);
  const [isBookmarked, setBookmarked] = useState(false);

  const { posts, setPosts, error, handleUpvote, handleUnUpvote, handleDownvote, handleUnDownvote } = usePosts();

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
      await Share.share({
        message: `Check out this post by ${user.username}: "${post.text}"`,
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
      <Pressable onPress={() => {
          if (isUpvoted) {
            setUpvoted(false);
            handleUnUpvote(post.id);
          } else if (isDownvoted) {
            setDownvoted(false);
            handleUnDownvote(post.id);
            setUpvoted(true);
            handleUpvote(post.id);
          } else {
            setUpvoted(true);
            handleUpvote(post.id);
          }
        }}>
        <ThemedView style={[styles.reactions, styles.upvote]}>
          <IconSymbol name={isUpvoted ? "arrowshape.up.fill" : "arrowshape.up"} size={20} color={isUpvoted ? "#14DD78" : "#8D8D8D"} />
          <ThemedText style={{color: isUpvoted ? "#14DD78" : "#8D8D8D"}}>
            {post.upvotes === 0 ? post.upvotes : `+${formatCount(post.upvotes)}`}
          </ThemedText>
        </ThemedView>
      </Pressable>

      {/* Downvote */}
      <Pressable onPress={() => {
          if (isDownvoted) {
            setDownvoted(false);
            handleUnDownvote(post.id);
          } else if (isUpvoted) {
            setUpvoted(false);
            handleUnUpvote(post.id);
            setDownvoted(true);
            handleDownvote(post.id);
          } else {
            setDownvoted(true);
            handleDownvote(post.id);
          }
        }}>
        <ThemedView style={[styles.reactions, styles.downvote]}>
          <IconSymbol name={isDownvoted ? "arrowshape.down.fill" : "arrowshape.down"} size={20} color={isDownvoted ? "#FF0080" : "#8D8D8D"} />
          <ThemedText style={{color: isDownvoted ? "#FF0080" : "#8D8D8D"}}>
            {post.downvotes === 0 ? post.downvotes: `-${formatCount(post.downvotes)}`}
          </ThemedText>
        </ThemedView>
      </Pressable>
      
      {/* Comment */}
      <Pressable onPress={() => {
          console.log("Comment button pressed");
          // Add navigation to comments screen
        }}>
      <ThemedView style={[styles.reactions, styles.comments]}>
        <IconSymbol name="bubble" size={20} color="#8D8D8D" />
        <ThemedText lightColor={"#8D8D8D"}>{formatCount(post.commentCount)}</ThemedText>
      </ThemedView>
      </Pressable>
      
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