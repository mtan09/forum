import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from 'expo-status-bar';

import { IconSymbol } from '@/components/ui/icon-symbol';

import { usePalette } from '@/hooks/use-palette';

import { PostProvider } from '../context/postContext';

import { AuthProvider, useAuth } from '@/context/authContext';

import { ThemeModeProvider } from '@/context/themeContext';

import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useEffect } from 'react';

import { attachNotificationRouter, registerForPush } from '@/lib/notifications';
import { initSentry } from '@/lib/sentry';

initSentry();


// export const unstable_settings = {
//   anchor: '(tabs)',
// };

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <AuthProvider>
        <ThemedShell />
      </AuthProvider>
    </ThemeModeProvider>
  );
}

// Splitting this out lets useColorScheme see ThemeModeProvider, so the
// navigation chrome + status bar follow the in-app appearance setting.
function ThemedShell() {
  const { c, scheme: colorScheme } = usePalette();
  const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: c.tint,
      background: c.background,
      card: c.background,
      border: c.border,
      text: c.text,
    },
  };

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

  // Once signed in: register this device for push and route notification
  // taps to the content they reference. (No-ops inside Expo Go.)
  useEffect(() => {
    if (!session) return;
    registerForPush();
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
    <PostProvider>
        <Stack
          screenOptions={{
            headerTintColor: c.primary,
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
              presentation: 'formSheet',
              headerShown: false,
              sheetAllowedDetents: [0.9],
              sheetInitialDetentIndex: 0,
              sheetGrabberVisible: true,
              sheetCornerRadius: 24,
              sheetLargestUndimmedDetentIndex: 'none',
              contentStyle: { backgroundColor: c.surfaceRaised },
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
            name="source/[name]"
            options={{
              title: 'Source',
              headerBackTitle: "Back",
            }}
          />
        </Stack>
    </PostProvider>
  );
}
