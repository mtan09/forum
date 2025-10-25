import { ThemedView } from '@/components/themed-view';
import { StyleSheet } from 'react-native';

export default function Explore() {
  return(
    <ThemedView style={ styles.container }>
      
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});