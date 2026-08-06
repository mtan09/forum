import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import WebFloorRail from '@/components/web-floor-rail';
import { type Palette } from '@/constants/theme';
import { useAuth } from '@/context/authContext';
import { usePalette } from '@/hooks/use-palette';
import { Image } from 'expo-image';
import { Slot, usePathname, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

type NavItem = {
  label: string;
  href: '/' | '/search' | '/ai' | '/following' | '/messages' | '/profile';
  icon: 'house' | 'magnifyingglass' | 'brain' | 'person.2.fill' | 'envelope' | 'person';
  match: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: 'house', match: (path) => path === '/' },
  { label: 'Discover', href: '/search', icon: 'magnifyingglass', match: (path) => path.startsWith('/search') },
  { label: 'forumAI', href: '/ai', icon: 'brain', match: (path) => path.startsWith('/ai') },
  { label: 'Following', href: '/following', icon: 'person.2.fill', match: (path) => path.startsWith('/following') },
  { label: 'Messages', href: '/messages', icon: 'envelope', match: (path) => path.startsWith('/messages') || path.startsWith('/dm/') },
  { label: 'Profile', href: '/profile', icon: 'person', match: (path) => path.startsWith('/profile') },
];

function routeWidth(pathname: string): number {
  if (pathname.startsWith('/ai')) return 900;
  if (pathname.startsWith('/search')) return 1040;
  if (pathname.startsWith('/profile')) return 1080;
  if (pathname.startsWith('/debate')) return 840;
  return 780;
}

