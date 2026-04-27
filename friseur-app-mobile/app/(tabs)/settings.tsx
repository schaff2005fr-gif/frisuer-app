import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";

import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

type Me = {
  id: number;
  email: string;
  role: "CUSTOMER" | "BARBER";
  customer: { id: number; name: string; phone: string | null } | null;
  barber?: any;
};

export default function SettingsScreen() {
  const { token, user, loading: authLoading, signIn, signOut } = useAuth();

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

 useEffect(() => {
  if (authLoading) return;

  if (!user) {
    router.replace("/login" as any);
    return;
  }

  if (!token) return;

  if (user.role !== "CUSTOMER") {
    router.replace("/(barber-tabs)" as any);
    return;
  }

  loadMe();
}, [token, user, authLoading]);

  async function loadMe() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await api.get("/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const m = res.data as Me;

      if (m.role !== "CUSTOMER") {
        router.replace("/login");
        return;
      }

      setMe(m);
      setName(m.customer?.name ?? "");
      setPhone(m.customer?.phone ?? "");
    } catch (e: any) {
      console.log("LOAD ME ERROR:", e?.message);
      console.log("LOAD ME RESPONSE:", e?.response?.data);
      setError(e?.response?.data?.error || "Fehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await api.patch(
        "/me",
        {
          name: name.trim(),
          phone: phone.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const updatedMe: Me = (res.data?.me ?? res.data) as Me;

      setMe(updatedMe);
      setMessage("✅ Profil gespeichert");

      await signIn(token, {
        id: updatedMe.id,
        email: updatedMe.email,
        role: updatedMe.role,
        customer: updatedMe.customer,
        barber: (updatedMe as any).barber ?? null,
        barberId: (updatedMe as any).barberId ?? null,
      } as any);
    } catch (e: any) {
      console.log("SAVE PROFILE ERROR:", e?.message);
      console.log("SAVE PROFILE RESPONSE:", e?.response?.data);
      setError(e?.response?.data?.error || "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      "Account löschen",
      "Willst du deinen Account wirklich komplett löschen?\n\nAlle Termine und Daten werden endgültig entfernt.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: deleteAccount,
        },
      ]
    );
  }

  async function deleteAccount() {
    try {
      setDeleting(true);
      setError("");
      setMessage("");

      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await api.delete("/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.data?.ok) {
        throw new Error("Account konnte nicht gelöscht werden.");
      }

      await signOut();
      router.replace("/login");
    } catch (e: any) {
      console.log("DELETE ACCOUNT ERROR:", e?.message);
      console.log("DELETE ACCOUNT RESPONSE:", e?.response?.data);
      setError(e?.response?.data?.error || "Fehler beim Löschen.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleLogout() {
    await signOut();
    router.replace("/login");
  }

  if (loading || authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 30, fontWeight: "900", color: "#111" }}>Profil</Text>
          <Text style={{ marginTop: 6, color: "#666", lineHeight: 20 }}>
            Name & Telefonnummer ändern
          </Text>
        </View>

        {message ? (
          <View
            style={{
              marginBottom: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: "#b7ebc6",
              backgroundColor: "#f0fff4",
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#1f7a37", fontWeight: "800" }}>{message}</Text>
          </View>
        ) : null}

        {error ? (
          <View
            style={{
              marginBottom: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: "#f2c6c6",
              backgroundColor: "#fff5f5",
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#8a1c1c", fontWeight: "800" }}>{error}</Text>
          </View>
        ) : null}

        <View
          style={{
            borderWidth: 1,
            borderColor: "#eee",
            borderRadius: 14,
            padding: 14,
            backgroundColor: "#fff",
            gap: 12,
          }}
        >
          <View>
            <Text style={{ fontSize: 12, color: "#666", fontWeight: "900" }}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="z.B. Max Mustermann"
              style={{
                marginTop: 6,
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 12,
                width: "100%",
                fontSize: 16,
                color: "#111",
              }}
            />
          </View>

          <View>
            <Text style={{ fontSize: 12, color: "#666", fontWeight: "900" }}>Telefon</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="z.B. 0176..."
              keyboardType="phone-pad"
              style={{
                marginTop: 6,
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 12,
                width: "100%",
                fontSize: 16,
                color: "#111",
              }}
            />
          </View>

          <Pressable
            onPress={save}
            disabled={saving || !name.trim()}
            style={{
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#111",
              backgroundColor: "#111",
              alignItems: "center",
              opacity: saving || !name.trim() ? 0.7 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>
              {saving ? "Speichere..." : "Speichern"}
            </Text>
          </Pressable>

          <Text style={{ color: "#666", fontSize: 12, lineHeight: 18 }}>
            Eingeloggt als: <Text style={{ fontWeight: "900", color: "#111" }}>{me?.email}</Text>
          </Text>

          <Pressable
            onPress={handleLogout}
            style={{
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#ddd",
              backgroundColor: "#fff",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#111", fontWeight: "900" }}>Ausloggen</Text>
          </Pressable>

          <View
            style={{
              marginTop: 8,
              borderTopWidth: 1,
              borderTopColor: "#eee",
              paddingTop: 16,
            }}
          >
            <Text style={{ fontWeight: "900", color: "#111", marginBottom: 10 }}>Rechtliches</Text>

            <View style={{ gap: 10 }}>
  <Pressable
    onPress={() => router.push("/impressum")}
    style={{
      padding: 12,
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 12,
      backgroundColor: "#fff",
    }}
  >
    <Text style={{ color: "#111", fontWeight: "900" }}>Impressum</Text>
  </Pressable>

  <Pressable
    onPress={() => router.push("/datenschutz")}
    style={{
      padding: 12,
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 12,
      backgroundColor: "#fff",
    }}
  >
    <Text style={{ color: "#111", fontWeight: "900" }}>Datenschutz</Text>
  </Pressable>
</View>
          </View>

          <View
            style={{
              marginTop: 8,
              borderTopWidth: 1,
              borderTopColor: "#eee",
              paddingTop: 16,
            }}
          >
            <Text style={{ fontWeight: "900", color: "#8a1c1c" }}>Gefährliche Aktion</Text>

            <Text style={{ color: "#666", fontSize: 12, lineHeight: 18, marginTop: 6 }}>
              Dein Account wird endgültig gelöscht. Alle Termine und Daten gehen verloren.
            </Text>

            <Pressable
              onPress={confirmDeleteAccount}
              disabled={deleting}
              style={{
                marginTop: 10,
                width: "100%",
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#8a1c1c",
                backgroundColor: "#fff5f5",
                alignItems: "center",
                opacity: deleting ? 0.7 : 1,
              }}
            >
              <Text style={{ color: "#8a1c1c", fontWeight: "900" }}>
                {deleting ? "Lösche Account..." : "Account endgültig löschen"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}