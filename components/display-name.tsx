import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-palette';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Pressable, View } from 'react-native';

type Props = {
  username?: string | null;
  isDemo?: boolean;
  nameStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  numberOfLines?: number;
  onUsernamePress?: () => void;
};

export default function DisplayName({
  username,
  isDemo = false,
  nameStyle,
  labelStyle,
  containerStyle,
  numberOfLines,
  onUsernamePress,
}: Props) {
  const { c } = usePalette();
  const name = (
    <ThemedText type="defaultSemiBold" style={nameStyle} numberOfLines={numberOfLines}>
      {username || 'Anonymous'}
    </ThemedText>
  );

  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 5, flexShrink: 1 },
        containerStyle,
      ]}
    >
      {onUsernamePress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${username || 'Anonymous'}'s profile`}
          onPress={onUsernamePress}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          {name}
        </Pressable>
      ) : name}
      {isDemo && (
        <ThemedText
          accessibilityLabel="Fictional demo account"
          style={[{ color: c.muted, fontSize: 9, lineHeight: 12, fontWeight: '700' }, labelStyle]}
          numberOfLines={1}
        >
          (Fictional demo account)
        </ThemedText>
      )}
    </View>
  );
}
