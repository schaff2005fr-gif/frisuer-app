import React, { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Home, CalendarDays, Bell, User } from "lucide-react-native";

import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function CustomerTabsLayout() {
  const { token } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    loadUnread();
  }, [token]);

  async function loadUnread() {
    try {
      if (!token) {
        setUnread(0);
        return;
      }

      const res = await api.get("/notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUnread(Number(res.data?.count ?? 0));
    } catch {
      setUnread(0);
    }
  }

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
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Home color={color} size={focused ? 30 : 28} />
          ),
        }}
      />

      <Tabs.Screen
        name="my-bookings"
        options={{
          title: "Meine Termine",
          tabBarIcon: ({ color, size, focused }) => (
            <CalendarDays color={color} size={focused ? 30 : 28} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarBadge: unread > 0 ? (unread > 99 ? "99+" : unread) : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <Bell color={color} size={focused ? 30 : 28} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size, focused }) => (
            <User color={color} size={focused ? 30 : 28} />
          ),
        }}
      />
    </Tabs>
  );
}