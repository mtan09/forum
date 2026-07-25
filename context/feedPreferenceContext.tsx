import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type FeedContentPreference = 'all' | 'posts' | 'articles';

const STORAGE_KEY = 'forum.feedContentPreference';

type FeedPreferenceValue = {
  preference: FeedContentPreference;
  setPreference: (preference: FeedContentPreference) => void;
};

const FeedPreferenceContext = createContext<FeedPreferenceValue | null>(null);

const isFeedContentPreference = (value: string | null): value is FeedContentPreference =>
  value === 'all' || value === 'posts' || value === 'articles';

export function FeedPreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<FeedContentPreference>('all');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (isFeedContentPreference(stored)) setPreferenceState(stored);
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const value = useMemo<FeedPreferenceValue>(
    () => ({
      preference,
      setPreference: (next) => {
        setPreferenceState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      },
    }),
    [preference]
  );

  // Avoid briefly rendering the mixed default before applying a saved filter.
  if (!hydrated) return null;

  return <FeedPreferenceContext.Provider value={value}>{children}</FeedPreferenceContext.Provider>;
}

export function useFeedPreference(): FeedPreferenceValue {
  const context = useContext(FeedPreferenceContext);
  if (!context) throw new Error('useFeedPreference must be used within FeedPreferenceProvider');
  return context;
}
