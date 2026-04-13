import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import MobileBrand from "../components/MobileBrand";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { signIn, user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (user?.role === "CUSTOMER") {
      router.replace("/(tabs)");
    } else if (user?.role === "BARBER") {
      router.replace("/(barber-tabs)");
    }
  }, [user, loading]);

  async function handleLogin() {
    if (submitting) return;

    try {
      setSubmitting(true);

      const res = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      await signIn(res.data.token, res.data.user);

      if (res.data.user.role === "CUSTOMER") {
        router.replace("/(tabs)");
      } else {
        router.replace("/(barber-tabs)");
      }
    } catch (err: any) {
      console.log("LOGIN ERROR FULL:", err);
      console.log("LOGIN ERROR MESSAGE:", err?.message);
      console.log("LOGIN ERROR RESPONSE:", err?.response?.data);
      console.log("LOGIN ERROR STATUS:", err?.response?.status);

      Alert.alert(
        "Fehler",
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Login fehlgeschlagen"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        ><MobileBrand />
          <View style={styles.hero}>
            
            <Text style={styles.title}>Willkommen zurück</Text>
            
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>E-Mail</Text>
              <TextInput
                placeholder="max.mustermann@email.de"
                placeholderTextColor="#9a9a9a"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Passwort</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#9a9a9a"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  style={[styles.input, { paddingRight: 110 }]}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.passwordButton}
                >
                  <Text style={styles.passwordButtonText}>
                    {showPassword ? "Verbergen" : "Anzeigen"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={submitting}
              style={[styles.primaryButton, submitting ? styles.buttonDisabled : null]}
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? "Lädt..." : "Einloggen"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footerCard}>
            <Text style={styles.footerText}>Noch kein Konto?</Text>

            <Pressable
              onPress={() => router.push("/register")}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Als Kunde registrieren</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/register-barber")}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Als Friseur registrieren</Text>
            </Pressable>
          </View>

          <View style={styles.legalFooter}>
            <Text style={styles.legalFooterText}>
              Mit der Nutzung der App gelten unsere{" "}
              <Text style={styles.legalLink} onPress={() => router.push("/buchungsregeln")}>
                Buchungsregeln
              </Text>
              ,{" "}
              <Text style={styles.legalLink} onPress={() => router.push("/datenschutz")}>
                Datenschutzhinweise
              </Text>{" "}
              und das{" "}
              <Text style={styles.legalLink} onPress={() => router.push("/impressum")}>
                Impressum
              </Text>
              .
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  page: {
    flex: 1,
    backgroundColor: "#f6f6f7",
  } as const,

  scroll: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
   
  } as const,

  hero: {
    marginBottom: 16,
  } as const,

  badge: {
    alignSelf: "flex-start" as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ececec",
    backgroundColor: "#fafafa",
    color: "#666",
    fontSize: 12,
    fontWeight: "900" as const,
    overflow: "hidden" as const,
  } as const,

  title: {
    marginTop: 14,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: "900" as const,
    color: "#111",
  } as const,

  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#666",
  } as const,

  card: {
    borderWidth: 1,
    borderColor: "#e8e8eb",
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 18,
    gap: 14,
  } as const,

  footerCard: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e8e8eb",
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 18,
    gap: 10,
  } as const,

  footerText: {
    textAlign: "center" as const,
    color: "#666",
    fontSize: 13,
    fontWeight: "800" as const,
    marginBottom: 2,
  } as const,

  field: {
    gap: 8,
  } as const,

  label: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: "#555",
  } as const,

  input: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dedede",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111",
  } as const,

  passwordWrap: {
    position: "relative" as const,
    justifyContent: "center" as const,
  } as const,

  passwordButton: {
    position: "absolute" as const,
    right: 8,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  } as const,

  passwordButtonText: {
    color: "#111",
    fontSize: 12,
    fontWeight: "900" as const,
  } as const,

  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#111",
    backgroundColor: "#111",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 14,
  } as const,

  primaryButtonText: {
    color: "#fff",
    textAlign: "center" as const,
    fontWeight: "900" as const,
    fontSize: 15,
  } as const,

  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 14,
  } as const,

  secondaryButtonText: {
    color: "#111",
    textAlign: "center" as const,
    fontWeight: "900" as const,
    fontSize: 15,
  } as const,

  legalFooter: {
    marginTop: 18,
    paddingHorizontal: 8,
  } as const,

  legalFooterText: {
    textAlign: "center" as const,
    color: "#7a7a7a",
    fontSize: 12,
    lineHeight: 18,
  } as const,

  legalLink: {
    color: "#111",
    fontWeight: "800" as const,
    textDecorationLine: "underline" as const,
  } as const,

  buttonDisabled: {
    opacity: 0.7,
  } as const,
};