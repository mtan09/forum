import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Image as NativeImage, View } from 'react-native';

const DEMO_COLORS = [
  '#7C3AED',
  '#2563EB',
  '#0F766E',
  '#B45309',
  '#BE123C',
  '#6D28D9',
  '#0369A1',
  '#4D7C0F',
];

function colorForUser(userId: string): string {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = ((hash << 5) - hash + userId.charCodeAt(index)) | 0;
  }
  return DEMO_COLORS[Math.abs(hash) % DEMO_COLORS.length];
}

type Props = {
  userId: string;
  avatarUrl?: string | null;
  isDemo?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export default function AvatarVisual({ userId, avatarUrl, isDemo = false, size = 44, style }: Props) {
  const [remoteFailed, setRemoteFailed] = useState(false);
  const circleStyle = useMemo(
    () => ({ width: size, height: size, borderRadius: size / 2 }),
    [size],
  );

  useEffect(() => {
    setRemoteFailed(false);
  }, [avatarUrl]);

  if (isDemo) {
    return (
      <View
        style={[
          circleStyle,
          style,
          {
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            backgroundColor: colorForUser(userId),
          },
        ]}
      >
        <Image
          source={require('@/assets/images/adaptive-icon.png')}
          style={{ width: size * 0.72, height: size * 0.72, tintColor: '#FFFFFF' }}
          contentFit="contain"
        />
      </View>
    );
  }

  return (
    <View style={[circleStyle, { overflow: 'hidden' }, style]}>
      {avatarUrl && !remoteFailed ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={avatarUrl}
          onError={() => setRemoteFailed(true)}
        />
      ) : (
        <NativeImage
          source={require('@/assets/images/Default_pfp.jpg')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      )}
    </View>
  );
}
