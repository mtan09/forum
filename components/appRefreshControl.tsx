import { usePalette } from '@/hooks/use-palette';
import { RefreshControl } from 'react-native';

type Props = {
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
  indicatorVisible?: boolean;
};

// One native refresh treatment for every primary feed. An explicit semantic
// neutral avoids iOS's low-contrast automatic tint in light mode while keeping
// Home, The Floor, and the other refreshable screens visually identical.
export default function AppRefreshControl({ refreshing, onRefresh, indicatorVisible = true }: Props) {
  const { c } = usePalette();
  const indicatorColor = indicatorVisible ? c.icon : 'transparent';

  return (
    <RefreshControl
      // An indicator-free control snaps back immediately while still
      // delivering the native pull gesture to onRefresh.
      refreshing={indicatorVisible ? refreshing : false}
      onRefresh={onRefresh}
      tintColor={indicatorColor}
      colors={[indicatorColor]}
      progressBackgroundColor={indicatorVisible ? c.surfaceRaised : 'transparent'}
      style={indicatorVisible ? undefined : { opacity: 0 }}
    />
  );
}
