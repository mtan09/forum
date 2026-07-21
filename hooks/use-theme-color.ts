/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof Palette
) {
  const { c, scheme } = usePalette();
  const colorFromProps = props[scheme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return c[colorName];
  }
}
