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

export default function RegisterScreen() {
  const { signIn, user, loading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (user?.role === "CUSTOMER") {
      router.replace("/(tabs)");
    } else if (user?.role === "BARBER") {
      router.replace("/(barber-tabs)");
    }
  }, [user, loading]);

  async function handleRegister() {
    if (submitting) return;

    if (password.length < 8) {
      Alert.alert("Fehler", "Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    if (!acceptedPrivacy) {
      Alert.alert("Fehler", "Bitte bestätige die Datenschutzerklärung.");
      return;
    }

    if (!acceptedTerms) {
      Alert.alert("Fehler", "Bitte akzeptiere die Buchungs- und Nutzungsregeln.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await api.post("/auth/register", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });

      await signIn(res.data.token, res.data.user);
      router.replace("/(tabs)");
    } catch (err: any) {
      console.log("REGISTER ERROR FULL:", err);
      console.log("REGISTER ERROR MESSAGE:", err?.message);
      console.log("REGISTER ERROR RESPONSE:", err?.response?.data);
      console.log("REGISTER ERROR STATUS:", err?.response?.status);

      Alert.alert(
        "Fehler",
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Registrierung fehlgeschlagen"
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
            
            <Text style={styles.title}>Konto erstellen</Text>
            
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                placeholder="Max Mustermann"
                placeholderTextColor="#9a9a9a"
                value={name}
                onChangeText={setName}
                autoComplete="name"
                style={styles.input}
              />
            </View>

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
              <Text style={styles.label}>Telefon</Text>
              <TextInput
                placeholder="0151 23456789"
                placeholderTextColor="#9a9a9a"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Passwort</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  placeholder="Mindestens 8 Zeichen"
                  placeholderTextColor="#9a9a9a"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
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
              <Text style={styles.hint}>Mindestens 8 Zeichen.</Text>
            </View>

            <View style={styles.checkboxCard}>
              <Pressable
                onPress={() => setAcceptedPrivacy((v) => !v)}
                style={styles.checkboxRow}
              >
                <View style={[styles.checkbox, acceptedPrivacy ? styles.checkboxActive : null]}>
                  {acceptedPrivacy ? <Text style={styles.checkboxTick}>✓</Text> : null}
                </View>
                <Text style={styles.checkboxText}>
                  Ich habe die{" "}
                  <Text
                    style={styles.inlineLink}
                    onPress={() => router.push("/datenschutz")}
                  >
                    Datenschutzerklärung
                  </Text>{" "}
                  zur Kenntnis genommen.
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setAcceptedTerms((v) => !v)}
                style={styles.checkboxRow}
              >
                <View style={[styles.checkbox, acceptedTerms ? styles.checkboxActive : null]}>
                  {acceptedTerms ? <Text style={styles.checkboxTick}>✓</Text> : null}
                </View>
                <Text style={styles.checkboxText}>
                  Ich akzeptiere die{" "}
                  <Text
                    style={styles.inlineLink}
                    onPress={() => router.push("/buchungsregeln")}
                  >
                    Buchungs- und Nutzungsregeln
                  </Text>
                  .
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleRegister}
              disabled={submitting || !acceptedPrivacy || !acceptedTerms}
              style={[
                styles.primaryButton,
                submitting || !acceptedPrivacy || !acceptedTerms ? styles.buttonDisabled : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? "Registriere..." : "Registrieren"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footerCard}>
            <Text style={styles.footerText}>Schon ein Konto?</Text>

            <Pressable
              onPress={() => router.push("/")}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Zum Login</Text>
            </Pressable>
          </View>

          <View style={styles.legalFooter}>
            <Text style={styles.legalFooterText}>
              <Text style={styles.legalLink} onPress={() => router.push("/impressum")}>
                Impressum
              </Text>
              {" · "}
              <Text style={styles.legalLink} onPress={() => router.push("/datenschutz")}>
                Datenschutz
              </Text>
              {" · "}
              <Text style={styles.legalLink} onPress={() => router.push("/buchungsregeln")}>
                Buchungsregeln
              </Text>
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

  hint: {
    fontSize: 11,
    color: "#666",
    marginTop: -2,
  } as const,

  checkboxCard: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 16,
    backgroundColor: "#fafafa",
    padding: 14,
    gap: 12,
  } as const,

  checkboxRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
  } as const,

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#d5d5d8",
    backgroundColor: "#fff",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 1,
  } as const,

  checkboxActive: {
    backgroundColor: "#111",
    borderColor: "#111",
  } as const,

  checkboxTick: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900" as const,
  } as const,

  checkboxText: {
    flex: 1,
    color: "#222",
    fontSize: 13,
    lineHeight: 19,
  } as const,

  inlineLink: {
    color: "#111",
    fontWeight: "900" as const,
    textDecorationLine: "underline" as const,
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