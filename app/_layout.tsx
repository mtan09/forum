import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from 'expo-status-bar';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppErrorBoundary } from '@/components/app-error-boundary';
import WebStackHeader from '@/components/web-stack-header';

import { usePalette } from '@/hooks/use-palette';

import { PostProvider } from '../context/postContext';

import { AuthProvider, useAuth } from '@/context/authContext';
import { AIConsentProvider } from '@/context/aiConsentContext';

import { FeedPreferenceProvider } from '@/context/feedPreferenceContext';
import { ThemeModeProvider } from '@/context/themeContext';

import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { attachNotificationRouter } from '@/lib/notifications';
import { initSentry } from '@/lib/sentry';
import { rememberProductRoute } from '@/lib/route-context';

initSentry();


// export const unstable_settings = {
//   anchor: '(tabs)',
// };

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <ThemeModeProvider>
        <FeedPreferenceProvider>
          <AuthProvider>
            <AIConsentProvider>
              <PostProvider>
                <ThemedShell />
              </PostProvider>
            </AIConsentProvider>
          </AuthProvider>
        </FeedPreferenceProvider>
      </ThemeModeProvider>
    </AppErrorBoundary>
  );
}

// Splitting this out lets useColorScheme see ThemeModeProvider, so the
// navigation chrome + status bar follow the in-app appearance setting.
function ThemedShell() {
  const { c, scheme: colorScheme } = usePalette();
  const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = useMemo(() => ({
    ...base,
    colors: {
      ...base.colors,
      primary: c.tint,
      background: c.background,
      card: c.background,
      border: c.border,
      text: c.text,
    },
  }), [base, c]);

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </ThemeProvider>
  );
}

function AppNavigator() {
  const { session, loading, needsOnboarding } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { c } = usePalette();
  const lastRedirectRef = useRef<string | null>(null);

  const redirectTarget = loading
    ? null
    : session === null && !pathname.startsWith('/auth')
      ? pathname === '/onboarding' ? '/auth/createaccount' : '/auth/landingpage'
      : session && needsOnboarding && pathname !== '/onboarding'
        ? '/onboarding'
        : session && !needsOnboarding && pathname === '/onboarding'
          ? '/'
        : session && pathname.startsWith('/auth')
          ? '/'
          : null;

  useEffect(() => {
    rememberProductRoute(pathname);
  }, [pathname]);

  // Route notification taps once signed in. Permission and device-token
  // registration happen contextually from Settings, never right after login.
  useEffect(() => {
    if (!session) return;
    return attachNotificationRouter();
  }, [session]);

  // Navigating from an effect avoids a render-time Redirect repeatedly
  // updating the native stack when Fast Refresh temporarily preserves a
  // pathname from the previous auth state. The ref also makes the operation
  // one-shot if a native transition takes more than one render to settle.
  useEffect(() => {
    if (!redirectTarget) {
      lastRedirectRef.current = null;
      return;
    }
    if (lastRedirectRef.current === redirectTarget) return;
    lastRedirectRef.current = redirectTarget;
    router.replace(redirectTarget);
  }, [redirectTarget, router]);

  const headerLeft = useCallback(
    ({ canGoBack }: { canGoBack?: boolean }) =>
      canGoBack ? (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            opacity: pressed ? 0.5 : 1,
            paddingRight: 12,
          })}
        >
          <IconSymbol name="chevron.left" size={22} color={c.primary} />
          <Text style={{ color: c.primary, fontSize: 17 }}>Back</Text>
        </Pressable>
      ) : null,
    [c.primary, router]
  );

  const stackScreenOptions = useMemo(
    () => ({
      headerTintColor: c.primary,
      contentStyle: {
        backgroundColor: Platform.OS === 'web' ? c.surface : c.background,
      },
      ...(Platform.OS === 'web'
        ? {
            header: () => <WebStackHeader />,
          }
        : {}),
      headerLeft,
    }),
    [c.background, c.primary, c.surface, headerLeft]
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background }}>
        <ActivityIndicator size="large" color={c.muted} />
      </View>
    );
  }

  return (
        <Stack
          screenOptions={stackScreenOptions}
        >
          <Stack.Screen
            name="auth/landingpage"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="auth/login"
            options={{
              title: 'Login',
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="auth/createaccount"
            options={{
              title: 'Sign Up',
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="auth/forgotpassword"
            options={{
              title: 'Reset Password',
              headerBackTitle: "Back",
            }}
          />

          <Stack.Screen 
            name="(tabs)" 
            options={{ headerShown: false }} 
          />

          <Stack.Screen
            name="createpost"
            options={{
              presentation: Platform.OS === 'web' ? 'transparentModal' : 'formSheet',
              headerShown: false,
              sheetAllowedDetents: Platform.OS === 'web' ? undefined : [0.9],
              sheetInitialDetentIndex: 0,
              sheetGrabberVisible: Platform.OS !== 'web',
              sheetCornerRadius: 24,
              sheetLargestUndimmedDetentIndex: 'none',
              contentStyle: { backgroundColor: Platform.OS === 'web' ? 'transparent' : c.surfaceRaised },
            }}
          />
          <Stack.Screen
            name="editprofile"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="changepassword"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="post/[id]"
            options={{
              title: 'Post',
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="summary/[id]"
            options={{
              headerTitle: "",
              headerBackTitle: "Back",
              headerShown: Platform.OS !== 'web',
            }}
          />
          <Stack.Screen
            name="article/[id]"
            options={{
              title: 'Article',
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="user/[id]"
            options={{
              title: 'Profile',
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="debate/[id]"
            options={{
              title: 'The Floor',
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              title: 'Settings',
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="onboarding"
            options={{ headerShown: false, gestureEnabled: false }}
          />
          <Stack.Screen
            name="admin"
            options={{
              title: 'Reports',
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen name="admin-feedback" options={{ title: 'Feedback', headerBackTitle: 'Back' }} />
          <Stack.Screen name="admin-moderation" options={{ title: 'Moderation Audit', headerBackTitle: 'Back' }} />
          <Stack.Screen name="admin-ingest" options={{ title: 'Ingest Status', headerBackTitle: 'Back' }} />
          <Stack.Screen
            name="messages"
            options={{
              title: 'Messages',
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="following"
            options={{ title: 'Following feed', headerBackTitle: "Back" }}
          />
          <Stack.Screen
            name="dm/[userId]"
            options={{
              title: 'Chat',
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="blocked"
            options={{
              title: 'Blocked Accounts',
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="follow-requests"
            options={{ title: 'Follow Requests', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="connections/[userId]"
            options={{ title: 'Connections', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="feedback"
            options={{ title: 'Feedback', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="source/[name]"
            options={{
              title: 'Source',
              headerBackTitle: "Back",
            }}
          />
        </Stack>
  );
}
