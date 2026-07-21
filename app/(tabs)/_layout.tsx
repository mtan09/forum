import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from "@/components/ui/icon-symbol";
import { usePalette } from "@/hooks/use-palette";
import { emitTabRefresh } from "@/lib/tabRefresh";

export default function TabLayout() {
  const { c } = usePalette();

  // Pressing the tab you're already on tells that screen to scroll to top
  // and refresh (screens subscribe via onTabRefresh).
  const reTapListeners = (tab: string) => ({ navigation }: { navigation: any }) => ({
    tabPress: () => {
      if (navigation.isFocused()) emitTabRefresh(tab);
    },
  });

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.tabIconDefault,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: c.background,
          borderTopColor: c.border,
          borderTopWidth: 1,
          paddingTop: 10,
          paddingBottom: 5,
        },
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen 
        name="index"
        listeners={reTapListeners('index')}
        options={{ 
          tabBarAccessibilityLabel: 'Home feed',
          tabBarIcon: ({ color, focused }) => <IconSymbol size={30} color={color} name={focused ? "house.fill" : "house"} />,
        }} 
      />
      <Tabs.Screen
        name="debate"
        listeners={reTapListeners('debate')}
        options={{
          tabBarAccessibilityLabel: 'The Floor, daily debates',
          tabBarIcon: ({ color, focused }) => <IconSymbol size={30} color={color} name={focused ? "bubble.left.and.bubble.right.fill" : "bubble.left.and.bubble.right"} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        listeners={reTapListeners('ai')}
        options={{
          tabBarAccessibilityLabel: 'forumAI assistant',
          tabBarIcon: ({ color, focused }) => <IconSymbol size={30} color={color} name={focused ? "brain.fill" : "brain"} />,
        }}
      />
      <Tabs.Screen
        name="search"
        listeners={reTapListeners('search')}
        options={{
          tabBarAccessibilityLabel: 'Search',
          tabBarIcon: ({ color, focused }) => <IconSymbol size={30} color={color} name="magnifyingglass" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        listeners={reTapListeners('profile')}
        options={{
          tabBarAccessibilityLabel: 'Your profile',
          tabBarIcon: ({ color, focused }) => <IconSymbol size={30} color={color} name={focused ? "person.fill" : "person"} />,
        }}
      />
    </Tabs>
  );
}
