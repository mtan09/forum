import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import React from 'react';
import { Image, StyleSheet } from 'react-native';

export type PostType = {
  id: string;
  user: {
    username: string;
    avatar?: string;
  }
  text: string;
  timestamp: string;
  likes: number;
}

type Props = {
  post: PostType;
}

export default function Post({ post }: Props) {
  return (
    <ThemedView style={styles.container}>
      <Image 
        source={post.user.avatar ? { uri: post.user.avatar } : require('@/assets/images/Default_pfp.jpg')} 
        style={styles.avatar} 
      />

      <ThemedView style={styles.content}>
        <ThemedText type="defaultSemiBold">{post.user.username}</ThemedText>
        <ThemedText style={styles.posttext}>{post.text}</ThemedText>

        <ThemedView style={styles.reactions}>

        </ThemedView>
      </ThemedView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    flexDirection: 'row',
  },
  avatar: {
    width: 50,
    aspectRatio: 1,
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  posttext: {
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  reactions: {
    flexDirection: 'row',
  },
});