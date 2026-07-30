import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Redirect, Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from 'expo-status-bar';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppErrorBoundary } from '@/components/app-error-boundary';
import WebStackHeader from '@/components/web-stack-header';

import { usePalette } from '@/hooks/use-palette';

import { PostProvider } from '../context/postContext';

import { AuthProvider, useAuth } from '@/context/authContext';

import { FeedPreferenceProvider } from '@/context/feedPreferenceContext';
import { ThemeModeProvider } from '@/context/themeContext';

import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';

import { useEffect, useMemo } from 'react';

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
            <PostProvider>
              <ThemedShell />
            </PostProvider>
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
  // const { session, loading } = useAuth();
  const { session, loading, needsOnboarding } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { c } = usePalette();

  useEffect(() => {
    rememberProductRoute(pathname);
  }, [pathname]);

  // Route notification taps once signed in. Permission and device-token
  // registration happen contextually from Settings, never right after login.
  useEffect(() => {
    if (!session) return;
    return attachNotificationRouter();
  }, [session]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (session === null && !pathname.startsWith('/auth')) {
    return <Redirect href="/auth/landingpage" />;
  }

  if (session && needsOnboarding && pathname !== '/onboarding') {
    return <Redirect href="/onboarding" />;
  }

  if (session && pathname.startsWith('/auth')) {
    return <Redirect href="/" />;
  }

  return (
        <Stack
          screenOptions={{
            headerTintColor: c.primary,
            contentStyle: {
              backgroundColor: Platform.OS === 'web' ? c.surface : c.background,
            },
            ...(Platform.OS === 'web'
              ? {
                  header: () => <WebStackHeader />,
                }
              : {}),
            // header title color comes from the navigation theme, so it
            // flips with light/dark automatically
            //
            // Custom back button: the native header back button can go
            // unresponsive in Expo Go on iOS, so render our own press
            // target that drives expo-router directly. Swipe-back still
            // works natively.
            headerLeft: ({ canGoBack }) =>
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
          }}
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
          <Stack.Screen name="admin-feedback" options={{ title: 'Beta Feedback', headerBackTitle: 'Back' }} />
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
            name="feedback"
            options={{ title: 'Beta Feedback', headerBackTitle: 'Back' }}
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
