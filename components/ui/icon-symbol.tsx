// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Every SF Symbol the app uses, mapped to a Material Icon so Android and
 * web render real glyphs instead of blanks.
 * - Material Icons in the [Icons Directory](https://icons.expo.fyi)
 * - SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app
 */
const MAPPING = {
  // navigation / tab bar
  'house.fill': 'home',
  house: 'home',
  'bubble.left.and.bubble.right.fill': 'forum',
  'bubble.left.and.bubble.right': 'forum',
  'brain.fill': 'psychology',
  brain: 'psychology',
  magnifyingglass: 'search',
  'newspaper.fill': 'article',
  'arrow.up.right': 'north-east',
  'person.fill': 'person',
  'person.2.fill': 'people',
  person: 'person-outline',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.up': 'keyboard-arrow-up',
  'chevron.down': 'keyboard-arrow-down',
  'chevron.left.forwardslash.chevron.right': 'code',

  // actions
  'arrowshape.up.fill': 'thumb-up',
  'arrowshape.up': 'thumb-up-off-alt',
  'arrowshape.down.fill': 'thumb-down',
  'arrowshape.down': 'thumb-down-off-alt',
  bubble: 'chat-bubble-outline',
  'bookmark.fill': 'bookmark',
  bookmark: 'bookmark-border',
  'square.and.arrow.up': 'ios-share',
  'arrow.up.circle.fill': 'arrow-circle-up',
  'x.circle.fill': 'cancel',
  xmark: 'close',
  plus: 'add',
  ellipsis: 'more-horiz',

  // content / profile
  'checkmark.circle.fill': 'check-circle',
  'checkmark.seal.fill': 'verified',
  calendar: 'calendar-today',
  'camera.fill': 'photo-camera',
  photo: 'photo',
  sparkles: 'auto-awesome',
  'gearshape.fill': 'settings',
  'envelope.fill': 'email',
  envelope: 'mail-outline',
  flag: 'outlined-flag',
  'hand.raised': 'front-hand',
  'hand.raised.fill': 'front-hand',
  'paperplane.fill': 'send',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
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
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
