import { PostType } from '@/components/postComponent';
import { useInteractionController } from '@/context/interactionContext';
import { api } from '@/lib/api';
import { mapQuotedContent } from '@/lib/quoted-content';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './authContext';

export type VoteDirection = 'up' | 'down' | null;

type PostContextType = {
  /** Normalized entity cache used by detail, profile, Following, and Home. */
  posts: PostType[];
  /** Only the ordered, paginated IDs belonging to the main Home feed. */
  feedPosts: PostType[];
  setPosts: React.Dispatch<React.SetStateAction<PostType[]>>;
  isLoading: boolean;
  error: string | null;
  refresh: (options?: { bumpEpoch?: boolean }) => Promise<PostType[]>;
  vote: (postId: string, direction: VoteDirection) => Promise<void>;
  /** Load the next page; resolves with the newly appended posts. */
  loadMorePosts: () => Promise<PostType[]>;
  hasMorePosts: boolean;
  /** Bumps for standalone post resets; Home suppresses it during its coordinated refresh. */
  postsEpoch: number;
  /** Fetch a single post into the context if it isn't already loaded. */
  ensurePost: (id: string) => Promise<void>;
};

const PostContext = createContext<PostContextType | null>(null);
const PostVoteContext = createContext<PostContextType['vote'] | null>(null);

export const mapPost = (row: any): PostType => ({
  id: String(row.id),
  user: String(row.user_id),
  text: row.content ?? '',
  timestamp: row.created_at,
  media: row.media_url ?? undefined,
  upvotes: row.upvotes ?? 0,
  downvotes: row.downvotes ?? 0,
  commentCount: row.commentcount ?? 0,
  topic: row.general_topic_id ?? 'general',
  hashtags: row.hashtags ?? [],
  // null = no directional evidence; the post shows no placement
  position: typeof row.position === 'number' ? row.position : null,
  // scorer receipts: the exact signals that produced the placement
  positionSignals: row.position_signals ?? [],
  positionConfidence: typeof row.position_confidence === 'number' ? row.position_confidence : null,
  scorerVersion: row.scorer_version ?? undefined,
  username: row.username,
  avatarUrl: row.avatar_url ?? undefined,
  isDemo: !!row.is_demo,
  myVote: row.my_vote ?? null,
  myBookmark: row.my_bookmark ?? false,
  repostCount: row.repost_count ?? 0,
  myRepost: row.my_repost ?? false,
  quotedContent: mapQuotedContent(row.quoted_content),
});

