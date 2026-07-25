import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

export default function WebLanding() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const compact = width < 820;

  return (
    <ThemedView style={[styles.page, compact && styles.pageCompact]}>
      <View style={[styles.brandPanel, compact && styles.brandPanelCompact]}>
        <View style={styles.brand}>
          <Image source={require('@/assets/images/forumlogoInverse.png')} style={styles.logo} contentFit="contain" />
          <ThemedText style={styles.wordmark}>forum</ThemedText>
        </View>
        <View style={styles.heroCopy}>
          <ThemedText style={styles.eyebrow}>SEE THE WHOLE CONVERSATION</ThemedText>
          <ThemedText style={[styles.headline, compact && styles.headlineCompact]}>
            Politics makes more sense from more than one side.
          </ThemedText>
          <ThemedText style={styles.subhead}>
            Follow the coverage, compare perspectives, and join discussions without flattening every issue into one lane.
          </ThemedText>
        </View>
        <View style={styles.perspectiveRule}>
          <View style={[styles.ruleSegment, { backgroundColor: c.blue }]} />
          <View style={[styles.ruleSegment, { backgroundColor: c.centerTag }]} />
          <View style={[styles.ruleSegment, { backgroundColor: c.red }]} />
        </View>
      </View>

      <ThemedView style={[styles.actionPanel, compact && styles.actionPanelCompact]}>
        <View style={styles.actionCard}>
          <ThemedText style={styles.actionEyebrow}>WELCOME TO FORUM</ThemedText>
          <ThemedText style={styles.actionTitle}>Make up your own mind.</ThemedText>
          <ThemedText style={styles.actionText}>
            Build a feed around different perspectives, explore today’s strongest stories, and ask forumAI to compare the arguments.
          </ThemedText>
          <Pressable
            onPress={() => router.push('/auth/createaccount')}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <ThemedText style={styles.primaryButtonText}>Create an account</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => router.push('/auth/login')}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <ThemedText style={styles.secondaryButtonText}>Log in</ThemedText>
          </Pressable>
          <ThemedText style={styles.footnote}>One account works across web, iOS, and Android.</ThemedText>
        </View>
      </ThemedView>
    </ThemedView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  page: {
    flex: 1,
    minHeight: '100vh' as any,
    flexDirection: 'row',
    backgroundColor: c.background,
  },
  pageCompact: {
    flexDirection: 'column',
  },
  brandPanel: {
    flex: 1.15,
    minHeight: '100vh' as any,
    paddingHorizontal: 56,
    paddingVertical: 42,
    justifyContent: 'space-between',
    backgroundColor: c.primary,
  },
  brandPanelCompact: {
    minHeight: 390,
    paddingHorizontal: 26,
    paddingVertical: 28,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
  },
  wordmark: {
    color: c.onPrimary,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroCopy: {
    maxWidth: 670,
  },
  eyebrow: {
    color: c.onPrimaryMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  headline: {
    color: c.onPrimary,
    fontSize: 54,
    lineHeight: 61,
    fontWeight: '900',
    letterSpacing: -1.7,
    marginTop: 13,
  },
  headlineCompact: {
    fontSize: 36,
    lineHeight: 42,
  },
  subhead: {
    maxWidth: 620,
    color: c.onPrimaryMuted,
    fontSize: 17,
    lineHeight: 27,
    marginTop: 18,
  },
  perspectiveRule: {
    height: 7,
    maxWidth: 330,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  ruleSegment: {
    flex: 1,
  },
  actionPanel: {
    flex: 0.85,
    minHeight: '100vh' as any,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 42,
    backgroundColor: c.background,
  },
  actionPanelCompact: {
    minHeight: 480,
    padding: 24,
  },
  actionCard: {
    width: '100%',
    maxWidth: 430,
  },
  actionEyebrow: {
    color: c.primary,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  actionTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '900',
    letterSpacing: -0.7,
    marginTop: 8,
  },
  actionText: {
    color: c.muted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    marginBottom: 26,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primary,
  },
  primaryButtonText: {
    color: c.onPrimary,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: c.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    backgroundColor: c.card,
  },
  secondaryButtonText: {
    color: c.primary,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  footnote: {
    color: c.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  pressed: {
    opacity: 0.68,
  },
});
