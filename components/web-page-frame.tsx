import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import type { PropsWithChildren } from 'react';
import { useMemo } from 'react';
import { Platform, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';

type Props = PropsWithChildren<{
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}>;

/**
 * A laptop browser should not turn a phone-width product surface into a
 * wall-to-wall canvas. This frame preserves the iOS content rhythm while
 * giving detail screens a deliberate desktop surround.
 */
export default function WebPageFrame({ children, maxWidth = 760, style, padded = false }: Props) {
  const { width } = useWindowDimensions();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);

  if (Platform.OS !== 'web') {
    return <View style={style}>{children}</View>;
  }

  const phone = width < 700;
  return (
    <View style={[styles.outer, phone && styles.outerPhone]}>
      <View
        style={[
          styles.frame,
          { maxWidth },
          phone && styles.framePhone,
          padded && styles.padded,
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  outer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: c.surface,
  },
  outerPhone: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  frame: {
    width: '100%',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 20,
    backgroundColor: c.background,
    overflow: 'hidden',
  },
  framePhone: {
    maxWidth: '100%',
    borderWidth: 0,
    borderRadius: 0,
  },
  padded: {
    padding: 20,
  },
});