export default function WebTabLayout() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const compact = width < 1180;
  const phone = width < 700;
  const compactFloorRail = width < 1320;
  // The tab layout can render for one frame while the root navigator redirects
  // a signed-out visitor to the landing page. Do not issue authenticated Floor
  // requests during that transition.
  const showFloorRail = !!user && pathname === '/' && width >= 1180;

  return (
    <ThemedView style={styles.page}>
      {!compact && (
        <ThemedView style={styles.sidebar}>
          <View>
            <View style={styles.brand}>
              <Image source={require('@/assets/images/forumlogo.png')} style={styles.logo} contentFit="contain" />
              <ThemedText style={styles.brandText}>forum</ThemedText>
            </View>

            <View style={styles.nav}>
              {NAV_ITEMS.map((item) => {
                const active = item.match(pathname);
                return (
                  <Pressable
                    key={item.href}
                    onPress={() => router.push(item.href)}
                    accessibilityRole="link"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.navItem,
                      active && styles.navItemActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.activeRail, active && styles.activeRailVisible]} />
                    <IconSymbol name={item.icon} size={21} color={active ? c.primary : c.subtle} />
                    <ThemedText style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => router.push('/createpost')}
              style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Create a post"
            >
              <IconSymbol name="plus" size={20} color={c.onPrimary} />
              <ThemedText style={styles.createButtonText}>Create post</ThemedText>
            </Pressable>
          </View>

          <View style={styles.sidebarFooter}>
            <Pressable
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [styles.settingsLink, pressed && styles.pressed]}
            >
              <IconSymbol name="gearshape.fill" size={18} color={c.muted} />
              <ThemedText style={styles.settingsText}>Settings</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => router.push('/profile')}
              style={({ pressed }) => [styles.account, pressed && styles.pressed]}
            >
              <Image
                source={user?.avatar_url ? { uri: user.avatar_url } : require('@/assets/images/Default_pfp.jpg')}
                style={styles.avatar}
              />
              <View style={styles.accountCopy}>
                <ThemedText numberOfLines={1} style={styles.accountName}>{user?.username ?? 'Your profile'}</ThemedText>
                <ThemedText numberOfLines={1} style={styles.accountMeta}>View account</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={16} color={c.faint} />
            </Pressable>
          </View>
        </ThemedView>
      )}

      <ThemedView style={styles.workspace}>
        {compact && (
          <ThemedView style={[styles.mobileHeader, phone && styles.phoneHeader]}>
            <View style={styles.mobileBrand}>
              <Image source={require('@/assets/images/forumlogo.png')} style={styles.mobileLogo} contentFit="contain" />
              <ThemedText style={styles.mobileBrandText}>forum</ThemedText>
            </View>
            {!phone ? (
              <View style={styles.mobileNav}>
              {NAV_ITEMS.filter((item) => ['/', '/search', '/ai', '/profile'].includes(item.href)).map((item) => {
                const active = item.match(pathname);
                return (
                  <Pressable
                    key={item.href}
                    onPress={() => router.push(item.href)}
                    accessibilityLabel={item.label}
                    style={({ pressed }) => [styles.mobileNavItem, active && styles.mobileNavItemActive, pressed && styles.pressed]}
                  >
                    <IconSymbol name={item.icon} size={21} color={active ? c.primary : c.muted} />
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => router.push('/debate')}
                accessibilityLabel="The Floor"
                style={({ pressed }) => [styles.mobileNavItem, pathname.startsWith('/debate') && styles.mobileNavItemActive, pressed && styles.pressed]}
              >
                <IconSymbol name="bubble.left.and.bubble.right" size={21} color={pathname.startsWith('/debate') ? c.primary : c.muted} />
              </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => router.push('/createpost')}
                style={({ pressed }) => [styles.phoneCreate, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Create a post"
              >
                <IconSymbol name="plus" size={17} color={c.onPrimary} />
                <ThemedText style={styles.phoneCreateText}>Post</ThemedText>
              </Pressable>
            )}
          </ThemedView>
        )}

        <ThemedView style={[styles.routeRow, compact && styles.routeRowCompact, phone && styles.routeRowPhone]}>
          <ThemedView
            style={[
              styles.routeFrame,
              { maxWidth: showFloorRail ? (compactFloorRail ? 620 : 680) : routeWidth(pathname) },
              showFloorRail && styles.feedFrame,
              compact && styles.routeFrameCompact,
            ]}
          >
            <Slot />
          </ThemedView>
          {showFloorRail && <WebFloorRail compact={compactFloorRail} />}
        </ThemedView>

        {phone && (
          <ThemedView style={styles.bottomNav}>
            {NAV_ITEMS.filter((item) => ['/', '/search', '/ai', '/profile'].includes(item.href)).map((item) => {
              const active = item.match(pathname);
              return (
                <Pressable
                  key={item.href}
                  onPress={() => router.push(item.href)}
                  accessibilityLabel={item.label}
                  style={({ pressed }) => [styles.bottomNavItem, pressed && styles.pressed]}
                >
                  <IconSymbol name={item.icon} size={21} color={active ? c.primary : c.muted} />
                  <ThemedText style={[styles.bottomNavLabel, active && styles.bottomNavLabelActive]}>
                    {item.label === 'Discover' ? 'Search' : item.label}
                  </ThemedText>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => router.push('/debate')}
              accessibilityLabel="The Floor"
              style={({ pressed }) => [styles.bottomNavItem, pressed && styles.pressed]}
            >
              <IconSymbol name="bubble.left.and.bubble.right" size={21} color={pathname.startsWith('/debate') ? c.primary : c.muted} />
              <ThemedText style={[styles.bottomNavLabel, pathname.startsWith('/debate') && styles.bottomNavLabelActive]}>
                Floor
              </ThemedText>
            </Pressable>
          </ThemedView>
        )}
      </ThemedView>
    </ThemedView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  page: {
    flex: 1,
    minHeight: '100vh' as any,
    flexDirection: 'row',
    backgroundColor: c.surface,
  },
  sidebar: {
    width: 252,
    height: '100vh' as any,
    flexShrink: 0,
    justifyContent: 'space-between',
    borderRightWidth: 1,
    borderRightColor: c.border,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: c.background,
  },
  brand: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 8,
  },
  logo: {
    width: 32,
    height: 32,
  },
  brandText: {
    color: c.primary,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  nav: {
    gap: 3,
    marginTop: 20,
  },
  navItem: {
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
    cursor: 'pointer',
  },
  navItemActive: {
    backgroundColor: c.accentSoftBg,
  },
  activeRail: {
    position: 'absolute',
    left: 0,
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  activeRailVisible: {
    backgroundColor: c.primary,
  },
  navLabel: {
    color: c.subtle,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  navLabelActive: {
    color: c.primary,
    fontWeight: '900',
  },
  createButton: {
    minHeight: 46,
    marginTop: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.primary,
    cursor: 'pointer',
  },
  createButtonText: {
    color: c.onPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  sidebarFooter: {
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  settingsLink: {
    minHeight: 38,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
  },
  settingsText: {
    color: c.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  account: {
    minHeight: 58,
    borderRadius: 12,
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  accountCopy: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  accountMeta: {
    color: c.muted,
    fontSize: 10,
    lineHeight: 13,
    marginTop: 1,
  },
  workspace: {
    flex: 1,
    minWidth: 0,
    backgroundColor: c.surface,
  },
  routeRow: {
    flex: 1,
    height: '100vh' as any,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 22,
    paddingHorizontal: 22,
    backgroundColor: c.surface,
  },
  routeRowCompact: {
    height: undefined,
    minHeight: 0,
    paddingHorizontal: 0,
  },
  routeRowPhone: {
    paddingBottom: 66,
  },
  routeFrame: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    backgroundColor: c.background,
    overflow: 'hidden',
  },
  feedFrame: {
    height: undefined,
    alignSelf: 'stretch',
    marginVertical: 20,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 22,
  },
  routeFrameCompact: {
    maxWidth: '100%',
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  mobileHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    backgroundColor: c.surface,
    zIndex: 10,
  },
  phoneHeader: {
    minHeight: 56,
    paddingHorizontal: 16,
  },
  mobileBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  mobileLogo: {
    width: 27,
    height: 27,
  },
  mobileBrandText: {
    color: c.primary,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '900',
  },
  mobileNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  mobileNavItem: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileNavItemActive: {
    backgroundColor: c.accentSoftBg,
  },
  phoneCreate: {
    minHeight: 36,
    borderRadius: 12,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: c.primary,
  },
  phoneCreateText: {
    color: c.onPrimary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  bottomNav: {
    position: 'fixed' as any,
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 66,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.surfaceRaised,
    zIndex: 50,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  bottomNavLabel: {
    color: c.muted,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
  },
  bottomNavLabelActive: {
    color: c.primary,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.62,
  },
});
