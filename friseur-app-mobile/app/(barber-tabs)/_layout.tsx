import React from "react";
import { Tabs } from "expo-router";
import { Home, Clock3, User } from "lucide-react-native";

export default function BarberTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 74,
          paddingTop: 10,
          paddingBottom: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <Home color={color} size={focused ? 30 : 28} />
          ),
        }}
      />

      <Tabs.Screen
        name="pausen"
        options={{
          title: "Pausen",
          tabBarIcon: ({ color, focused }) => (
            <Clock3 color={color} size={focused ? 30 : 28} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <User color={color} size={focused ? 30 : 28} />
          ),
        }}
      />
    </Tabs>
  );
}