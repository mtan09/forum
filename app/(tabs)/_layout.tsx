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
        name="createpost"
        options={{
          tabBarIcon: ({ color, focused }) => <IconSymbol size={30} color={color} name={focused ? "plus.app.fill" : "plus.app"} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          tabBarIcon: ({ color, focused }) => <IconSymbol size={30} color={color} name={focused ? "brain.fill" : "brain"} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, focused }) => <IconSymbol size={30} color={color} name={focused ? "gearshape.fill" : "gearshape"} />,
          headerShown: true,
          title: 'Settings',
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: 20,
          }
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
