import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePalette } from '@/hooks/use-palette';
import { getPerspectiveTone, type PerspectiveName } from '@/lib/perspective-colors';

type Props = {
  label: PerspectiveName;
  variant?: 'tinted' | 'solid';
  style?: StyleProp<ViewStyle>;
};

/** Shared visual treatment for every Left/Center/Right label in the app. */
export function PerspectiveTag({ label, variant = 'tinted', style }: Props) {
  const { c } = usePalette();
  const tone = getPerspectiveTone(label, c);
  const solid = variant === 'solid';
  return (
    <ThemedView style={[styles.tag, { backgroundColor: solid ? tone.color : tone.background }, style]}>
      <ThemedText style={[styles.text, { color: solid ? tone.background : tone.color }]}>
        {tone.label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
});
