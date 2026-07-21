import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { StyleProp, StyleSheet, TextStyle, View } from 'react-native';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type SpectrumProps = {
  width: number;
  height?: number;
  topic?: string;
  position: number;  // 0 = left (blue) … 1 = right (red)
  textStyle?: StyleProp<TextStyle>;
}

export default function Spectrum({width, height = 20, position, topic, textStyle, ...rest}: SpectrumProps) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (

    <ThemedView style={styles.container}>
      {topic && (
        <ThemedText type="defaultSemiBold" style={[
          styles.topicText,
          textStyle
        ]}>{topic}</ThemedText>
      )}
      <View style={styles.background}>
        <LinearGradient
          // blue (left) → purple (center) → red (right)
          colors={[c.blue, c.primary, c.red]}
          locations={[0, 0.5, 1]}
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

const makeStyles = (c: Palette) => StyleSheet.create({
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
    backgroundColor: c.spectrumThumb,
    shadowColor: c.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  topicText: {
    fontWeight: '800',
  }
});
