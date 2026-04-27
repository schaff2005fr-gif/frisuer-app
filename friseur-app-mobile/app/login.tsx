import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Image } from "react-native";
type Role = "CUSTOMER" | "BARBER";

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    if (submitting) return;

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert("Fehler", "Bitte E-Mail und Passwort eingeben.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await api.post("/auth/login", {
        email: cleanEmail,
        password,
      });

      const token = res.data?.token;
      const user = res.data?.user;

      if (!token || !user) {
        throw new Error("Login fehlgeschlagen.");
      }

      await signIn(token, {
        id: user.id,
        email: user.email,
        role: user.role as Role,
      });

      if (user.role === "BARBER") {
  router.replace("/(barber-tabs)" as any);
  return;
}

      router.replace("/(tabs)" as any);
    } catch (e: any) {
      Alert.alert("Fehler", e?.response?.data?.error || e?.message || "Login fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f6f7" }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32 }}>
        <View
  style={{
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 24,
  }}
>
  <View
    style={{
      width: 40,
      height: 40,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: "#111",
      marginRight: 10,
    }}
  >
    <Image
      source={require("../assets/images/salora-logo.png")}
      resizeMode="cover"
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  </View>

  <Text
    style={{
      fontSize: 22,
      fontWeight: "900",
      color: "#111",
      letterSpacing: -0.5,
    }}
  >
    Salora
  </Text>
</View>
        <View style={{ marginTop: 24, marginBottom: 22 }}>
          <Text style={{ fontSize: 34, lineHeight: 38, fontWeight: "900", color: "#111" }}>
            Willkommen zurück
          </Text>

          <Text style={{ marginTop: 10, fontSize: 16, lineHeight: 24, color: "#666" }}>
            Logge dich ein und verwalte deine Termine.
          </Text>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#e8e8eb",
            borderRadius: 24,
            backgroundColor: "#fff",
            padding: 18,
          }}
        >
          <FieldLabel text="E-Mail" />
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="max.mustermann@email.de"
            style={inputStyle}
          />

          <View style={{ height: 14 }} />

          <FieldLabel text="Passwort" />
          <View style={{ position: "relative" }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              style={{ ...inputStyle, paddingRight: 110 }}
            />

            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              style={{
                position: "absolute",
                right: 8,
                top: 8,
                height: 38,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#ddd",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#fff",
              }}
            >
              <Text style={{ color: "#111", fontSize: 12, fontWeight: "900" }}>
                {showPassword ? "Verbergen" : "Anzeigen"}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={submitting}
            style={{
              marginTop: 18,
              minHeight: 54,
              borderRadius: 16,
              backgroundColor: "#111",
              alignItems: "center",
              justifyContent: "center",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>
                Einloggen
              </Text>
            )}
          </Pressable>
        </View>

        <View
          style={{
            marginTop: 16,
            borderWidth: 1,
            borderColor: "#e8e8eb",
            borderRadius: 24,
            backgroundColor: "#fff",
            padding: 18,
            gap: 10,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: "#666",
              fontSize: 13,
              fontWeight: "800",
              marginBottom: 2,
            }}
          >
            Noch kein Konto?
          </Text>

          <Pressable
            onPress={() => router.push("/register" as any)}
            style={{
              minHeight: 54,
              borderRadius: 16,
              backgroundColor: "#111",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>
              Als Kunde registrieren
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/register-barber" as any)}
            style={{
              minHeight: 52,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#ddd",
              backgroundColor: "#fff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#111", fontWeight: "900", fontSize: 15 }}>
              Als Friseur registrieren
            </Text>
          </Pressable>
        </View>
        <View style={{ marginTop: 18, paddingHorizontal: 8 }}>
  <Text
    style={{
      textAlign: "center",
      color: "#7a7a7a",
      fontSize: 12,
      lineHeight: 18,
    }}
  >
    Mit der Nutzung der App gelten unsere{" "}
    <Text onPress={() => router.push("/buchungsregeln" as any)} style={linkStyle}>
      Buchungsregeln
    </Text>
    ,{" "}
    <Text onPress={() => router.push("/datenschutz" as any)} style={linkStyle}>
      Datenschutzhinweise
    </Text>{" "}
    und das{" "}
    <Text onPress={() => router.push("/impressum" as any)} style={linkStyle}>
      Impressum
    </Text>
    .
  </Text>
</View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <Text style={{ marginBottom: 8, fontSize: 13, color: "#555", fontWeight: "800" }}>
      {text}
    </Text>
  );
}

const inputStyle = {
  minHeight: 54,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#dedede",
  backgroundColor: "#fff",
  paddingHorizontal: 16,
  fontSize: 16,
  color: "#111",
};

const linkStyle = {
  color: "#111",
  fontWeight: "900" as const,
  textDecorationLine: "underline" as const,
  textDecorationColor: "#111",
};