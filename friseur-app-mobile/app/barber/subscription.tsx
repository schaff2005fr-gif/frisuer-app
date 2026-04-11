import React from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function BarberSubscriptionScreen() {
  const { signOut } = useAuth();

  async function handleBackToLogin() {
    await signOut();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f6f7" }}>
      <View
        style={{
          flex: 1,
          padding: 20,
          justifyContent: "center",
        }}
      >
        <View
          style={{
            borderWidth: 1,
            borderColor: "#e8e8eb",
            borderRadius: 24,
            backgroundColor: "#fff",
            padding: 20,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              lineHeight: 32,
              fontWeight: "900",
              color: "#111",
            }}
          >
            Abo erforderlich
          </Text>

          <Text
            style={{
              marginTop: 12,
              fontSize: 15,
              lineHeight: 22,
              color: "#666",
            }}
          >
            Für den Barber-Bereich brauchst du ein aktives Pro-Abo.
          </Text>

          <Text
            style={{
              marginTop: 8,
              fontSize: 15,
              lineHeight: 22,
              color: "#666",
            }}
          >
            Bitte schließe dein Abo ab oder warte, bis die Zahlung bestätigt wurde.
          </Text>

          <Pressable
            onPress={handleBackToLogin}
            style={{
              marginTop: 18,
              minHeight: 54,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#111",
              backgroundColor: "#111",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontWeight: "900",
                fontSize: 15,
              }}
            >
              Zurück zum Login
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}