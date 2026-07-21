/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#b647ff';
const tintColorDark = '#b647ff';

// Semantic palette. Screens never hardcode surface/text/border hexes — they
// pull tokens from here (via usePalette) so both themes stay in sync.
export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,

    // text hierarchy
    subtle: '#5A5A5A',        // secondary text
    muted: '#8D8D8D',         // tertiary text, stats, placeholders
    faint: '#C6C6C6',         // disabled / hairline icons

    // neutral surfaces
    surface: '#FAFAFA',       // neutral cards
    inputBg: '#F1F1F3',       // text inputs, search bar
    border: '#E2E2E2',        // neutral hairlines
    overlayCard: '#FFFFFF',   // modal / sheet body

    // brand purple family
    accent: '#B647FF',
    accentDeep: '#9A00FF',    // strong purple text on tinted chips
    card: '#F5F2FF',          // purple-tinted cards
    cardBorder: '#E4DCFF',
    accentSoftBg: '#F1E8FB',  // purple chip fill
    accentFaint: '#E9C8FF',   // light purple button fill
    onAccentFaint: '#7A1FD0', // text on accentFaint
    barTrack: '#D8C2F5',      // histogram / track fills

    // status chips
    red: '#DC2626',
    redBg: '#FDE8E8',
    blue: '#2563EB',
    blueBg: '#E8F0FE',
    amber: '#B45309',
    amberBg: '#FEF3C7',
    green: '#14DD78',
    danger: '#B3261E',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,

    subtle: '#B4BAC0',
    muted: '#8D949A',
    faint: '#4A4F54',

    surface: '#1D2024',
    inputBg: '#24282D',
    border: '#2E3237',
    overlayCard: '#1D2024',

    accent: '#B647FF',
    accentDeep: '#C87DFF',
    card: '#211A2E',
    cardBorder: '#3A2C52',
    accentSoftBg: '#33204A',
    accentFaint: '#3E2458',
    onAccentFaint: '#E2C4FF',
    barTrack: '#4A3568',

    red: '#F87171',
    redBg: '#3B1D20',
    blue: '#60A5FA',
    blueBg: '#1C2A46',
    amber: '#FBBF24',
    amberBg: '#3A2D12',
    green: '#14DD78',
    danger: '#F87171',
  },
};

export type Palette = typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
