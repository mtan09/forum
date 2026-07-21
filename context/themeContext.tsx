import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

// The user's appearance choice. 'system' follows the device; the app ships
// with that default so it just matches the phone until the user says otherwise.
export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedScheme = 'light' | 'dark';

const STORAGE_KEY = 'forum.themePreference';

type ThemeModeValue = {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  scheme: ResolvedScheme;
};

const ThemeModeContext = createContext<ThemeModeValue | null>(null);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const system = useSystemColorScheme() ?? 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((themeValue) => {
        if (themeValue === 'light' || themeValue === 'dark' || themeValue === 'system') setPreferenceState(themeValue);
      })
      .finally(() => setHydrated(true));
  }, []);

  const value = useMemo<ThemeModeValue>(
    () => ({
      preference,
      setPreference: (p: ThemePreference) => {
        setPreferenceState(p);
        AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
      },
      scheme: preference === 'system' ? system : preference,
    }),
    [preference, system]
  );

  // Hold first paint for the one AsyncStorage read so a saved dark theme
  // doesn't flash light on launch.
  if (!hydrated) return null;

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode(): ThemeModeValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return ctx;
}

// Safe variant for hooks that may render outside the provider (falls back to
// the device scheme so nothing crashes during auth/loading edge cases).
export function useResolvedScheme(): ResolvedScheme {
  const ctx = useContext(ThemeModeContext);
  const system = useSystemColorScheme() ?? 'light';
  if (!ctx) return system;
  return ctx.scheme;
}
