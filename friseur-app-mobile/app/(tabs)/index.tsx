import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

type Barber = {
  id: number;
  name: string;
  slug: string;
  city?: string | null;
  street?: string | null;
  postalCode?: string | null;
  imageUrl?: string | null;
  nextDate?: string | null;
};

function cleanUrl(u?: string | null) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return "https://" + s;
}

function initials(name: string) {
  const s = String(name || "").trim();
  if (!s) return "S";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "S";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

function formatDateDE(dateStr: string) {
  const d = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeZone: "Europe/Berlin",
  }).format(d);
}

function firstName(full: string) {
  const s = String(full || "").trim();
  if (!s) return "";
  return s.split(/\s+/).filter(Boolean)[0] ?? "";
}

export default function CustomerHomeScreen() {
  const { user, token, loading } = useAuth();

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loadingBarbers, setLoadingBarbers] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (loading) return;

    if (!user || !token) {
      router.replace("/login");
      return;
    }

    if (user.role !== "CUSTOMER") {
      router.replace("/barber");
      return;
    }

    loadBarbers();
  }, [user, token, loading]);

  async function loadBarbers(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoadingBarbers(true);
      }

      setError("");

      const res = await api.get("/barbers");
      setBarbers(Array.isArray(res.data?.barbers) ? res.data.barbers : []);
    } catch (err: any) {
      console.log("LOAD BARBERS ERROR:", err?.message);
      console.log("LOAD BARBERS RESPONSE:", err?.response?.data);
      setError("Fehler beim Laden der Friseure");
    } finally {
      setLoadingBarbers(false);
      setRefreshing(false);
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return barbers;

    return barbers.filter((b) => {
      const name = (b.name ?? "").toLowerCase();
      const slug = (b.slug ?? "").toLowerCase();
      const city = (b.city ?? "").toLowerCase();
      return name.includes(s) || slug.includes(s) || city.includes(s);
    });
  }, [barbers, q]);

  const fn = firstName((user as any)?.customer?.name ?? "");
  const titleText = `Hallo ${fn || "👋"}`;
  const subText = "Wähle einen Friseur und buche deinen nächsten Termin.";

  function renderBarberCard(b: Barber) {
    const addr =
      [b.street, [b.postalCode, b.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null;

    const nextLabel = b.nextDate ? `Nächster Termin: ${formatDateDE(b.nextDate)}` : "Nächster Termin: —";

    return (
      <View
        key={b.id}
        style={{
          borderWidth: 1,
          borderColor: "#e9e9e9",
          borderRadius: 24,
          padding: 16,
          backgroundColor: "#fff",
          marginBottom: 14,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 18,
              backgroundColor: "#111",
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {b.imageUrl ? (
              <Image
                source={{ uri: cleanUrl(b.imageUrl) }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}>
                {initials(b.name)}
              </Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "900",
                color: "#111",
              }}
            >
              {b.name}
            </Text>

            <Text
              style={{
                marginTop: 4,
                color: "#666",
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {addr ? addr : `/b/${b.slug}`}
            </Text>

            <View
              style={{
                marginTop: 10,
                alignSelf: "flex-start",
                borderWidth: 1,
                borderColor: "#111",
                backgroundColor: "#111",
                borderRadius: 999,
                paddingVertical: 8,
                paddingHorizontal: 12,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: "900",
                }}
              >
                {nextLabel}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: 10,
            marginTop: 14,
          }}
        >
          <Pressable
            onPress={() => router.push(`/barber/${b.slug}` as any)}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#ddd",
              backgroundColor: "#fff",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: "#111", fontWeight: "900" }}>Profil ansehen</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push(`/barber/${b.slug}/book` as any)}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#111",
              backgroundColor: "#111",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>Termin buchen</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading || !user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => renderBarberCard(item)}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 32,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadBarbers(true)} />
        }
        ListHeaderComponent={
          <View>
            <View style={{ marginBottom: 18 }}>
              <View
                style={{
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 34,
                      lineHeight: 36,
                      fontWeight: "900",
                      color: "#111",
                    }}
                  >
                    {titleText}
                  </Text>

                  <Text
                    style={{
                      color: "#666",
                      marginTop: 10,
                      fontSize: 16,
                      lineHeight: 23,
                    }}
                  >
                    {subText}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  marginTop: 16,
                  borderWidth: 1,
                  borderColor: "#e9e9e9",
                  borderRadius: 24,
                  padding: 16,
                  backgroundColor: "#fff",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontWeight: "900",
                        fontSize: 18,
                        color: "#111",
                      }}
                    >
                      Friseur suchen
                    </Text>

                    <Text
                      style={{
                        color: "#666",
                        fontSize: 13,
                        marginTop: 4,
                      }}
                    >
                      Nach Name, Stadt oder Profil suchen
                    </Text>
                  </View>

                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: "#e4e4e4",
                      borderRadius: 999,
                      backgroundColor: "#fafafa",
                      paddingVertical: 7,
                      paddingHorizontal: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: "#666",
                        fontSize: 12,
                        fontWeight: "900",
                      }}
                    >
                      {loadingBarbers ? "…" : `${filtered.length} Friseur(e)`}
                    </Text>
                  </View>
                </View>

                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="z. B. Ali, Essen, barber-essen..."
                  style={{
                    width: "100%",
                    height: 52,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#dedede",
                    backgroundColor: "#fff",
                    paddingHorizontal: 16,
                    fontSize: 16,
                    color: "#111",
                  }}
                />
              </View>
            </View>

            {loadingBarbers ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator />
              </View>
            ) : null}

            {error ? (
              <View
                style={{
                  marginBottom: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderWidth: 1,
                  borderColor: "#f1c7c7",
                  backgroundColor: "#fff5f5",
                  borderRadius: 16,
                }}
              >
                <Text style={{ color: "#8a1c1c", fontWeight: "800" }}>{error}</Text>
              </View>
            ) : null}

            {!loadingBarbers && filtered.length === 0 ? (
              <View
                style={{
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: "#e3e3e3",
                  borderRadius: 20,
                  padding: 16,
                  backgroundColor: "#fcfcfc",
                  marginBottom: 14,
                }}
              >
                <Text style={{ color: "#777" }}>Keine Friseure gefunden.</Text>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={
          <View
            style={{
              marginTop: 2,
              borderWidth: 1,
              borderColor: "#ececec",
              backgroundColor: "#fafafa",
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 16,
            }}
          >
            <Text
              style={{
                color: "#666",
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              Hinweis: Für eine Buchung ist ein Kunden-Login erforderlich.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}