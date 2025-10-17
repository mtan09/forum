import Post, { PostType } from '@/components/post';
import { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

export default function Feed() {
  const [posts, setPosts] = useState<PostType[]>([
    {
      id: '1',
      text: 'Hello, this is a sample post!',
      user: {
        username: 'John Doe',
      },
      timestamp: '2023-10-01T12:00:00Z',
      upvotes: 153699,
      downvotes: 5,
      commentCount: 0,
      topic: 'General',
      position: 0.3,
    },
    {
      id: '2',
      user: {
        username: 'Jane Smith',
      },
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      timestamp: '2023-10-02T15:30:00Z',
      upvotes: 100,
      downvotes: 2674198,
      media: 'https://www.brookings.edu/wp-content/uploads/2018/02/netanyahu_flag001.jpg?quality=75&w=1500',
      commentCount: 5,
      topic: 'Israel-Hamas War',
      position: 0.01,
    },
    {
      id: '3',
      user: {
        username: 'Alice Johnson',
      },
      text: 'Shortpost.',
      timestamp: '2023-10-03T09:45:00Z',
      upvotes: 1000,
      downvotes: 15,
      commentCount: 7,
      topic: 'Technology',
      position: .99,
    },
    {
      id: '4',
      text: 'Hello, this is a sample post!',
      user: {
        username: 'John Doe',
      },
      timestamp: '2023-10-01T12:00:00Z',
      upvotes: 0,
      downvotes: 0,
      media: 'https://upload.wikimedia.org/wikipedia/commons/c/c4/LeBron_James%2C_25_November_2023_02_%28cropped%29.jpg',
      commentCount: 6,
      topic: 'Sports',
      position: 0.5,
    },
    {
      id: '5',
      user: {
        username: 'Jane Smith',
      },
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      timestamp: '2023-10-02T15:30:00Z',
      upvotes: 10,
      downvotes: 5,
      commentCount: 165,
      topic: 'Health',
      position: 0.9,
    },
  ]);

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

  return(
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <Post 
        post={item} 
        onUpvote={() => handleUpvote(item.id)} 
        onUnUpvote={() => handleUnUpvote(item.id)}
        onDownvote={() => handleDownvote(item.id)}
        onUnDownvote={() => handleUnDownvote(item.id)}
      />}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 50,
  },
});