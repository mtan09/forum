/**
 * forum color system
 *
 * PRIMARY     Purple is the only brand/action color. It identifies forum,
 *             selected navigation, primary buttons, links, and active states.
 * ACCENT      We do not introduce a competing accent hue. Accent treatments
 *             are lighter/deeper tonal variants of the same primary purple.
 * BACKGROUND  The app canvas. It should never be used for elevated cards.
 * SURFACE     Neutral cards, inputs, and overlays, ordered by elevation.
 * TEXT        Four contrast levels: primary, secondary, muted, and disabled.
 * PERSPECTIVE Blue/gray/red are data colors for Left/Center/Right only; they
 *             are never used as general navigation or brand colors.
 * STATUS      Success, danger, vote, and bookmark colors communicate state
 *             and are kept separate from both brand and perspective colors.
 *
 * The legacy token names remain as aliases while existing screens migrate,
 * but every alias resolves to one of these semantic roles in both themes.
 */

import { Platform } from 'react-native';

const brandPurple = '#B647FF';
const onBrand = '#FFFFFF';

// Semantic palette. Screens never hardcode surface/text/border hexes — they
// pull tokens from here (via usePalette) so both themes stay in sync.
export const Colors = {
  light: {
    // Core brand + canvas
    primary: brandPurple,
    onPrimary: onBrand,
    primaryPressed: '#9A2ED8',
    primaryDisabled: '#DDB4F5',
    onPrimaryMuted: 'rgba(255,255,255,0.72)',
    onPrimaryOverlay: 'rgba(255,255,255,0.22)',
    text: '#11181C',
    textSecondary: '#5A5A5A',
    textMuted: '#8D8D8D',
    textDisabled: '#C6C6C6',
    background: '#FFFFFF',
    backgroundFade60: 'rgba(255,255,255,0.60)',
    backgroundFade25: 'rgba(255,255,255,0.25)',
    backgroundTransparent: 'rgba(255,255,255,0)',
    tint: brandPurple,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: brandPurple,

    // text hierarchy
    subtle: '#5A5A5A',        // secondary text
    muted: '#8D8D8D',         // tertiary text, stats, placeholders
    faint: '#C6C6C6',         // disabled / hairline icons

    // neutral surfaces
    surface: '#FAFAFA',       // neutral cards
    surfaceRaised: '#FFFFFF', // modal / sheet body
    surfaceMuted: '#F1F1F3', // text inputs, grouped controls
    inputBg: '#F1F1F3',       // text inputs, search bar
    border: '#E2E2E2',        // neutral hairlines
    overlayCard: '#FFFFFF',   // modal / sheet body

    // brand purple family
    accent: brandPurple,
    accentDeep: '#9A00FF',    // strong purple text on tinted chips
    // Elevated/grouped forum surfaces need to read clearly against the white
    // canvas without competing with the stronger purple action treatments.
    card: '#ECE2F7',          // purple-tinted cards
    cardBorder: '#D8C7EA',
    accentSoftBg: '#F1E8FB',  // purple chip fill
    accentFaint: '#E9C8FF',   // light purple button fill
    onAccentFaint: '#7A1FD0', // text on accentFaint
    barTrack: '#D8C2F5',      // histogram / track fills
    carouselDotInactive: '#FFFFFF',
    mediaSurface: '#FFFFFF',  // fixed neutral canvas behind logos/media
    spectrumThumb: '#FFFFFF',

    // status chips
    red: '#DC2626',
    redBg: '#FDE8E8',
    blue: '#2563EB',
    blueBg: '#E8F0FE',
    amber: '#B45309',
    amberBg: '#FEF3C7',
    centerTag: '#56616D',
    centerBg: '#EEF0F2',
    green: '#14DD78',
    success: '#14B86A',
    danger: '#B3261E',
    voteUp: '#14DD78',
    voteDown: '#FF0080',
    bookmark: '#FFD000',
    shadow: '#000000',
    scrim: 'rgba(0,0,0,0.45)',
    imageControlBg: 'rgba(0,0,0,0.42)',
    onImage: '#FFFFFF',
  },
  dark: {
    // Core brand + canvas
    primary: brandPurple,
    onPrimary: onBrand,
    primaryPressed: '#CA71FF',
    primaryDisabled: '#5C3E7D',
    onPrimaryMuted: 'rgba(255,255,255,0.72)',
    onPrimaryOverlay: 'rgba(255,255,255,0.22)',
    text: '#ECEDEE',
    textSecondary: '#B4BAC0',
    textMuted: '#8D949A',
    textDisabled: '#4A4F54',
    background: '#151718',
    backgroundFade60: 'rgba(21,23,24,0.60)',
    backgroundFade25: 'rgba(21,23,24,0.25)',
    backgroundTransparent: 'rgba(21,23,24,0)',
    tint: brandPurple,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: brandPurple,

    subtle: '#B4BAC0',
    muted: '#8D949A',
    faint: '#4A4F54',

    surface: '#1D2024',
    surfaceRaised: '#1D2024',
    surfaceMuted: '#24282D',
    inputBg: '#24282D',
    border: '#2E3237',
    overlayCard: '#1D2024',

    accent: brandPurple,
    accentDeep: '#C87DFF',
    card: '#211A2E',
    cardBorder: '#3A2C52',
    accentSoftBg: '#33204A',
    accentFaint: '#3E2458',
    onAccentFaint: '#E2C4FF',
    barTrack: '#4A3568',
    carouselDotInactive: '#6E5C85',
    mediaSurface: '#FFFFFF',
    spectrumThumb: '#FFFFFF',

    red: '#F87171',
    redBg: '#3B1D20',
    blue: '#60A5FA',
    blueBg: '#1C2A46',
    amber: '#FBBF24',
    amberBg: '#3A2D12',
    centerTag: '#CBD5E1',
    centerBg: '#272C31',
    green: '#14DD78',
    success: '#35D98A',
    danger: '#F87171',
    voteUp: '#14DD78',
    voteDown: '#FF0080',
    bookmark: '#FFD000',
    shadow: '#000000',
    scrim: 'rgba(0,0,0,0.55)',
    imageControlBg: 'rgba(0,0,0,0.42)',
    onImage: '#FFFFFF',
  },
};

export type Palette = { [K in keyof typeof Colors.light]: string };

export const Fonts = Platform.select({
  ios: {
    // Leaving text on the native System family renders San Francisco on iOS.
    sans: 'System',
    serif: 'System',
    rounded: 'System',
    mono: 'Menlo',
  },
  macos: {
    sans: 'System',
    serif: 'System',
    rounded: 'System',
    mono: 'Menlo',
  },
  android: {
    sans: 'Roboto',
    serif: 'Roboto',
    rounded: 'Roboto',
    mono: 'monospace',
  },
  windows: {
    sans: 'Segoe UI',
    serif: 'Segoe UI',
    rounded: 'Segoe UI',
    mono: 'Consolas',
  },
  default: {
    sans: 'sans-serif',
    serif: 'sans-serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
  web: {
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    rounded: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
