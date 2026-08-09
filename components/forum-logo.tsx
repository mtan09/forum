import React from 'react';
import {
  Image,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

type ForumLogoProps = {
  /** Purple mark for neutral surfaces; white mark for the purple landing page. */
  variant?: 'brand' | 'inverse';
  size: number;
  style?: StyleProp<ImageStyle>;
};

// The original transparent forum mark. Keep this filename URL-safe: a recent
// switch to `forumlogo copy.png` introduced an encoded asset request that Metro
// could not serve reliably.
const BRAND_LOGO = require('@/assets/images/forumlogo.png');
const INVERSE_LOGO = require('@/assets/images/forumlogoInverse.png');

/**
 * The single renderer for forum branding inside the app.
 *
 * These are bundled images, so React Native's Image is intentionally used
 * instead of the remote-media pipeline. That keeps the mark available before
 * networking, image caches, or Expo Image initialization are ready.
 */
export default function ForumLogo({ variant = 'brand', size, style }: ForumLogoProps) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      accessibilityLabel="forum logo"
      resizeMode="contain"
      source={variant === 'inverse' ? INVERSE_LOGO : BRAND_LOGO}
      style={[{ width: size, height: size }, style]}
    />
  );
}
