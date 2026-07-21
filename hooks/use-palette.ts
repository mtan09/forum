import { Colors, type Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// One-stop hook for themed styling. Screens build their StyleSheet through a
// makeStyles(c) factory memoized on this palette:
//
//   const { c, scheme } = usePalette();
//   const styles = useMemo(() => makeStyles(c), [c]);
export function usePalette(): { c: Palette; scheme: 'light' | 'dark' } {
  const scheme = useColorScheme() ?? 'light';
  return { c: Colors[scheme], scheme };
}
