import { PostType } from '@/components/postComponent';
import { api } from '@/lib/api';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './authContext';

export type VoteDirection = 'up' | 'down' | null;

type PostContextType = {
  posts: PostType[];
  setPosts: React.Dispatch<React.SetStateAction<PostType[]>>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  vote: (postId: string, direction: VoteDirection) => Promise<void>;
  /** Load the next page; resolves with the newly appended posts. */
  loadMorePosts: () => Promise<PostType[]>;
  hasMorePosts: boolean;
  /** Bumps whenever the post list is reset (refresh), NOT on appends. */
  postsEpoch: number;
  /** Fetch a single post into the context if it isn't already loaded. */
  ensurePost: (id: string) => Promise<void>;
};

const PostContext = createContext<PostContextType | null>(null);

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
  // null = scorer's confidence gate not met; the post shows no placement
  position: typeof row.position === 'number' ? row.position : null,
  // scorer receipts: the exact signals that produced the placement
  positionSignals: row.position_signals ?? [],
  positionConfidence: typeof row.position_confidence === 'number' ? row.position_confidence : null,
  scorerVersion: row.scorer_version ?? undefined,
  username: row.username,
  avatarUrl: row.avatar_url ?? undefined,
  myVote: row.my_vote ?? null,
  myBookmark: row.my_bookmark ?? false,
});

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
const POSTS_PAGE = 30;

export function PostProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [postsEpoch, setPostsEpoch] = useState(0);
  const { isAuthenticated } = useAuth();

  const postsRef = useRef<PostType[]>([]);
  useEffect(() => { postsRef.current = posts; }, [posts]);
  const loadingMoreRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const rows = await api<any[]>(`/posts?limit=${POSTS_PAGE}&offset=0`);
      setPosts(rows.map(mapPost));
      setHasMorePosts(rows.length === POSTS_PAGE);
      setPostsEpoch((e) => e + 1);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMorePosts = useCallback(async (): Promise<PostType[]> => {
    if (loadingMoreRef.current) return [];
    loadingMoreRef.current = true;
    try {
      const rows = await api<any[]>(`/posts?limit=${POSTS_PAGE}&offset=${postsRef.current.length}`);
      setHasMorePosts(rows.length === POSTS_PAGE);
      const fresh = rows.map(mapPost);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...fresh.filter((p) => !seen.has(p.id))];
      });
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
      setPosts((prev) => prev.map((p) => (p.id === postId ? applyVote(p, direction) : p)));
      try {
        const result = await api<{ upvotes: number; downvotes: number; my_vote: VoteDirection }>(
          `/posts/${postId}/vote`,
          { body: { direction } }
        );
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, upvotes: result.upvotes, downvotes: result.downvotes, myVote: result.my_vote }
              : p
          )
        );
      } catch {
        refresh(); // reconcile with the server if the vote failed
      }
    },
    [refresh]
  );

  return (
    <PostContext.Provider value={{ posts, setPosts, isLoading, error, refresh, vote, loadMorePosts, hasMorePosts, postsEpoch, ensurePost }}>
      {children}
    </PostContext.Provider>
  );
}

export function usePosts() {
  const context = useContext(PostContext);
  if (!context) throw new Error('usePosts must be used within PostProvider');
  return context;
}
