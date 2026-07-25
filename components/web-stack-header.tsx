import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

/**
 * Web detail routes live outside the tab shell. Keep their chrome quiet and
 * product-like: one compact back affordance and a brand home link, without
 * repeating generic route names such as "Post" or "Article".
 */
export default function WebStackHeader() {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <IconSymbol name="chevron.left" size={18} color={c.text} />
          <ThemedText style={styles.backText}>Back</ThemedText>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/')}
          accessibilityRole="link"
          accessibilityLabel="forum home"
          style={({ pressed }) => [styles.brand, pressed && styles.pressed]}
        >
          <Image
            source={require('@/assets/images/forumlogo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <ThemedText style={styles.brandText}>forum</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  bar: {
    height: 58,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    backgroundColor: c.background,
  },
  inner: {
    width: '100%',
    maxWidth: 840,
    height: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    minHeight: 36,
    paddingHorizontal: 10,
    marginLeft: -10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    cursor: 'pointer',
  },
  backText: {
    color: c.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  brand: {
    minHeight: 36,
    paddingHorizontal: 8,
    marginRight: -8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    cursor: 'pointer',
  },
  logo: {
    width: 23,
    height: 23,
  },
  brandText: {
    color: c.primary,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  pressed: {
    opacity: 0.58,
    backgroundColor: c.surfaceMuted,
  },
});
