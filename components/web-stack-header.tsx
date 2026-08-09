import { ThemedText } from '@/components/themed-text';
import ForumLogo from '@/components/forum-logo';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WEB_CONTENT_MAX_WIDTH } from '@/constants/layout';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { tapLight } from '@/lib/haptics';

/**
 * Web detail routes live outside the tab shell. Keep their chrome quiet and
 * product-like: one compact back affordance and a brand home link, without
 * repeating generic route names such as "Post" or "Article".
 */
export default function WebStackHeader({
  maxWidth = WEB_CONTENT_MAX_WIDTH,
  gutter = 20,
  title,
}: { maxWidth?: number; gutter?: number; title?: string }) {
  const router = useRouter();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  // Inside the shell the sidebar already carries the brand, so a titled header
  // names the screen instead of repeating it: a back arrow and "Post".
  if (title) {
    return (
      <View style={styles.bar}>
        <View style={styles.titledInner}>
          <Pressable
            onPress={() => { tapLight(); goBack(); }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.backCircle, pressed && styles.pressed]}
          >
            <IconSymbol name="chevron.left" size={19} color={c.text} />
          </Pressable>
          <ThemedText numberOfLines={1} style={styles.screenTitle}>{title}</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bar}>
      <View style={[styles.inner, { maxWidth, paddingHorizontal: gutter }]}>
        <Pressable
          onPress={() => { tapLight(); goBack(); }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <IconSymbol name="chevron.left" size={18} color={c.text} />
          <ThemedText style={styles.backText}>Back</ThemedText>
        </Pressable>

        <Pressable
          onPress={() => { tapLight(); router.replace('/'); }}
          accessibilityRole="link"
          accessibilityLabel="forum home"
          style={({ pressed }) => [styles.brand, pressed && styles.pressed]}
        >
          <ForumLogo size={23} style={styles.logo} />
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
    height: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titledInner: {
    width: '100%',
    height: '100%',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
    cursor: 'pointer',
  },
  screenTitle: {
    flexShrink: 1,
    color: c.text,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
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
