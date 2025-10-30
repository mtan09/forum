import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack, usePathname } from "expo-router";

import { useColorScheme } from '@/hooks/use-color-scheme';

import { PostProvider } from '../context/postContext';

import { TopicProvider } from '@/context/topicContext';

import { AuthProvider, useAuth } from '@/context/authContext';

import { ActivityIndicator, View } from 'react-native';


// export const unstable_settings = {
//   anchor: '(tabs)',
// };

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AppNavigator />
      </ThemeProvider>
    </AuthProvider>
  );
}

function AppNavigator() {
  // const { session, loading } = useAuth();
  const { session, loading } = useAuth();
  const pathname = usePathname();

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

  if (session && pathname.startsWith('/auth')) {
    return <Redirect href="/" />;
  }

  return (
    <PostProvider>
      <TopicProvider>
        <Stack
          screenOptions={{
            headerTintColor: "#7049E0",
            headerTitleStyle: {
              color: 'black',
            }
          }}
        >
          {session === null && (
            <Stack.Screen
              name="auth/landingpage"
              options={{ headerShown: false }}
            />
          )}
          {session === null && (
            <Stack.Screen
              name="auth/login"
              options={{ 
                title: 'Login',
                headerBackTitle: "Back",
              }}
            />
          )}
          {session === null && (
            <Stack.Screen
              name="auth/createaccount"
              options={{ 
                title: 'Sign Up',
                headerBackTitle: "Back",
              }}
            />
          )}

          <Stack.Screen 
            name="(tabs)" 
            options={{ headerShown: false }} 
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
        </Stack>
      </TopicProvider>
    </PostProvider>
  );
}
