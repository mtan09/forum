import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import type { PropsWithChildren } from 'react';
import { useMemo } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}>;

/**
 * A laptop browser should not turn a phone-width product surface into a
 * wall-to-wall canvas. This frame preserves the iOS content rhythm while
 * giving detail screens a deliberate desktop surround.
 */
export default function WebPageFrame({ children, style, padded = false }: Props) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);

  if (Platform.OS !== 'web') {
    return <View style={style}>{children}</View>;
  }

  // WebShell now owns the centred column, so this only carries the optional
  // inner padding detail screens ask for. Framing again nested a rounded card
  // inside the column.
  return <View style={[styles.frame, padded && styles.padded, style]}>{children}</View>;
}

const makeStyles = (c: Palette) => StyleSheet.create({
  frame: {
    width: '100%',
    flex: 1,
    backgroundColor: c.background,
  },
  padded: {
    padding: 20,
  },
});
