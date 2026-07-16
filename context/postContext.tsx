import { PostType } from '@/components/postComponent';
import { api } from '@/lib/api';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './authContext';

export type VoteDirection = 'up' | 'down' | null;

type PostContextType = {
  posts: PostType[];
  setPosts: (posts: PostType[]) => void;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  vote: (postId: string, direction: VoteDirection) => Promise<void>;
};

const PostContext = createContext<PostContextType | null>(null);

const mapPost = (row: any): PostType => ({
  id: String(row.id),
  user: String(row.user_id),
  text: row.content ?? '',
  timestamp: row.created_at,
  media: row.media_url ?? undefined,
  upvotes: row.upvotes ?? 0,
  downvotes: row.downvotes ?? 0,
  commentCount: row.commentcount ?? 0,
  topic: row.general_topic_id ?? 'general',
  position: row.position ?? 0.5,
  username: row.username,
  avatarUrl: row.avatar_url ?? undefined,
  myVote: row.my_vote ?? null,
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

export function PostProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const refresh = useCallback(async () => {
    try {
      const rows = await api<any[]>('/posts');
      setPosts(rows.map(mapPost));
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load posts');
    } finally {
      setIsLoading(false);
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
    <PostContext.Provider value={{ posts, setPosts, isLoading, error, refresh, vote }}>
      {children}
    </PostContext.Provider>
  );
}

export function usePosts() {
  const context = useContext(PostContext);
  if (!context) throw new Error('usePosts must be used within PostProvider');
  return context;
}
