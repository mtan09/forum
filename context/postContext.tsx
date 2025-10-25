import { PostType } from '@/components/postComponent';
import { createContext, useContext, useState } from 'react';
import { fetchMockPosts } from '@/data/mockPosts';
import { useEffect } from 'react';

type PostContextType = {
  posts: PostType[];
  setPosts: (posts: PostType[]) => void;
  isLoading: boolean;
  error: string | null;
  handleUpvote: (postId: string) => void;
  handleUnUpvote: (postId: string) => void;
  handleDownvote: (postId: string) => void;
  handleUnDownvote: (postId: string) => void;
};

const PostContext = createContext<PostContextType | null>(null);

export function PostProvider({ children }: { children: React.ReactNode }) {
  // Move your posts state and handlers from Feed component to here
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const data = await fetchMockPosts();
        setPosts(data);
      } catch (err) {
        setError('Failed to load posts');
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, []);

  const handleUpvote = (postId: string) => {
    setPosts(prev =>
      prev.map(post =>
        post.id === postId ? { ...post, upvotes: post.upvotes + 1 } : post
      )
    );
  };

  const handleUnUpvote = (postId: string) => {
    setPosts(prev =>
      prev.map(post =>
        post.id === postId ? { ...post, upvotes: Math.max(post.upvotes - 1, 0) } : post
      )
    );
  }

  const handleDownvote = (postId: string) => {
    setPosts(prev =>
      prev.map(post =>
        post.id === postId ? { ...post, downvotes: post.downvotes + 1 } : post
      )
    );
  }

  const handleUnDownvote = (postId: string) => {
    setPosts(prev =>
      prev.map(post =>
        post.id === postId ? { ...post, downvotes: Math.max(post.downvotes - 1, 0) } : post
      )
    );
  }

  return (
    <PostContext.Provider 
      value={{ 
        posts,
        setPosts,
        isLoading,
        error,
        handleUpvote,
        handleUnUpvote,
        handleDownvote,
        handleUnDownvote
      }}
    >
      {children}
    </PostContext.Provider>
  );
}

export function usePosts() {
  const context = useContext(PostContext);
  if (!context) throw new Error('usePosts must be used within PostProvider');
  return context;
}