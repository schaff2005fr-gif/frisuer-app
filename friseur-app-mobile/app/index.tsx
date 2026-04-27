import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";

export default function IndexPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login" as any);
      return;
    }

    if (user.role === "BARBER") {
  router.replace("/(barber-tabs)" as any);
  return;
}

    router.replace("/(tabs)" as any);
  }, [user, loading]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator />
    </View>
  );
}