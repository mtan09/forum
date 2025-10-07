import Post, { PostType } from '@/components/post';
import { ThemedView } from '@/components/themed-view';
import { StyleSheet } from 'react-native';

export default function Feed() {
  const myPost: PostType = {
    id: '1',
    user: {
      username: 'Mikita',
    },
    text: "Spain has a GDP per capita comparable to Japan and yet the Spaniards basically don't work",
    timestamp: '2024-06-01T12:00:00Z',
    likes: 10,
  }

  return(
    <ThemedView style={styles.container}>
      <Post post={myPost} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 50,
  },
});