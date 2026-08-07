import '../global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from 'expo-status-bar';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppErrorBoundary } from '@/components/app-error-boundary';
import WebShell from '@/components/web-shell';
import WebStackHeader from '@/components/web-stack-header';
import { AUTH_CONTENT_MAX_WIDTH } from '@/constants/layout';

import { usePalette } from '@/hooks/use-palette';

import { PostProvider } from '../context/postContext';

import { AuthProvider, useAuth } from '@/context/authContext';
import { AIConsentProvider } from '@/context/aiConsentContext';
import { InteractionProvider } from '@/context/interactionContext';

import { FeedPreferenceProvider } from '@/context/feedPreferenceContext';
import { ThemeModeProvider } from '@/context/themeContext';

import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { attachNotificationRouter } from '@/lib/notifications';
import { initSentry } from '@/lib/sentry';
import { rememberProductRoute } from '@/lib/route-context';
import { tapLight } from '@/lib/haptics';

initSentry();


// export const unstable_settings = {
//   anchor: '(tabs)',
// };

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppErrorBoundary>
        <ThemeModeProvider>
          <FeedPreferenceProvider>
            <AuthProvider>
              <AIConsentProvider>
                <InteractionProvider>
                  <PostProvider>
                    <ThemedShell />
                  </PostProvider>
                </InteractionProvider>
              </AIConsentProvider>
            </AuthProvider>
          </FeedPreferenceProvider>
        </ThemeModeProvider>
      </AppErrorBoundary>
    </GestureHandlerRootView>
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
          onPress={() => { tapLight(); router.back(); }}
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
        backgroundColor: c.background,
      },
      ...(Platform.OS === 'web'
        ? {
            // Inside the shell the header sits at the top of the content
            // column, so it names the screen instead of repeating the brand.
            header: ({ options }: { options: { title?: string } }) => (
              <WebStackHeader title={options?.title} />
            ),
          }
        : {}),
      headerLeft,
    }),
    [c.background, c.primary, headerLeft]
  );

  // Auth screens run a much narrower column than post/article detail, so the
  // header has to be told about it — otherwise Back and the brand sit at the
  // edges of an 840px band with a 500px form floating between them.
  const authScreenOptions = useMemo(
    () =>
      Platform.OS === 'web'
        ? {
            header: () => (
              <WebStackHeader maxWidth={AUTH_CONTENT_MAX_WIDTH} gutter={40} />
            ),
          }
        : {},
    []
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background }}>
        <ActivityIndicator size="large" color={c.muted} />
      </View>
    );
  }

  const stack = (
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
              ...authScreenOptions,
            }}
          />
          <Stack.Screen
            name="auth/createaccount"
            options={{
              title: 'Sign Up',
              headerBackTitle: "Back",
              ...authScreenOptions,
            }}
          />
          <Stack.Screen
            name="auth/forgotpassword"
            options={{
              title: 'Reset Password',
              headerBackTitle: "Back",
              ...authScreenOptions,
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
              sheetAllowedDetents: Platform.OS === 'web' ? undefined : [0.75],
              sheetInitialDetentIndex: Platform.OS === 'web' ? undefined : 0,
              sheetGrabberVisible: false,
              sheetCornerRadius: 24,
              sheetLargestUndimmedDetentIndex: 'none',
              // Transparent on web: the composer's own scrim does the dimming,
              // and an opaque screen background here would hide the page the
              // modal is supposed to be floating over.
              contentStyle: {
                backgroundColor: Platform.OS === 'web' ? 'transparent' : c.background,
              },
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

  // Auth and onboarding are full-bleed by design. The opaque modals opt out
  // too — they cover the viewport anyway, so the shell behind them is wasted
  // work. The composer stays in, so its scrim dims the page you came from.
  const chromeless =
    pathname.startsWith('/auth') ||
    pathname === '/onboarding' ||
    pathname === '/editprofile' ||
    pathname === '/changepassword';

  if (Platform.OS === 'web' && session && !chromeless) {
    return <WebShell>{stack}</WebShell>;
  }

  return stack;
}
