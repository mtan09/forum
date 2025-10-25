import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from "expo-router";

import { useColorScheme } from '@/hooks/use-color-scheme';

import { PostProvider } from '../context/postContext';

import { TopicProvider } from '@/context/topicContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
            <Stack.Screen 
              name="(tabs)" 
              options={{ headerShown: false }} 
            />
            {/* <Stack.Screen 
              name="modal" 
              options={{ 
                presentation: "modal", 
                title: 'Modal'
              }}
            /> */}
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
          </Stack>
        </TopicProvider>
      </PostProvider>
    </ThemeProvider>
  );
}
