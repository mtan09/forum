import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type SpectrumProps = {
  width: number;
  height?: number;
  topic?: string;
  position: number;
}

export default function Spectrum({width, height = 12, position, topic, ...rest}: SpectrumProps) {
  return (

    <ThemedView style={styles.container}>
      {topic && (
        <ThemedText type="defaultSemiBold">{topic}</ThemedText>
      )}
      <View style={styles.background}>
        <LinearGradient
          colors={['#E8C4FF', '#9A00FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width, height, borderRadius: 16}}
        />
        <View style={[styles.foreground, {
          left: `${position*90}%`,
          marginLeft: -5 + .05*width
        }]}/>

      </View>
      
    </ThemedView>
      
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
    marginBottom: 8,
  },
  background: {
    position: 'relative',
  },
  foreground: {
    position: 'absolute',
    width: 10,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  }
});