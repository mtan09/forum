import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type UserAvatarProps = {
  userId: string;
  avatarUrl?: string | null;
  size?: number;
  accessibilityLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * The shared interactive avatar. Displayed profile photos should always lead
 * to their user; photo pickers intentionally remain separate controls.
 */
export default function UserAvatar({
  userId,
  avatarUrl,
  size = 44,
  accessibilityLabel = 'Open profile',
  containerStyle,
}: UserAvatarProps) {
  const router = useRouter();
  const imageStyle = useMemo(
    () => ({ width: size, height: size, borderRadius: size / 2 }),
    [size],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      onPress={() => router.push(`/user/${userId}` as never)}
      style={({ pressed }) => [containerStyle, pressed && styles.pressed]}
    >
      <Image
        source={avatarUrl ? { uri: avatarUrl } : require('@/assets/images/Default_pfp.jpg')}
        style={imageStyle}
        contentFit="cover"
        recyclingKey={avatarUrl ?? `avatar:${userId}`}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.62 },
});
