import { useEffect, useState } from 'react';

import { useResolvedScheme } from '@/context/themeContext';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const scheme = useResolvedScheme();

  if (hasHydrated) {
    return scheme;
  }

  return 'light' as const;
}
