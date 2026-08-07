import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { API_URL } from '@/lib/api';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

// Marketing screenshots are the finished 6.9-inch App Store captures, resized
// and converted to WebP (2.2MB of PNG became 375KB). They already have the
// Dynamic Island removed and corners rounded to transparent, so they drop onto
// the page as phone mockups without a device frame.
const SHOTS = {
  feed: require('@/assets/images/marketing/feed.webp'),
  summary: require('@/assets/images/marketing/summary.webp'),
  floor: require('@/assets/images/marketing/floor.webp'),
  forumai: require('@/assets/images/marketing/forumai.webp'),
  discover: require('@/assets/images/marketing/discover.webp'),
};

type Feature = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  shot: number;
};

const FEATURES: Feature[] = [
  {
    key: 'feed',
    eyebrow: 'ONE FEED, EVERY SIDE',
    title: 'News and community in the same place.',
    body: 'Publisher coverage and community posts share one timeline, and every article carries the outlet’s Left, Center or Right tag. Move between For You, Random and Against You to follow your interests or deliberately step outside them.',
    shot: SHOTS.feed,
  },
  {
    key: 'summary',
    eyebrow: 'THREE PERSPECTIVES',
    title: 'See how the same story gets framed.',
    body: 'Every major story is clustered across outlets and summarised from three directions, so you can read the left, centre and right account of the same events side by side instead of picking one and hoping.',
    shot: SHOTS.summary,
  },
  {
    key: 'floor',
    eyebrow: 'THE FLOOR',
    title: 'Find where you actually stand.',
    body: 'Pin your position on the day’s most contested questions, then see the whole room’s distribution against it. The spectrum is computed from what you post and vote on, not from a quiz you take once.',
    shot: SHOTS.floor,
  },
  {
    key: 'forumai',
    eyebrow: 'FORUMAI',
    title: 'Ask a question, choose the lens.',
    body: 'Put a political question to forumAI and read the answer through a left, centre or right lens. Responses are grounded in current attributed coverage, and it will tell you when the evidence is thin.',
    shot: SHOTS.forumai,
  },
  {
    key: 'discover',
    eyebrow: 'DISCOVER',
    title: 'Search the whole conversation.',
    body: 'Search across articles, story clusters and community posts at once. Filter to the coverage or the discussion, and jump straight from a search result into the thread arguing about it.',
    shot: SHOTS.discover,
  },
];

const STEPS = [
  { n: '1', title: 'Pick your interests', body: 'Choose the topics you care about. Your feed starts there and adapts as you read and vote.' },
  { n: '2', title: 'Read across the spectrum', body: 'Every article is tagged by outlet lean, and every story is summarised from three directions.' },
  { n: '3', title: 'Take a position', body: 'Post, vote and pin a stance on The Floor. Your spectrum placement follows from what you actually do.' },
];

