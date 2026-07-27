// SF Symbols are Apple-only assets. This fallback preserves their semantic
// names and closely matches their outline/filled silhouettes on web/Android.

import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import type { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

type SFSymbolName = Extract<SymbolViewProps['name'], string>;
type IconMapping = Record<SFSymbolName, ComponentProps<typeof MaterialCommunityIcons>['name']>;

const MAPPING = {
  // Navigation
  'house.fill': 'home',
  house: 'home-outline',
  'bubble.left.and.bubble.right.fill': 'message-text',
  'bubble.left.and.bubble.right': 'message-text-outline',
  'brain.fill': 'brain',
  brain: 'brain',
  magnifyingglass: 'magnify',
  'newspaper.fill': 'newspaper',
  'arrow.up.right': 'arrow-top-right',
  'person.fill': 'account',
  'person.2.fill': 'account-group',
  person: 'account-outline',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.up': 'chevron-up',
  'chevron.down': 'chevron-down',
  'chevron.left.forwardslash.chevron.right': 'code-tags',

  // Actions
  'arrowshape.up.fill': 'arrow-up-bold-circle',
  'arrowshape.up': 'arrow-up-bold-circle-outline',
  'arrowshape.down.fill': 'arrow-down-bold-circle',
  'arrowshape.down': 'arrow-down-bold-circle-outline',
  bubble: 'comment-outline',
  'bookmark.fill': 'bookmark',
  bookmark: 'bookmark-outline',
  'square.and.arrow.up': 'share-variant-outline',
  'arrow.up.circle.fill': 'arrow-up-circle',
  'x.circle.fill': 'close-circle',
  xmark: 'close',
  plus: 'plus',
  ellipsis: 'dots-horizontal',

  // Content / profile
  'checkmark.circle.fill': 'check-circle',
  'checkmark.seal.fill': 'check-decagram',
  calendar: 'calendar',
  'camera.fill': 'camera',
  photo: 'image',
  sparkles: 'creation-outline',
  'gearshape.fill': 'cog',
  'envelope.fill': 'email',
  envelope: 'email-outline',
  flag: 'flag-outline',
  'hand.raised': 'hand-back-left-outline',
  'hand.raised.fill': 'hand-back-left',
  'paperplane.fill': 'send',
} as IconMapping;

type IconSymbolName = keyof typeof MAPPING;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialCommunityIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
