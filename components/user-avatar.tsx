import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import AvatarVisual from './avatar-visual';

type UserAvatarProps = {
  userId: string;
  avatarUrl?: string | null;
  isDemo?: boolean;
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
  isDemo = false,
  size = 44,
  accessibilityLabel = 'Open profile',
  containerStyle,
}: UserAvatarProps) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      onPress={() => router.push(`/user/${userId}` as never)}
      style={({ pressed }) => [containerStyle, pressed && styles.pressed]}
    >
      <AvatarVisual userId={userId} avatarUrl={avatarUrl} isDemo={isDemo} size={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.62 },
});