export default function WebLanding() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const compact = width < 900;
  const narrow = width < 620;
  // The hero keeps its side-by-side layout down to 720; only the section
  // stacking below uses `compact`.
  const heroSideBySide = width >= 720;
  const wideHero = width >= 1100;
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  // The bar slides down from above rather than appearing outright. Kept
  // mounted so it can animate back out on the way up.
  const barSlide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barSlide, {
      toValue: scrolledPastHero ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [scrolledPastHero, barSlide]);

  const openLegal = (path: string) => {
    WebBrowser.openBrowserAsync(`${API_URL}${path}`).catch(() => {});
  };

  const ctaPair = (variant: 'hero' | 'closing') => (
    <View style={[styles.ctaRow, narrow && styles.ctaRowStacked]}>
      <Pressable
        onPress={() => router.push('/auth/createaccount')}
        style={({ pressed }) => [
          styles.primaryButton,
          variant === 'hero' && styles.primaryButtonOnBrand,
          narrow && styles.buttonFull,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={[styles.primaryButtonText, variant === 'hero' && styles.primaryButtonTextOnBrand]}>
          Create an account
        </ThemedText>
      </Pressable>
      <Pressable
        onPress={() => router.push('/auth/login')}
        style={({ pressed }) => [
          styles.secondaryButton,
          variant === 'hero' && styles.secondaryButtonOnBrand,
          narrow && styles.buttonFull,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={[styles.secondaryButtonText, variant === 'hero' && styles.secondaryButtonTextOnBrand]}>
          Log in
        </ThemedText>
      </Pressable>
    </View>
  );

  return (
    <ThemedView style={styles.page}>
      {!narrow && (
        <Animated.View
          pointerEvents={scrolledPastHero ? 'auto' : 'none'}
          style={[
            styles.stickyBar,
            {
              opacity: barSlide,
              transform: [
                { translateY: barSlide.interpolate({ inputRange: [0, 1], outputRange: [-64, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.brand}>
            <Image
              source={require('@/assets/images/forumlogoInverse.png')}
              style={styles.stickyLogo}
              contentFit="contain"
            />
            <ThemedText style={styles.stickyWordmark}>forum</ThemedText>
          </View>
          <View style={styles.navActions}>
            <Pressable
              onPress={() => router.push('/auth/login')}
              style={({ pressed }) => [styles.navLink, pressed && styles.pressed]}
            >
              <ThemedText style={styles.stickyNavLinkText}>Log in</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => router.push('/auth/createaccount')}
              style={({ pressed }) => [styles.stickyNavButton, pressed && styles.pressed]}
            >
              <ThemedText style={styles.stickyNavButtonText}>Sign up</ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={64}
        onScroll={(event) => {
          const y = event.nativeEvent.contentOffset.y;
          const past = y > event.nativeEvent.layoutMeasurement.height * 0.75;
          if (past !== scrolledPastHero) setScrolledPastHero(past);
        }}
      >
        {/* ---------------------------------------------------------- hero */}
        <View style={[styles.hero, compact && styles.heroCompact]}>
          <View style={[styles.navBar, narrow && styles.navBarNarrow]}>
            <View style={styles.brand}>
              <Image
                source={require('@/assets/images/forumlogoInverse.png')}
                style={styles.logo}
                contentFit="contain"
              />
              <ThemedText style={styles.wordmark}>forum</ThemedText>
            </View>
            {/* The hero already carries both calls to action, so the header
                stays a wordmark until you scroll past them. */}
            {!narrow && scrolledPastHero && (
              <View style={styles.navActions}>
                <Pressable
                  onPress={() => router.push('/auth/login')}
                  style={({ pressed }) => [styles.navLink, pressed && styles.pressed]}
                >
                  <ThemedText style={styles.navLinkText}>Log in</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/auth/createaccount')}
                  style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
                >
                  <ThemedText style={styles.navButtonText}>Sign up</ThemedText>
                </Pressable>
              </View>
            )}
          </View>

          {/* Copy and device sit side by side on wide screens; the hero used to
              leave the whole right half of a laptop empty. */}
          <View style={[styles.heroRow, !heroSideBySide && styles.heroRowStacked]}>
            <View style={styles.heroBody}>
              <ThemedText style={styles.eyebrow}>SEE THE WHOLE CONVERSATION</ThemedText>
              <ThemedText style={[styles.headline, compact && styles.headlineCompact, narrow && styles.headlineNarrow]}>
                Politics makes more sense from more than one side.
              </ThemedText>
              <ThemedText style={styles.subhead}>
                Follow the coverage, compare perspectives, and join discussions without flattening every
                issue into one lane.
              </ThemedText>
              {ctaPair('hero')}
              <View style={styles.perspectiveRule}>
                <View style={[styles.ruleSegment, { backgroundColor: c.blue }]} />
                <View style={[styles.ruleSegment, { backgroundColor: c.centerTag }]} />
                <View style={[styles.ruleSegment, { backgroundColor: c.red }]} />
              </View>
              <View style={styles.ruleLabels}>
                <ThemedText style={styles.ruleLabel}>Left</ThemedText>
                <ThemedText style={styles.ruleLabel}>Center</ThemedText>
                <ThemedText style={styles.ruleLabel}>Right</ThemedText>
              </View>
            </View>

            {/* Both devices need ~1100px to sit beside the copy. Between 720
                and 1100 a single narrower device still fills the space that
                would otherwise be empty; below that the hero stacks. */}
            {width >= 720 && (
              <View style={[styles.heroArt, !wideHero && styles.heroArtNarrow]}>
                <View style={[styles.heroArtHalo, !wideHero && styles.heroArtHaloNarrow]} />
                {wideHero && (
                  <Image source={SHOTS.floor} style={styles.heroShotBack} contentFit="contain" />
                )}
                <Image
                  source={SHOTS.feed}
                  style={[styles.heroShotFront, !wideHero && styles.heroShotFrontNarrow]}
                  contentFit="contain"
                />
              </View>
            )}
          </View>
        </View>

        {/* ------------------------------------------------------ features */}
        <View style={styles.sections}>
          {FEATURES.map((feature, index) => (
            <View
              key={feature.key}
              style={[
                styles.feature,
                compact && styles.featureStacked,
                !compact && index % 2 === 1 && styles.featureReversed,
              ]}
            >
              <View style={[styles.featureCopy, compact && styles.featureCopyStacked]}>
                <ThemedText style={styles.featureEyebrow}>{feature.eyebrow}</ThemedText>
                <ThemedText style={[styles.featureTitle, narrow && styles.featureTitleNarrow]}>
                  {feature.title}
                </ThemedText>
                <ThemedText style={styles.featureBody}>{feature.body}</ThemedText>
              </View>
              <View style={styles.shotWrap}>
                <View style={styles.shotGlow} />
                <Image source={feature.shot} style={styles.shot} contentFit="contain" />
              </View>
            </View>
          ))}
        </View>

        {/* --------------------------------------------------- how it works */}
        <View style={styles.stepsBand}>
          <ThemedText style={styles.bandEyebrow}>HOW IT WORKS</ThemedText>
          <ThemedText style={[styles.bandTitle, narrow && styles.bandTitleNarrow]}>
            Three steps to a feed that argues back.
          </ThemedText>
          <View style={[styles.stepsRow, compact && styles.stepsRowStacked]}>
            {STEPS.map((step) => (
              <View key={step.n} style={styles.stepCard}>
                <View style={styles.stepNumber}>
                  <ThemedText style={styles.stepNumberText}>{step.n}</ThemedText>
                </View>
                <ThemedText style={styles.stepTitle}>{step.title}</ThemedText>
                <ThemedText style={styles.stepBody}>{step.body}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* ------------------------------------------------------ close CTA */}
        <View style={styles.closing}>
          <ThemedText style={[styles.closingTitle, narrow && styles.closingTitleNarrow]}>
            Make up your own mind.
          </ThemedText>
          <ThemedText style={styles.closingText}>
            One account works across web, iOS and Android.
          </ThemedText>
          {ctaPair('closing')}
        </View>

        {/* ---------------------------------------------------------- footer */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerBrand}>forum: Every Side</ThemedText>
          <View style={styles.footerLinks}>
            <Pressable onPress={() => openLegal('/legal/privacy')}>
              <ThemedText style={styles.footerLink}>Privacy</ThemedText>
            </Pressable>
            <Pressable onPress={() => openLegal('/legal/terms')}>
              <ThemedText style={styles.footerLink}>Terms</ThemedText>
            </Pressable>
            <Pressable onPress={() => openLegal('/support')}>
              <ThemedText style={styles.footerLink}>Support</ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  page: { flex: 1, backgroundColor: c.background },

  // Appears only after the hero's own calls to action have scrolled away, so
  // the two pairs are never on screen together.
  stickyBar: {
    position: 'fixed' as any, top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 56, paddingVertical: 12,
    backgroundColor: c.primary,
    borderBottomWidth: 1, borderBottomColor: c.onPrimaryOverlay,
  },
  stickyLogo: { width: 30, height: 30 },
  stickyWordmark: { color: c.onPrimary, fontSize: 21, lineHeight: 26, fontWeight: '900', letterSpacing: -0.7 },
  stickyNavLinkText: { color: c.onPrimary, fontSize: 14, lineHeight: 18, fontWeight: '800' },
  stickyNavButton: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 11,
    backgroundColor: c.onPrimary,
  },
  stickyNavButtonText: { color: c.primary, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 0 },

  // hero -------------------------------------------------------------------
  hero: { paddingHorizontal: 56, paddingTop: 30, paddingBottom: 72, backgroundColor: c.primary },
  heroCompact: { paddingHorizontal: 26, paddingBottom: 52 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 74 },
  navBarNarrow: { marginBottom: 44 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 44, height: 44 },
  wordmark: { color: c.onPrimary, fontSize: 31, lineHeight: 37, fontWeight: '900', letterSpacing: -1 },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navLink: { paddingHorizontal: 14, paddingVertical: 10 },
  navLinkText: { color: c.onPrimary, fontSize: 14, lineHeight: 18, fontWeight: '800' },
  navButton: {
    paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12,
    backgroundColor: c.onPrimary,
  },
  navButtonText: { color: c.primary, fontSize: 14, lineHeight: 18, fontWeight: '900' },

  heroRow: {
    flexDirection: 'row', alignItems: 'center', gap: 48,
    maxWidth: 1240, width: '100%', marginHorizontal: 'auto' as any,
  },
  heroRowStacked: { flexDirection: 'column', alignItems: 'stretch' },
  heroBody: { flex: 1, maxWidth: 660 },

  // Two devices, the back one offset and dimmed, so the hero shows the product
  // without needing a mocked-up laptop frame.
  heroArt: { width: 430, height: 540, alignItems: 'center', justifyContent: 'center' },
  heroArtNarrow: { width: 250, height: 470 },
  heroArtHalo: {
    position: 'absolute', width: 430, height: 430, borderRadius: 215,
    backgroundColor: c.onPrimary, opacity: 0.11,
  },
  heroArtHaloNarrow: { width: 250, height: 250, borderRadius: 125 },
  // Kept fully opaque. Dimming it let the purple hero show through the dark
  // capture, which read as a lilac film over the screenshot rather than depth;
  // the offset, rotation and overlap carry that on their own.
  heroShotBack: {
    position: 'absolute', width: 210, height: 456,
    left: 18, top: 22,
    transform: [{ rotate: '-7deg' }] as any,
  },
  heroShotFront: {
    position: 'absolute', width: 244, height: 530,
    right: 22, top: 46,
    transform: [{ rotate: '4deg' }] as any,
  },
  heroShotFrontNarrow: {
    width: 208, height: 452, right: undefined, top: 12,
    transform: [{ rotate: '0deg' }] as any,
  },
  eyebrow: { color: c.onPrimaryMuted, fontSize: 11, lineHeight: 15, fontWeight: '900', letterSpacing: 1.5 },
  headline: {
    color: c.onPrimary, fontSize: 62, lineHeight: 68, fontWeight: '900',
    letterSpacing: -2, marginTop: 14,
  },
  headlineCompact: { fontSize: 46, lineHeight: 52, letterSpacing: -1.4 },
  headlineNarrow: { fontSize: 34, lineHeight: 40, letterSpacing: -1 },
  subhead: { maxWidth: 620, color: c.onPrimaryMuted, fontSize: 18, lineHeight: 28, marginTop: 20 },

  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 32 },
  ctaRowStacked: { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
  buttonFull: { width: '100%' },

  perspectiveRule: {
    height: 7, maxWidth: 330, borderRadius: 4, overflow: 'hidden',
    flexDirection: 'row', marginTop: 52,
  },
  ruleSegment: { flex: 1 },
  ruleLabels: { flexDirection: 'row', maxWidth: 330, marginTop: 9 },
  ruleLabel: { flex: 1, color: c.onPrimaryMuted, fontSize: 11, lineHeight: 15, fontWeight: '800', textAlign: 'center' },

  // buttons ----------------------------------------------------------------
  primaryButton: {
    minHeight: 52, minWidth: 190, borderRadius: 15, paddingHorizontal: 26,
    alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary,
  },
  primaryButtonOnBrand: { backgroundColor: c.onPrimary },
  primaryButtonText: { color: c.onPrimary, fontSize: 15, lineHeight: 19, fontWeight: '900' },
  primaryButtonTextOnBrand: { color: c.primary },
  secondaryButton: {
    minHeight: 52, minWidth: 150, borderRadius: 15, borderWidth: 1.5, paddingHorizontal: 26,
    borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card,
  },
  secondaryButtonOnBrand: { backgroundColor: 'transparent', borderColor: c.onPrimaryOverlay },
  secondaryButtonText: { color: c.primary, fontSize: 15, lineHeight: 19, fontWeight: '900' },
  secondaryButtonTextOnBrand: { color: c.onPrimary },

  // features ---------------------------------------------------------------
  sections: { paddingHorizontal: 56, paddingVertical: 20 },
  feature: {
    flexDirection: 'row', alignItems: 'center', gap: 64,
    maxWidth: 1060, width: '100%', marginHorizontal: 'auto' as any,
    paddingVertical: 44,
  },
  featureReversed: { flexDirection: 'row-reverse' },
  featureStacked: { flexDirection: 'column', gap: 30, paddingVertical: 40 },
  featureCopy: { flex: 1, minWidth: 280 },
  featureCopyStacked: { width: '100%' },
  featureEyebrow: { color: c.primary, fontSize: 11, lineHeight: 15, fontWeight: '900', letterSpacing: 1.4 },
  featureTitle: {
    fontSize: 34, lineHeight: 41, fontWeight: '900', letterSpacing: -1, marginTop: 12, maxWidth: 480,
  },
  featureTitleNarrow: { fontSize: 26, lineHeight: 32, letterSpacing: -0.6 },
  featureBody: { color: c.subtle, fontSize: 16, lineHeight: 26, marginTop: 16, maxWidth: 500 },

  shotWrap: { width: 236, alignItems: 'center', justifyContent: 'center' },
  // A soft brand halo behind the device so the transparent corners of the
  // capture read as intentional rather than as a cut-out. Brand purple at low
  // opacity so it shows on both the light and dark background.
  shotGlow: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: c.primary, opacity: 0.16,
  },
  shot: { width: 236, height: 513 },

  // how it works -----------------------------------------------------------
  stepsBand: { paddingHorizontal: 56, paddingVertical: 76, backgroundColor: c.accentSoftBg },
  bandEyebrow: {
    color: c.primary, fontSize: 11, lineHeight: 15, fontWeight: '900',
    letterSpacing: 1.4, textAlign: 'center',
  },
  bandTitle: {
    fontSize: 40, lineHeight: 47, fontWeight: '900', letterSpacing: -1.2,
    textAlign: 'center', marginTop: 12, marginBottom: 46,
  },
  bandTitleNarrow: { fontSize: 28, lineHeight: 34, letterSpacing: -0.7 },
  stepsRow: {
    flexDirection: 'row', gap: 22, maxWidth: 1060, width: '100%',
    marginHorizontal: 'auto' as any,
  },
  stepsRowStacked: { flexDirection: 'column' },
  stepCard: {
    flex: 1, minWidth: 240, borderRadius: 20, borderWidth: 1,
    borderColor: c.cardBorder, backgroundColor: c.surfaceRaised,
    paddingHorizontal: 26, paddingVertical: 28,
  },
  stepNumber: {
    width: 38, height: 38, borderRadius: 13, backgroundColor: c.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumberText: { color: c.onPrimary, fontSize: 17, lineHeight: 22, fontWeight: '900' },
  stepTitle: { fontSize: 19, lineHeight: 25, fontWeight: '900', marginTop: 16 },
  stepBody: { color: c.subtle, fontSize: 14, lineHeight: 22, marginTop: 8 },

  // closing ----------------------------------------------------------------
  closing: { paddingHorizontal: 56, paddingVertical: 86, alignItems: 'center' },
  closingTitle: { fontSize: 46, lineHeight: 53, fontWeight: '900', letterSpacing: -1.5, textAlign: 'center' },
  closingTitleNarrow: { fontSize: 31, lineHeight: 38, letterSpacing: -0.8 },
  closingText: { color: c.muted, fontSize: 16, lineHeight: 25, marginTop: 12, textAlign: 'center' },

  // footer -----------------------------------------------------------------
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 16,
    paddingHorizontal: 56, paddingVertical: 30,
    borderTopWidth: 1, borderTopColor: c.border,
  },
  footerBrand: { color: c.muted, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  footerLinks: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  footerLink: { color: c.muted, fontSize: 13, lineHeight: 18, fontWeight: '700' },

  pressed: { opacity: 0.68 },
});
