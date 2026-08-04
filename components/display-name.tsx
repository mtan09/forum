import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-palette';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { View } from 'react-native';

type Props = {
  username?: string | null;
  isDemo?: boolean;
  nameStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  numberOfLines?: number;
};

export default function DisplayName({
  username,
  isDemo = false,
  nameStyle,
  labelStyle,
  containerStyle,
  numberOfLines,
}: Props) {
  const { c } = usePalette();
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 5, flexShrink: 1 },
        containerStyle,
      ]}
    >
      <ThemedText type="defaultSemiBold" style={nameStyle} numberOfLines={numberOfLines}>
        {username || 'Anonymous'}
      </ThemedText>
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
