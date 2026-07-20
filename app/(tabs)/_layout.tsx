import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          paddingTop: 10,
          paddingBottom: 5,
        },
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          tabBarIcon: ({ color, focused }) => <IconSymbol size={30} color={color} name={focused ? "house.fill" : "house"} />,
        }} 
      />
      <Tabs.Screen
        name="debate"
        options={{
          tabBarIcon: ({ color, focused }) => <IconSymbol size={30} color={color} name={focused ? "bubble.left.and.bubble.right.fill" : "bubble.left.and.bubble.right"} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          tabBarIcon: ({ color, focused }) => <IconSymbol size={30} color={color} name={focused ? "brain.fill" : "brain"} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ color, focused }) => <IconSymbol size={30} color={color} name="magnifyingglass" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => <IconSymbol size={30} color={color} name={focused ? "person.fill" : "person"} />,
        }}
      />
    </Tabs>
  );
}
