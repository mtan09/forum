// Resolves the app's color scheme: the user's in-app preference (Settings →
// Appearance) when set, otherwise the device theme. Everything that themes —
// ThemedText/ThemedView, useThemeColor, usePalette, navigation — goes through
// this hook, so the settings toggle flips the whole app at once.
export { useResolvedScheme as useColorScheme } from '@/context/themeContext';
