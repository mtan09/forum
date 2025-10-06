import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function Post({ post }) {
  return (
    <ThemedView>
      <ThemedText>{post.user}</ThemedText>
      <ThemedText>{post.content}</ThemedText>
    </ThemedView>
  )
}