const sameArray = <T,>(left?: T[], right?: T[]): boolean => {
  if (left === right) return true;
  if (!left || !right || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};

// Preserve object identity for unchanged normalized entities. Memoized feed
// rows can then skip work when a refresh returns the same server snapshot.
export const reusePostSnapshot = (current: PostType | undefined, next: PostType): PostType => {
  if (!current) return next;
  const unchanged =
    current.id === next.id &&
    current.user === next.user &&
    current.text === next.text &&
    current.timestamp === next.timestamp &&
    current.media === next.media &&
    current.upvotes === next.upvotes &&
    current.downvotes === next.downvotes &&
    current.commentCount === next.commentCount &&
    current.topic === next.topic &&
    current.position === next.position &&
    current.positionConfidence === next.positionConfidence &&
    current.scorerVersion === next.scorerVersion &&
    current.username === next.username &&
    current.avatarUrl === next.avatarUrl &&
    current.isDemo === next.isDemo &&
    current.myVote === next.myVote &&
    current.myBookmark === next.myBookmark &&
    current.repostCount === next.repostCount &&
    current.myRepost === next.myRepost &&
    JSON.stringify(current.quotedContent) === JSON.stringify(next.quotedContent) &&
    sameArray(current.hashtags, next.hashtags) &&
    sameArray(current.positionSignals, next.positionSignals);
  return unchanged ? current : next;
};

// Applies a vote change to local counts before the server confirms
const applyVote = (post: PostType, direction: VoteDirection): PostType => {
  let { upvotes, downvotes } = post;
  if (post.myVote === 'up') upvotes = Math.max(upvotes - 1, 0);
  if (post.myVote === 'down') downvotes = Math.max(downvotes - 1, 0);
  if (direction === 'up') upvotes += 1;
  if (direction === 'down') downvotes += 1;
  return { ...post, upvotes, downvotes, myVote: direction };
};

// Posts page in from the API instead of loading the whole table — the feed
// appends pages on scroll, exactly like articles already do.
const POSTS_PAGE = 15;

export function PostProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [feedPostIds, setFeedPostIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [postsEpoch, setPostsEpoch] = useState(0);
  const { isAuthenticated } = useAuth();
  const interactions = useInteractionController();

  const postsRef = useRef<PostType[]>([]);
  useEffect(() => { postsRef.current = posts; }, [posts]);
  const feedPostIdsRef = useRef<string[]>([]);
  const loadingMoreRef = useRef(false);

  const feedPosts = useMemo(() => {
    const postsById = new Map(posts.map((post) => [post.id, post]));
    return feedPostIds.map((id) => postsById.get(id)).filter((post): post is PostType => !!post);
  }, [feedPostIds, posts]);

  const refresh = useCallback(async (options: { bumpEpoch?: boolean } = {}): Promise<PostType[]> => {
    try {
      const rows = await api<any[]>(`/posts?limit=${POSTS_PAGE}&offset=0`);
      const fresh = rows.map(mapPost);
      setPosts((current) => {
        const currentById = new Map(current.map((post) => [post.id, post]));
        const nextById = new Map(currentById);
        fresh.forEach((post) => nextById.set(post.id, reusePostSnapshot(currentById.get(post.id), post)));
        return Array.from(nextById.values());
      });
      const freshIds = fresh.map((post) => post.id);
      feedPostIdsRef.current = freshIds;
      setFeedPostIds(freshIds);
      setHasMorePosts(rows.length === POSTS_PAGE);
      if (options.bumpEpoch !== false) setPostsEpoch((e) => e + 1);
      setError(null);
      return fresh;
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load posts');
      const postsById = new Map(postsRef.current.map((post) => [post.id, post]));
      return feedPostIdsRef.current.map((id) => postsById.get(id)).filter((post): post is PostType => !!post);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMorePosts = useCallback(async (): Promise<PostType[]> => {
    if (loadingMoreRef.current) return [];
    loadingMoreRef.current = true;
    try {
      const rows = await api<any[]>(`/posts?limit=${POSTS_PAGE}&offset=${feedPostIdsRef.current.length}`);
      setHasMorePosts(rows.length === POSTS_PAGE);
      const fresh = rows.map(mapPost);
      setPosts((prev) => {
        const nextById = new Map(prev.map((post) => [post.id, post]));
        fresh.forEach((post) => nextById.set(post.id, reusePostSnapshot(nextById.get(post.id), post)));
        return Array.from(nextById.values());
      });
      const nextIds = [...new Set([...feedPostIdsRef.current, ...fresh.map((post) => post.id)])];
      feedPostIdsRef.current = nextIds;
      setFeedPostIds(nextIds);
      return fresh;
    } catch (err: any) {
      console.log('Error loading more posts:', err?.message);
      return [];
    } finally {
      loadingMoreRef.current = false;
    }
  }, []);

  // Content reached by direct navigation (search results, deep links,
  // profile tabs) may not be in the paged feed yet.
  const ensurePost = useCallback(async (id: string) => {
    if (postsRef.current.some((p) => p.id === id)) return;
    try {
      const row = await api<any>(`/posts/${id}`);
      const mapped = mapPost(row);
      setPosts((prev) => (prev.some((p) => p.id === id) ? prev : [...prev, mapped]));
    } catch (err: any) {
      console.log('Error fetching post:', err?.message);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refresh();
  }, [isAuthenticated, refresh]);

  const vote = useCallback(
    async (postId: string, direction: VoteDirection) => {
      const currentPost = postsRef.current.find((post) => post.id === postId);
      const fallback = currentPost ? {
        upvotes: currentPost.upvotes,
        downvotes: currentPost.downvotes,
        myVote: currentPost.myVote ?? null,
        bookmarked: currentPost.myBookmark ?? false,
        commentCount: currentPost.commentCount,
      } : {};
      const previous = interactions.get('post', postId, fallback);
      interactions.update('post', postId, (current) => {
        let upvotes = current.upvotes ?? 0;
        let downvotes = current.downvotes ?? 0;
        if (current.myVote === 'up') upvotes = Math.max(upvotes - 1, 0);
        if (current.myVote === 'down') downvotes = Math.max(downvotes - 1, 0);
        if (direction === 'up') upvotes += 1;
        if (direction === 'down') downvotes += 1;
        return { upvotes, downvotes, myVote: direction };
      }, fallback);
      setPosts((prev) => {
        const index = prev.findIndex((post) => post.id === postId);
        if (index < 0) return prev;
        const next = [...prev];
        next[index] = applyVote(prev[index], direction);
        return next;
      });
      try {
        const result = await api<{ upvotes: number; downvotes: number; my_vote: VoteDirection }>(
          `/posts/${postId}/vote`,
          { body: { direction } }
        );
        setPosts((prev) => {
          const index = prev.findIndex((post) => post.id === postId);
          if (index < 0) return prev;
          const next = [...prev];
          next[index] = {
            ...prev[index],
            upvotes: result.upvotes,
            downvotes: result.downvotes,
            myVote: result.my_vote,
          };
          return next;
        });
        interactions.patch('post', postId, {
          upvotes: result.upvotes,
          downvotes: result.downvotes,
          myVote: result.my_vote,
        });
      } catch {
        interactions.patch('post', postId, {
          upvotes: previous.upvotes,
          downvotes: previous.downvotes,
          myVote: previous.myVote,
        });
        refresh(); // reconcile with the server if the vote failed
      }
    },
    [interactions, refresh]
  );

  const contextValue = useMemo<PostContextType>(() => ({
    posts,
    feedPosts,
    setPosts,
    isLoading,
    error,
    refresh,
    vote,
    loadMorePosts,
    hasMorePosts,
    postsEpoch,
    ensurePost,
  }), [error, ensurePost, feedPosts, hasMorePosts, isLoading, loadMorePosts, posts, postsEpoch, refresh, vote]);

  return (
    <PostVoteContext.Provider value={vote}>
      <PostContext.Provider value={contextValue}>
        {children}
      </PostContext.Provider>
    </PostVoteContext.Provider>
  );
}

export function usePosts() {
  const context = useContext(PostContext);
  if (!context) throw new Error('usePosts must be used within PostProvider');
  return context;
}

// Feed action rows only need the stable vote callback. Keeping them off the
// full posts context prevents every visible row from re-rendering whenever
// one post changes or a page is appended.
export function usePostVote() {
  const vote = useContext(PostVoteContext);
  if (!vote) throw new Error('usePostVote must be used within PostProvider');
  return vote;
}
